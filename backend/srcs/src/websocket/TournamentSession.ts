//참가자 관리, 모든 참가자에게 브로드캐스트
import WebSocket from 'ws';
import { Buffer } from 'buffer';
import { FastifyInstance } from 'fastify';
import { WSTournamentStartMessage, WSTournamentBracketMessage, TournamentBracket, BracketUpdateDto } from '../schemas/tournament-websocket';
// 수정: TournamentMatchInfo import
import { TournamentMatchInfo } from '../plugins/app/tournament/tournaments-repository';
import { WSMatchStartingMessage } from '../schemas/game-websocket';
import { GameManager } from '../game/GameManager';
import { GameStateDto, GameEventDto, PlayerResponseDto, PlayerInputDto } from '../schemas/games';
import { MatchStartingDto } from '../schemas/tournament-websocket';
import { makeBracketFromMatches } from '../plugins/app/utils/file-manager';

type PlayerId = number; // 실제 프로젝트에 맞는 타입으로 변경

type WSGameInTournamentStateMessage = { type: 'game_state'; data: GameStateDto };
type WSGameInTournamentEventMessage = { type: 'game_event'; data: GameEventDto };

// PlayerResult 타입 정의
interface PlayerResult {
  playerId: number;
  score: number;
  // 필요하다면 더 추가…
}

export class TournamentSession {
  private socket: WebSocket | null = null; // 단일 연결만 관리
  public status: 'waiting' | 'in_progress' | 'finished' = 'waiting';
  // 수정: 대진표를 세션 상태로 저장
  private matches: TournamentMatchInfo[] = [];
  private gameManager: GameManager = GameManager.getInstance();
  private currentGameSessionId: string | null = null;
  
  // 플레이어 연결 해제 처리 중복 방지
  private isDisconnecting: boolean = false;

  // [추가] 매치별로 결과를 임시 저장할 곳
  private resultBuffers = new Map<number, Map<number, PlayerResult>>();
  // [추가] 토너먼트 참가자 수(매치당 인원)
  private participantsPerMatch: number = 2; // 2인 매치 기준

  constructor(
    public readonly tournamentId: string,
    private fastify: FastifyInstance,
  ) {}

  /**
   * Initialize matches from database when session is created
   */
  private async initializeMatches() {
    try {
      const tournamentIdNum = Number(this.tournamentId);
      const tournamentsRepository = (this.fastify as any).tournamentsRepository;
      
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] Initializing matches from database...`);
      const tournamentDetails = await tournamentsRepository.getTournamentWithDetails(tournamentIdNum);
      
      if (tournamentDetails && tournamentDetails.matches) {
        this.matches = tournamentDetails.matches;
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Matches initialized: ${this.matches.length} matches loaded`);
      } else {
        (this.fastify as any).log.warn(`[Session ${this.tournamentId}] No tournament details or matches found in database`);
      }
    } catch (error) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] Error initializing matches:`, error);
    }
  }

  /**
   * 세션에 플레이어를 추가합니다. (1vs1 게임과 같은 방식)
   */
  async addPlayer(playerId: number, socket: WebSocket) {
    this.socket = socket;
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Player ${playerId} connected.`);
    
    // Initialize matches if not already loaded
    if (!this.matches || this.matches.length === 0) {
      await this.initializeMatches();
    }
    
    socket.on('message', (message) => {
      const messageStr = message.toString();
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] Raw message received from player ${playerId}:`, messageStr);
      try {
        const parsed = JSON.parse(messageStr);
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Parsed message type: ${parsed.type}`);
      } catch (e) {
        (this.fastify as any).log.error(`[Session ${this.tournamentId}] Failed to parse message:`, e);
      }
      this.handleMessage(playerId, messageStr);
    });
    
    socket.on('close', (code, reason) => {
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] Player ${playerId} disconnected. Code: ${code}, Reason: ${reason}`);
      this.removePlayer(playerId);
    });
    
    socket.on('error', (error) => {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] WebSocket error for player ${playerId}:`, error);
    });
    
    // Send initial bracket if matches exist
    if (this.matches && this.matches.length > 0) {
      try {
        const bracket = makeBracketFromMatches(this.matches);
        const bracketMessage: WSTournamentBracketMessage = {
          type: 'tournament_bracket',
          data: { bracket },
        };
        socket.send(JSON.stringify(bracketMessage));
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Initial bracket sent to player ${playerId}`);
      } catch (error) {
        (this.fastify as any).log.error(`[Session ${this.tournamentId}] Error sending initial bracket to player ${playerId}:`, error);
      }
    } else {
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] No matches available to send initial bracket to player ${playerId}`);
    }
  }

  /**
   * 세션에서 플레이어를 제거합니다.
   */
  removePlayer(playerId: number) {
    // 중복 호출 방지
    if (this.isDisconnecting) {
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] Player ${playerId} disconnect already in progress, skipping.`);
      return;
    }
    
    this.isDisconnecting = true;
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Player ${playerId} being removed from session.`);
    
    // 토너먼트 상태를 즉시 종료로 변경
    this.status = 'finished';
    
    // 현재 진행 중인 게임이 있다면 종료 처리
    if (this.currentGameSessionId) {
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] Terminating current game session: ${this.currentGameSessionId}`);
      try {
        this.gameManager.removeGame(this.currentGameSessionId);
        this.currentGameSessionId = null;
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Game session terminated successfully.`);
      } catch (error) {
        (this.fastify as any).log.error(`[Session ${this.tournamentId}] Error ending game session:`, error);
      }
    }
    
    // 토너먼트의 모든 매치를 취소 상태로 업데이트
    this.cancelAllRemainingMatches();
    
    // 토너먼트가 중간에 중단되었는지 확인하고 적절한 상태로 업데이트
    this.updateTournamentStatusOnDisconnect();
    
    this.socket = null;
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Player ${playerId} disconnected and session cleaned up.`);
  }

  /**
   * 플레이어 연결 해제 시 토너먼트 상태를 DB에 업데이트합니다.
   */
  private async updateTournamentStatusOnDisconnect() {
    try {
      const tournamentIdNum = Number(this.tournamentId);
      const tournamentsRepository = (this.fastify as any).tournamentsRepository;
      
      // 현재 토너먼트 상태 확인
      const currentTournament = await (this.fastify as any).knex('tournaments')
        .where('id', tournamentIdNum)
        .first();
      
      if (!currentTournament) {
        (this.fastify as any).log.error(`[Session ${this.tournamentId}] Tournament not found in database.`);
        return;
      }
      
      // 토너먼트가 이미 완료된 상태라면 업데이트하지 않음
      if (currentTournament.status === 'finished' && currentTournament.winner_player_id) {
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Tournament already completed with winner, not updating status.`);
        return;
      }
      
      // 토너먼트의 매치 진행 상황 확인
      const allMatches = await (this.fastify as any).knex('games')
        .where('tournament_id', tournamentIdNum)
        .select('id', 'status', 'round_number', 'winner_id');
      
      const finishedMatches = allMatches.filter(match => match.status === 'finished' && match.winner_id);
      const totalMatches = allMatches.length;
      
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] Tournament progress: ${finishedMatches.length}/${totalMatches} matches completed`);
      
      // 모든 매치가 완료되었다면 (결승까지 끝났다면) finished 상태 유지
      if (finishedMatches.length === totalMatches && totalMatches > 0) {
        // 결승 매치 찾기 (가장 높은 라운드)
        const maxRound = Math.max(...allMatches.map(m => m.round_number));
        const finalMatch = finishedMatches.find(m => m.round_number === maxRound);
        
        if (finalMatch && finalMatch.winner_id) {
          (this.fastify as any).log.info(`[Session ${this.tournamentId}] Tournament completed naturally, keeping finished status with winner ${finalMatch.winner_id}.`);
          return;
        }
      }
      
      // 토너먼트가 중간에 중단되었다면 canceled로 업데이트
      await tournamentsRepository.updateTournamentStatus(tournamentIdNum, 'canceled', null);
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] Tournament status updated to canceled in database (${finishedMatches.length}/${totalMatches} matches were completed).`);
    } catch (error) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] Error updating tournament status on disconnect:`, error);
    }
  }

  /**
   * 클라이언트로부터 받은 메시지를 처리합니다.
   */
  private async handleMessage(playerId: PlayerId, message: Buffer | string) {
    let parsed: any;
    try {
      parsed = JSON.parse(message.toString());
    } catch (e) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] Invalid JSON message: ${message}`);
      return;
    }
    
    // 기본 메시지 구조 검증
    if (!parsed || typeof parsed !== 'object' || !parsed.type) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] Invalid message structure from user ${playerId}`);
      return;
    }
    
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Received message from user ${playerId}:`, parsed);
    
    switch (parsed.type) {
      case 'tournament_start':
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Starting tournament...`);
        await this.startTournament();
        break;
      case 'tournament_disconnect':
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Tournament disconnect request from user ${playerId}`);
        this.handleTournamentDisconnect(playerId);
        break;
      case 'match_result':
        // match_result 데이터 검증
        if (!this.validateMatchResultData(parsed.data)) {
          (this.fastify as any).log.error(`[Session ${this.tournamentId}] Invalid match result data from user ${playerId}:`, parsed.data);
          return;
        }
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Match result received:`, parsed.data);
        await this.onRawMatchResult(parsed.data);
        break;
      case 'player_input':
        // player_input 데이터 검증
        if (!this.validatePlayerInputData(parsed.data)) {
          (this.fastify as any).log.error(`[Session ${this.tournamentId}] Invalid player input data from user ${playerId}:`, parsed.data);
          return;
        }
        if (this.currentGameSessionId) {
          const { playerId: inputPlayerId, input } = parsed.data;
          this.gameManager.handlePlayerInput(this.currentGameSessionId, inputPlayerId, input);
        }
        break;
      default:
        (this.fastify as any).log.warn(`[Session ${this.tournamentId}] Unknown message type: ${parsed.type}`);
    }
  }

  /**
   * 매치 결과 데이터 유효성 검증
   */
  private validateMatchResultData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    // 필수 필드 검증
    if (typeof data.matchId !== 'number' || data.matchId <= 0) {
      return false;
    }
    
    if (typeof data.playerId !== 'number' || data.playerId <= 0) {
      return false;
    }
    
    if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
      return false;
    }
    
    return true;
  }

  /**
   * 플레이어 입력 데이터 유효성 검증
   */
  private validatePlayerInputData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    // 필수 필드 검증
    if (typeof data.playerId !== 'number' || data.playerId <= 0) {
      return false;
    }
    
    if (!data.input || typeof data.input !== 'object') {
      return false;
    }
    
    return true;
  }

  /**
   * GameSession → WebSocket 으로부터 플레이어 하나의 결과를 받을 때마다 호출
   */
  private async onRawMatchResult(data: { matchId: number; playerId: number; score: number }) {
    // 입력 데이터 정제 및 추가 검증
    const matchId = Math.floor(Number(data.matchId));
    const playerId = Math.floor(Number(data.playerId));
    const score = Math.max(0, Math.min(100, Math.floor(Number(data.score)))); // 0-100 범위로 제한
    
    // 매치 참가자 검증
    const match = this.matches.find(m => m.id === matchId);
    if (!match) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] Match ${matchId} not found`);
      return;
    }
    
    const isParticipant = match.participants?.some(p => p.id === playerId);
    if (!isParticipant) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] Player ${playerId} is not a participant in match ${matchId}`);
      return;
    }

    // 1) 버퍼 초기화
    if (!this.resultBuffers.has(matchId)) {
      this.resultBuffers.set(matchId, new Map());
    }
    const buf = this.resultBuffers.get(matchId)!;

    // 2) 플레이어 결과 저장(중복 방지)
    buf.set(playerId, { playerId, score });

    // 3) 아직 다 모이지 않았다면 대기
    if (!this.allResultsReceivedFor(matchId)) {
      return;
    }

    // 4) 모두 모였으면 처리 → 한 번만 실행
    this.resultBuffers.delete(matchId);
    await this.onAllResultsCollected(matchId, Array.from(buf.values()));
    // 다음 매치 트리거는 handleMatchEnded에서 처리됨
  }

  /**
   * 해당 matchId의 모든 결과가 모였는지 체크
   */
  private allResultsReceivedFor(matchId: number): boolean {
    const buf = this.resultBuffers.get(matchId);
    return !!buf && buf.size >= this.participantsPerMatch;
  }

  /**
   * 플레이어 전원의 결과가 모였을 때 한 번만 호출된다.
   */
  private async onAllResultsCollected(matchId: number, results: PlayerResult[]) {
    // a) 결과 집계 (예: 점수 순 정렬 후 승자 결정)
    const sorted = results.sort((a, b) => b.score - a.score);
    const winnerId = sorted[0].playerId;

    // b) DB에 매치 상태 업데이트
    const matchesRepository = (this.fastify as any).matchesRepository;
    await matchesRepository.updateMatchStatus(matchId, 'finished', winnerId);

    // c) 토너먼트 상태 내부 갱신 - winnerId를 직접 전달
    this.handleMatchEnded(matchId, winnerId);

    // d) 다음 매치 시작 (handleMatchEnded에서 처리)
  }

  // [기존 handleMatchEnd → handleMatchEnded로 이름만 변경, 내부 로직 그대로]
  private async handleMatchEnded(matchId: number, providedWinnerId?: number) {
    const matchesRepository = (this.fastify as any).matchesRepository;

    // 0. 진입 로그
    (this.fastify as any).log?.info?.(`[handleMatchEnded] 진입: matchId=${matchId}, providedWinnerId=${providedWinnerId}`);

    // 1. 이번 매치 결과 정보 조회 - 제공된 winnerId가 있으면 사용, 없으면 DB에서 조회
    let winnerId = providedWinnerId;
    if (!winnerId) {
      const matchInfo = await matchesRepository.getMatchById(matchId);
      winnerId = matchInfo?.winner_id;
    }
    
    (this.fastify as any).log?.info?.(`[handleMatchEnded] 최종 winnerId: ${winnerId}`);

    // 2. 이번 매치 상태/승자 정보 세션에 반영
    const finishedMatch = this.matches.find(m => m.id === matchId);
    (this.fastify as any).log?.info?.(`[handleMatchEnded] finishedMatch: id=${finishedMatch?.id}, round_number=${finishedMatch?.round_number}, status=${finishedMatch?.status}`);

    if (!finishedMatch) return;
    finishedMatch.status = 'finished';
    finishedMatch.winner_id = winnerId;

    // 3. 4강전이 모두 끝난 경우 결승전 참가자 세팅
    if (finishedMatch.round_number === 1) {
      const semifinals = this.matches.filter(m => m.round_number === 1);
      (this.fastify as any).log?.info?.(`[디버깅] 모든 준결승:`, semifinals.map(m => `id=${m.id},status=${m.status},winner=${m.winner_id}`).join(', '));
      
      // 현재 방금 끝난 매치도 포함해서 체크하기 위해 조건 수정
      const finishedSemifinals = semifinals.filter(m => 
        (m.status === 'finished' || m.id === matchId) && m.winner_id
      );
      (this.fastify as any).log?.info?.(`[준결승 완료 확인] 완료된 준결승: ${finishedSemifinals.length}/2, 세부: ${finishedSemifinals.map(m => `id=${m.id},status=${m.status},winner=${m.winner_id}`).join(', ')}`);
      
      // 추가 디버깅: winnerId가 제대로 설정되었는지 확인
      (this.fastify as any).log?.info?.(`[디버깅] 현재 매치 ${matchId}의 winnerId: ${winnerId}, finishedMatch.winner_id: ${finishedMatch.winner_id}`);
      
      if (finishedSemifinals.length === 2) {
        // winner_id 검증 로그 추가
        finishedSemifinals.forEach(m => {
          (this.fastify as any).log?.info?.(`[winnerId 검증] matchId=${m.id}, winner_id=${m.winner_id}, participants=${JSON.stringify(m.participants)}`);
        });
        const winnerIds = finishedSemifinals.map(m => m.winner_id);
        const finalMatch = this.matches.find(m => m.round_number === 2);
        (this.fastify as any).log?.info?.(`[결승 참가자 등록 시도] semifinals: ${semifinals.map(m => m.id).join(',')}, winnerIds: ${winnerIds}, finalMatchId: ${finalMatch?.id}`);
        
        if (finalMatch) {
          (this.fastify as any).log?.info?.(`[결승 참가자 등록] matchId=${finalMatch.id}, winners=${winnerIds}`);
          
          // DB에 결승전 참가자 업데이트
          await matchesRepository.updateNextMatchPlayers(finalMatch.id, winnerIds[0], winnerIds[1]);
          
          // 세션 내 결승전 매치 참가자 정보도 업데이트 - DB에서 다시 조회해서 동기화
          const updatedFinalMatch = await matchesRepository.getMatchById(finalMatch.id);
          if (updatedFinalMatch) {
            finalMatch.participants = updatedFinalMatch.participants;
            (this.fastify as any).log?.info?.(`[결승 참가자 세션 갱신] matchId=${finalMatch.id}, participants=${JSON.stringify(finalMatch.participants)}`);
          }
          
          (this.fastify as any).log?.info?.(`[결승 참가자 등록 완료] matchId=${finalMatch.id}`);
        } else {
          (this.fastify as any).log?.info?.(`[결승전 매치가 존재하지 않음]`);
        }
      } else {
        (this.fastify as any).log?.info?.(`[결승 참가자 등록 조건 불충족] finishedSemifinals: ${finishedSemifinals.length}`);
      }
    }

    // 4. 브라켓 갱신
    const bracket = makeBracketFromMatches(this.matches);
    const bracketUpdateMessage = {
      type: 'bracket_update',
      data: { matches: this.matches, bracket },
    };
    this.sendToClient(bracketUpdateMessage);

    // 5. 다음 매치 시작
    await this.startNextMatch();
  }

  /**
   * 토너먼트 매치들의 nextMatchId를 토너먼트 구조에 맞게 할당
   * 예시: 4강 1라운드(matchid1) -> 결승(matchid3), 4강 2라운드(matchid2) -> 결승(matchid3), 결승(matchid3) -> null
   */
  private assignNextMatchIds() {
    // 라운드별로 매치 분류
    const roundMap = new Map<number, any[]>();
    for (const match of this.matches) {
      if (!roundMap.has(match.round_number)) {
        roundMap.set(match.round_number, []);
      }
      roundMap.get(match.round_number)!.push(match);
    }
    // 라운드 번호 오름차순 정렬
    const sortedRounds = Array.from(roundMap.keys()).sort((a, b) => a - b);
    for (let i = 0; i < sortedRounds.length - 1; ++i) {
      const currentRound = roundMap.get(sortedRounds[i]);
      const nextRound = roundMap.get(sortedRounds[i + 1]);
      if (!currentRound || !nextRound) continue;
      // 다음 라운드 매치에 2개씩 연결 (토너먼트 구조)
      for (let j = 0; j < currentRound.length; ++j) {
        // 예: 4강 2개 -> 결승 1개
        // 모두 nextRound[0]로 연결
        currentRound[j].nextMatchId = nextRound[0]?.id;
      }
    }
    // 마지막 라운드(결승)는 nextMatchId 없음
    const lastRound = roundMap.get(sortedRounds[sortedRounds.length - 1]);
    if (lastRound) {
      for (const match of lastRound) {
        match.nextMatchId = undefined;
      }
    }
  }

  /**
   * 토너먼트 시작 로직: 대진표 생성 및 참가자들에게 브로드캐스트
   */
  private async startTournament() {
    // 이미 시작된 토너먼트는 중복 처리 방지
    const tournamentIdNum = Number(this.tournamentId);
    const tournamentsRepository = (this.fastify as any).tournamentsRepository;
    
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Getting tournament details from DB...`);
    const tournamentDetails = await tournamentsRepository.getTournamentWithDetails(tournamentIdNum);
    
    if (!tournamentDetails) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] Tournament not found in DB.`);
      return;
    }

    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Tournament details retrieved:`, {
      id: tournamentDetails.id,
      status: tournamentDetails.status,
      matchesCount: tournamentDetails.matches?.length || 0,
      matches: tournamentDetails.matches?.map(m => ({ 
        id: m.id, 
        round: m.round_number, 
        status: m.status,
        participants: m.participants?.length || 0 
      })) || []
    });

    // matches를 round_number로 그룹핑하여 TournamentBracket 타입으로 변환
    const bracket = makeBracketFromMatches(tournamentDetails.matches);
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Bracket created:`, bracket);

    // 대진표 메시지 생성 및 브로드캐스트
    const bracketMessage: WSTournamentBracketMessage = {
      type: 'tournament_bracket',
      data: { bracket },
    };
    this.sendToClient(bracketMessage);
    this.status = 'in_progress';
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Tournament started and bracket sent (from DB).`);

    // matches 배열을 세션에 저장
    this.matches = tournamentDetails.matches;
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Matches stored in session:`, this.matches?.length || 0);
    
    // nextMatchId를 토너먼트 구조에 맞게 할당
    this.assignNextMatchIds();
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] NextMatchIds assigned.`);
    
    // 첫 경기 시작
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Starting next match...`);
    this.startNextMatch();
  }

  /**
   * 특정 매치를 시작하는 메소드 (TestModal에서 호출)
   */
  private async startMatch(matchId: number) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] Match ${matchId} not found.`);
      return;
    }

    match.status = 'playing';
    const bracketUpdateMessage: BracketUpdateDto = { type: 'bracket_update', data: { matches: this.matches } };
    this.sendToClient(bracketUpdateMessage);
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Match ${matchId} started manually.`);
  }

  /**
   * 다음 경기를 찾아 시작시키는 메소드
   */
  private async startNextMatch() {
    (this.fastify as any).log.info(`[startNextMatch] Starting search for next match...`);
    
    // 토너먼트가 종료된 상태라면 새로운 매치를 시작하지 않음
    if (this.status === 'finished') {
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] Tournament is finished, not starting new match.`);
      return;
    }
    
    // 클라이언트 소켓이 연결되지 않은 상태라면 새로운 매치를 시작하지 않음
    if (!this.socket) {
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] No client socket connected, not starting new match.`);
      return;
    }
    
    (this.fastify as any).log.info(`[startNextMatch] Current matches:`, this.matches?.map(m => ({ 
      id: m.id, 
      round: m.round_number, 
      status: m.status, 
      participants: m.participants?.length || 0,
      participantNames: m.participants?.map(p => p.display_name) || []
    })));

    if (!this.matches || this.matches.length === 0) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] No matches available!`);
      return;
    }

    const nextMatch = this.matches.find(
      match => match.status === 'waiting' && match.participants && match.participants.length >= 2
    );
    
    (this.fastify as any).log.info(`[startNextMatch] Next match found:`, nextMatch ? {
      id: nextMatch.id,
      round: nextMatch.round_number,
      status: nextMatch.status,
      participants: nextMatch.participants?.length || 0
    } : 'No suitable match found');
    
    if (!nextMatch) {
      // 대기 중인 매치가 있지만 참가자가 부족한 경우를 확인
      const waitingMatches = this.matches.filter(m => m.status === 'waiting');
      if (waitingMatches.length > 0) {
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Waiting matches without enough participants:`, 
          waitingMatches.map(m => ({ id: m.id, participants: m.participants?.length || 0 })));
      }
      
      // 모든 매치가 끝났으면 토너먼트 종료
      const isTournamentFinished = !this.matches.some(m => m.status !== 'finished');
      if (isTournamentFinished) {
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Tournament finished, ending...`);
        await this.endTournament();
      } else {
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Waiting for other matches to finish...`);
      }
      return;
    }

    nextMatch.status = 'playing'; // 명확히 상태 반영
    const bracketUpdateMessage = { type: 'bracket_update', data: { matches: this.matches, bracket: makeBracketFromMatches(this.matches) } };
    this.sendToClient(bracketUpdateMessage);
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Starting match ${nextMatch.id}`);
    
    // 매치 시작 전 최종 상태 확인
    if (this.status === 'finished' || !this.socket) {
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] Tournament state changed, cancelling match ${nextMatch.id}`);
      return;
    }
    
    // Send match_starting message to client BEFORE creating the game
    const matchStartingMessage = {
      type: 'match_starting',
      data: {
        matchId: nextMatch.id,
        gameId: nextMatch.id, // Using match ID as game ID for now
        participants: nextMatch.participants || [],
        round_number: nextMatch.round_number
      }
    };
    
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Sending match_starting message:`, matchStartingMessage);
    
    // 클라이언트 소켓 연결 상태 재확인
    if (!this.socket) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] No client socket connected for match ${nextMatch.id}.`);
      return;
    }
    
    this.sendToClient(matchStartingMessage);
    
    try {
      // 실제 사용자 정보를 포함한 플레이어 정보 생성
      const playersForNextMatch: PlayerResponseDto[] = await Promise.all(
        nextMatch.participants.map(async (p) => {
          let playerName = p.display_name || `Player${p.id}`;
          let avatarUrl: string | undefined = undefined;
          
          // user_id가 있으면 user_profiles에서 실제 사용자 정보 가져오기
          if (p.user_id) {
            try {
              const userProfile = await (this.fastify as any).knex('user_profiles')
                .where('user_id', p.user_id)
                .first();
              if (userProfile) {
                playerName = userProfile.name || playerName;
                avatarUrl = userProfile.avatar_url || undefined;
              }
            } catch (err) {
              (this.fastify as any).log?.warn?.(`[Session ${this.tournamentId}] Failed to fetch user profile for user ${p.user_id}:`, err);
            }
          }
          
          return {
            id: p.id,
            type: p.user_id ? 'user' : 'guest',
            name: playerName,
            avatarUrl
          };
        })
      );
      
      (this.fastify as any).log?.info?.(`[Session ${this.tournamentId}] Players for match ${nextMatch.id}:`, 
        playersForNextMatch.map(p => ({ id: p.id, name: p.name, type: p.type })));
      
      const customCallbacks = {
        onStateUpdate: (gameState: GameStateDto) => {
          try {
            const message: WSGameInTournamentStateMessage = { type: 'game_state', data: gameState };
            this.sendToClient(message);
          } catch (err) {
            (this.fastify as any).log?.error?.(`[Session ${this.tournamentId}] Error in onStateUpdate callback:`, err);
          }
        },
        onEvent: async (gameEvent: GameEventDto) => {
          try {
            const message: WSGameInTournamentEventMessage = { type: 'game_event', data: gameEvent };
            this.sendToClient(message);
            if (gameEvent.event === 'game_end') {
              // game_end 이벤트에서 winnerId를 추출해서 전달
              const winnerId = gameEvent.data?.winnerId;
              (this.fastify as any).log?.info?.(`[game_end] 이벤트에서 받은 winnerId: ${winnerId}`);
              
              // DB에 매치 상태 업데이트 추가
              const matchesRepository = (this.fastify as any).matchesRepository;
              await matchesRepository.updateMatchStatus(nextMatch.id, 'finished', winnerId);
              
              this.handleMatchEnded(nextMatch.id, winnerId);
            }
          } catch (err) {
            (this.fastify as any).log?.error?.(`[Session ${this.tournamentId}] Error in onEvent callback:`, err);
          }
        }
      };
      this.currentGameSessionId = await this.gameManager.createGame('tournament', playersForNextMatch, customCallbacks);
      for (const player of playersForNextMatch) {
        this.gameManager.handlePlayerConnection(this.currentGameSessionId, player.id);
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Auto-connected player ${player.id} to game ${this.currentGameSessionId}`);
      }
      if (this.socket) {
        const message: MatchStartingDto = {
          type: 'match_starting',
          data: {
            matchId: nextMatch.id,
            gameId: this.currentGameSessionId,
            participants: playersForNextMatch.map(p => ({
              id: p.id,
              user_id: p.type === 'user' ? p.id : undefined,
              display_name: p.name,
              name: p.name,
              type: p.type,
              avatarUrl: p.avatarUrl
            })),
            round_number: nextMatch.round_number
          },
        };
        this.socket.send(JSON.stringify(message));
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Match ${nextMatch.id} started with players:`, 
          playersForNextMatch.map(p => ({ id: p.id, name: p.name, type: p.type })));
      } else {
        (this.fastify as any).log.error(`[Session ${this.tournamentId}] No client socket connected for match ${nextMatch.id}.`);
      }
    } catch (error) {
      (this.fastify as any).log?.error?.(`[Session ${this.tournamentId}] Failed to create game session for match ${nextMatch.id}`, error);
    }
  }

  /**
   * 토너먼트를 종료하고 최종 결과를 모든 참가자에게 알립니다.
   */
  private async endTournament() {
    this.status = 'finished';

    // 결승전(nextMatchId가 null 또는 undefined인 경기)을 찾아 최종 우승자를 확인
    const finalMatch = this.matches.find(m => !('nextMatchId' in m) || m.nextMatchId == null);
    const finalWinner = (finalMatch as any)?.winner_id;

    (this.fastify as any).log?.info?.(`[Session ${this.tournamentId}] Tournament has officially ended. Winner: Player ${finalWinner}`);

    // 모든 참가자에게 토너먼트 종료와 최종 우승자 정보를 브로드캐스트
    this.sendToClient({
      type: 'tournament_end',
      data: {
        winner: finalWinner,
        finalMatches: this.matches
      }
    });

    // DB에 토너먼트의 최종 상태를 'finished'로 업데이트
    const tournamentsRepository = (this.fastify as any).tournamentsRepository;
    await tournamentsRepository.updateTournamentStatus(Number(this.tournamentId), 'ended', finalWinner);

    // 결과 전송 후 즉시 소켓 닫기 - 프론트엔드에서 결과 화면을 계속 표시
    (this.fastify as any).log?.info?.(`[Session ${this.tournamentId}] Tournament results sent, closing connection`);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    this.socket = null;
  }

  /**
   * 이 세션의 모든 플레이어에게 메시지를 전송합니다.
   */
  sendToClient(message: object) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  /**
   * 토너먼트 연결 해제 요청을 처리합니다.
   */
  private handleTournamentDisconnect(playerId: number) {
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Processing tournament disconnect for player ${playerId}`);
    
    // 플레이어 제거 - 기존 removePlayer 메서드 재사용
    this.removePlayer(playerId);
  }

  /**
   * 토너먼트의 모든 대기/진행 중인 매치를 취소합니다.
   */
  private async cancelAllRemainingMatches() {
    try {
      const tournamentIdNum = Number(this.tournamentId);
      
      // DB에서 모든 진행되지 않은 매치들을 'canceled' 상태로 업데이트
      await (this.fastify as any).knex('games')
        .where('tournament_id', tournamentIdNum)
        .whereIn('status', ['waiting', 'playing', 'countdown'])
        .update({
          status: 'canceled',
          ended_at: new Date().toISOString()
        });
      
      (this.fastify as any).log.info(`[Session ${this.tournamentId}] All remaining matches cancelled in database.`);
    } catch (error) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] Error cancelling remaining matches:`, error);
    }
  }
}