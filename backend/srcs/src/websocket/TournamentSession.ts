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

type PlayerId = number; // 실제 프로젝트에 맞는 타입으로 변경 가능

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

  // [추가] 매치별로 결과를 임시 저장할 곳
  private resultBuffers = new Map<number, Map<number, PlayerResult>>();
  // [추가] 토너먼트 참가자 수(매치당 인원)
  private participantsPerMatch: number = 2; // 2인 매치 기준

  constructor(
    public readonly tournamentId: string,
    private fastify: FastifyInstance,
  ) {}

  /**
   * 세션에 플레이어를 추가합니다. (1vs1 게임과 같은 방식)
   */
  addPlayer(playerId: number, socket: WebSocket) {
    this.socket = socket;
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Player connected.`);
    socket.on('message', (message) => this.handleMessage(playerId, message.toString()));
    socket.on('close', () => this.removePlayer(playerId));
    if (this.matches && this.matches.length > 0) {
      const bracket = makeBracketFromMatches(this.matches);
      const bracketMessage: WSTournamentBracketMessage = {
        type: 'tournament_bracket',
        data: { bracket },
      };
      socket.send(JSON.stringify(bracketMessage));
    }
  }

  /**
   * 세션에서 플레이어를 제거합니다.
   */
  removePlayer(playerId: number) {
    this.socket = null;
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Player disconnected.`);
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
    
    (this.fastify as any).log.info(`[Session ${this.tournamentId}] Received message from user ${playerId}:`, parsed);
    
    switch (parsed.type) {
      case 'tournament_start':
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Starting tournament...`);
        await this.startTournament();
        break;
      case 'match_result':
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Match result received:`, parsed.data);
        // [변경] 여러 번 받아도 한 번만 집계하도록 버퍼링 로직 사용
        await this.onRawMatchResult(parsed.data);
        break;
      case 'player_input':
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
   * GameSession → WebSocket 으로부터 플레이어 하나의 결과를 받을 때마다 호출
   */
  private async onRawMatchResult(data: { matchId: number; playerId: number; score: number }) {
    const { matchId, playerId, score } = data;

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
    // 오직 여기서만 다음 매치 트리거
    await this.startNextMatch();
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

    // c) 토너먼트 상태 내부 갱신
    this.handleMatchEnded(matchId);

    // d) 다음 매치 시작
    // await this.startNextMatch(); // 이 부분은 onRawMatchResult에서 처리
  }

  // [기존 handleMatchEnd → handleMatchEnded로 이름만 변경, 내부 로직 그대로]
  private async handleMatchEnded(matchId: number) {
    (this.fastify as any).log?.info?.('----------------handleMatchEnded hello---------');
    const matchesRepository = (this.fastify as any).matchesRepository;
    const matchInfo = await matchesRepository.getMatchById(matchId);
    const winnerId = matchInfo?.winner_id;
    (this.fastify as any).log?.info?.(`[Session ${this.tournamentId}] Match ${matchId} ended. Winner: ${winnerId}`);
    this.currentGameSessionId = null;
    const finishedMatch = this.matches.find(m => m.id === matchId);
    if (!finishedMatch) {
      (this.fastify as any).log?.info?.(`------------ no match found ---------`); return;}
    const tournamentsRepository = (this.fastify as any).tournamentsRepository;
    await matchesRepository.updateMatchStatus(matchId, 'finished', winnerId);
    finishedMatch.status = 'finished';
    finishedMatch.winner_id = winnerId;
    // === 여기서 세션 정보 대신 repository에서 점수 정보 가져오기 ===
    if (matchInfo) {
      const scores = matchInfo.participants.map(p => ({ id: p.id, score: p.score, display_name: p.display_name }));
      (this.fastify as any).log?.info?.(`[RepositoryInfo] scores: ${JSON.stringify(scores)}`);
      // 필요하다면 winnerId, 점수 등 추가 활용 가능
    }
    // === 기존 로직 계속 ===
    const nextMatchId = (finishedMatch as any).nextMatchId;
    (this.fastify as any).log?.info?.(`next match id: ${nextMatchId}`);

    if (nextMatchId) {
      const nextMatch = this.matches.find(m => m.id === nextMatchId);
      if (nextMatch) {
        (this.fastify as any).log?.info?.('----------------there is next match hello---------');
        let updatedPlayer1 = nextMatch.participants[0]?.id;
        let updatedPlayer2 = nextMatch.participants[1]?.id;
        if (!updatedPlayer1) {
          nextMatch.participants[0] = { id: winnerId, display_name: `User${winnerId}` };
          updatedPlayer1 = winnerId;
        } else if (!updatedPlayer2) {
          nextMatch.participants[1] = { id: winnerId, display_name: `User${winnerId}` };
          updatedPlayer2 = winnerId;
        }
        await matchesRepository.updateNextMatchPlayers(nextMatchId, updatedPlayer1, updatedPlayer2);
      }
    }
    const bracket = makeBracketFromMatches(this.matches);
    const bracketUpdateMessage = {
      type: 'bracket_update',
      data: { matches: this.matches, bracket },
    };
    this.sendToClient(bracketUpdateMessage);
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
    const tournamentDetails = await tournamentsRepository.getTournamentWithDetails(tournamentIdNum);
    if (!tournamentDetails) {
      (this.fastify as any).log.error(`[Session ${this.tournamentId}] Tournament not found in DB.`);
      return;
    }

    // matches를 round_number로 그룹핑하여 TournamentBracket 타입으로 변환
    const bracket = makeBracketFromMatches(tournamentDetails.matches);

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
    // nextMatchId를 토너먼트 구조에 맞게 할당
    this.assignNextMatchIds();
    // 첫 경기 시작
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
    const nextMatch = this.matches.find(match => match.status === 'waiting' && match.participants[0] && match.participants[1]);
    if (!nextMatch) {
      const isTournamentFinished = !this.matches.some(m => m.status !== 'finished');
      if (isTournamentFinished) {
        await this.endTournament();
      } else {
        (this.fastify as any).log?.info?.(`[Session ${this.tournamentId}] Waiting for other matches to finish...`);
      }
      return;
    }
    nextMatch.status = 'playing';
    const bracketUpdateMessage: BracketUpdateDto = { type: 'bracket_update', data: { matches: this.matches } };
    this.sendToClient(bracketUpdateMessage);
    (this.fastify as any).log?.info?.(`[Session ${this.tournamentId}] Starting match ${nextMatch.id}`);
    try {
      const playersForNextMatch: PlayerResponseDto[] = nextMatch.participants.map(p => ({
        id: p.id,
        type: p.user_id ? 'user' : 'guest',
        name: p.display_name || `Player${p.id}`,
        avatarUrl: undefined
      }));
      const customCallbacks = {
        onStateUpdate: (gameState: GameStateDto) => {
          try {
            const message: WSGameInTournamentStateMessage = { type: 'game_state', data: gameState };
            this.sendToClient(message);
          } catch (err) {
            (this.fastify as any).log?.error?.(`[Session ${this.tournamentId}] Error in onStateUpdate callback:`, err);
          }
        },
        onEvent: (gameEvent: GameEventDto) => {
          try {
            const message: WSGameInTournamentEventMessage = { type: 'game_event', data: gameEvent };
            this.sendToClient(message);
            if (gameEvent.event === 'game_end') {
              (this.fastify as any).log?.error?.(`handlematchended`);
              this.handleMatchEnded(nextMatch.id);
            }
          } catch (err) {
            (this.fastify as any).log?.error?.(`[Session ${this.tournamentId}] Error in onEvent callback:`, err);
          }
        }
      };
      this.currentGameSessionId = await this.gameManager.createGame('tournament', playersForNextMatch, customCallbacks);
      if (this.socket) {
        const message: MatchStartingDto = {
          type: 'match_starting',
          data: {
            matchId: nextMatch.id,
            gameId: this.currentGameSessionId,
            participants: nextMatch.participants,
          },
        };
        const messageString = JSON.stringify(message);
        this.socket.send(messageString);
        (this.fastify as any).log.info(`[Session ${this.tournamentId}] Match ${nextMatch.id} started.`);
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

    // 5초 후 모든 소켓 닫기 (결과 화면을 보여준 뒤)
    setTimeout(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
    }, 5000);
  }

  /**
   * 이 세션의 모든 플레이어에게 메시지를 전송합니다.
   */
  sendToClient(message: object) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}