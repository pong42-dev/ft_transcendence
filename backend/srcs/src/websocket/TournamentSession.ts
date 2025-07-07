//참가자 관리, 모든 참가자에게 브로드캐스트
import { WebSocket } from 'ws';
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

export class TournamentSession {
  // 1vs1 게임과 같은 방식으로 playerSockets Map 사용
  private playerSockets = new Map<number, WebSocket>(); // playerId -> socket
  public status: 'waiting' | 'in_progress' | 'finished' = 'waiting';
  // 수정: 대진표를 세션 상태로 저장
  private matches: TournamentMatchInfo[] = [];
  private gameManager: GameManager = GameManager.getInstance();
  private currentGameSessionId: string | null = null;

  constructor(
    public readonly tournamentId: string,
    private fastify: FastifyInstance,
  ) {}

  /**
   * 세션에 플레이어를 추가합니다. (1vs1 게임과 같은 방식)
   */
  addPlayer(playerId: number, socket: WebSocket) {
    this.playerSockets.set(playerId, socket);
    this.fastify.log.info(`[Session ${this.tournamentId}] Player ${playerId} joined. Total: ${this.playerSockets.size}`);

    socket.on('message', (message) => this.handleMessage(playerId, message.toString()));
    socket.on('close', () => this.removePlayer(playerId));

    // [보강] 입장한 플레이어에게만 현재 토너먼트 대진표(및 필요시 참가자 목록 등) 전송
    if (this.matches && this.matches.length > 0) {
      const bracket = makeBracketFromMatches(this.matches);
      const bracketMessage: WSTournamentBracketMessage = {
        type: 'tournament_bracket',
        data: { bracket },
      };
      socket.send(JSON.stringify(bracketMessage));
    }
    // 필요시 참가자 목록 등 추가 전송 가능
  }

  /**
   * 세션에서 플레이어를 제거합니다.
   */
  removePlayer(playerId: number) {
    this.playerSockets.delete(playerId);
    this.fastify.log.info(`[Session ${this.tournamentId}] Player ${playerId} left. Remaining: ${this.playerSockets.size}`);
  }

  /**
   * 클라이언트로부터 받은 메시지를 처리합니다.
   */
  private async handleMessage(playerId: PlayerId, message: Buffer | string) {
    let parsed: any;
    try {
      parsed = JSON.parse(message.toString());
    } catch (e) {
      this.fastify.log.error(`[Session ${this.tournamentId}] Invalid JSON message: ${message}`);
      return;
    }
    
    this.fastify.log.info(`[Session ${this.tournamentId}] Received message from user ${playerId}:`, parsed);
    
    switch (parsed.type) {
      case 'tournament_start':
        if (this.status === 'in_progress' || (this as any)._isStartingTournament) {
          this.fastify.log.info(`[Session ${this.tournamentId}] Tournament start request ignored (already started or in progress).`);
          return;
        }
        this.fastify.log.info(`[Session ${this.tournamentId}] Starting tournament...`);
        await this.startTournament();
        break;
      case 'match_result':
        this.fastify.log.info(`[Session ${this.tournamentId}] Match result received:`, parsed.data);
        await this.handleMatchResult(parsed.data);
        break;
      case 'player_input':
        if (this.currentGameSessionId) {
          const { playerId: inputPlayerId, input } = parsed.data;
          this.gameManager.handlePlayerInput(this.currentGameSessionId, inputPlayerId, input);
        }
        break;
      default:
        this.fastify.log.warn(`[Session ${this.tournamentId}] Unknown message type: ${parsed.type}`);
    }
  }

  /**
   * 클라이언트로부터 받은 매치 결과를 처리하는 메서드
   */
  private async handleMatchResult(data: { matchId: number; winnerId: number }) {
    this.fastify.log?.info?.(`[Session ${this.tournamentId}] Processing match result:`, data);
    
    const { matchId, winnerId } = data;
    
    // 매치 결과를 handleMatchEnd로 전달하여 처리
    await this.handleMatchEnd(matchId, winnerId);
  }

  /**
   * 토너먼트 시작 로직: 대진표 생성 및 참가자들에게 브로드캐스트
   */
  private async startTournament() {
    // 이미 시작된 토너먼트는 중복 처리 방지
    if (this.status === 'in_progress') {
      this.fastify.log.info(`[Session ${this.tournamentId}] Tournament already started, ignoring duplicate start request.`);
      return;
    }
    
    // 이미 처리 중인지 확인하는 플래그 추가
    if ((this as any)._isStartingTournament) {
      this.fastify.log.info(`[Session ${this.tournamentId}] Tournament start already in progress, ignoring...`);
      return;
    }
    (this as any)._isStartingTournament = true;

    // 1. DB에서 토너먼트 상세 정보 조회 (matches 포함)
    const tournamentIdNum = Number(this.tournamentId);
    // Fastify 인스턴스에 tournamentsRepository가 있다고 단언
    const tournamentsRepository = (this.fastify as any).tournamentsRepository;
    const tournamentDetails = await tournamentsRepository.getTournamentWithDetails(tournamentIdNum);
    if (!tournamentDetails) {
      this.fastify.log.error(`[Session ${this.tournamentId}] Tournament not found in DB.`);
      return;
    }

    // 2. matches를 round_number로 그룹핑하여 TournamentBracket 타입으로 변환
    const bracket = makeBracketFromMatches(tournamentDetails.matches);

    // 3. 대진표 메시지 생성 및 브로드캐스트
    const bracketMessage: WSTournamentBracketMessage = {
      type: 'tournament_bracket',
      data: { bracket },
    };
    this.broadcast(bracketMessage);
    this.status = 'in_progress';
    this.fastify.log.info(`[Session ${this.tournamentId}] Tournament started and bracket sent (from DB).`);

    // 추가: matches 배열을 세션에 저장
    this.matches = tournamentDetails.matches;
    // 추가: 첫 경기 시작
    this.startNextMatch();
    
    // 플래그 초기화
    (this as any)._isStartingTournament = false;
  }

  /**
   * 특정 매치를 시작하는 메소드 (TestModal에서 호출)
   */
  private async startMatch(matchId: number) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) {
      this.fastify.log.error(`[Session ${this.tournamentId}] Match ${matchId} not found.`);
      return;
    }

    if (match.status !== 'waiting') {
      this.fastify.log.warn(`[Session ${this.tournamentId}] Match ${matchId} is not in waiting status.`);
      return;
    }

    // 매치 상태를 'playing'으로 변경
    match.status = 'playing';
    const bracketUpdateMessage: BracketUpdateDto = { type: 'bracket_update', data: { matches: this.matches } };
    this.broadcast(bracketUpdateMessage);
    this.fastify.log.info(`[Session ${this.tournamentId}] Match ${matchId} started manually.`);
  }

  /**
   * 다음 경기를 찾아 시작시키는 메소드
   */
  private async startNextMatch() {
    // 경기 세션이 아직 종료되지 않았으면 중복 생성 방지
    if (this.currentGameSessionId !== null) {
      this.fastify.log?.warn?.(`[Session ${this.tournamentId}] startNextMatch called while a game is still running!`);
      return;
    }
    
    // 이미 처리 중인지 확인하는 플래그 추가
    if ((this as any)._isStartingMatch) {
      this.fastify.log?.warn?.(`[Session ${this.tournamentId}] startNextMatch already in progress, skipping...`);
      return;
    }
    (this as any)._isStartingMatch = true;
    // 1. 'waiting' 상태이면서 두 플레이어가 모두 배정된 다음 경기를 찾습니다.
    const nextMatch = this.matches.find(match => match.status === 'waiting' && match.participants[0] && match.participants[1]);
    if (!nextMatch) {
      // 진행할 경기가 없으면 토너먼트 종료 여부 확인
      const isTournamentFinished = !this.matches.some(m => m.status !== 'finished');
      if (isTournamentFinished) {
        await this.endTournament();
      } else {
        this.fastify.log?.info?.(`[Session ${this.tournamentId}] Waiting for other matches to finish...`);
      }
      return;
    }
    // 2. 해당 경기의 상태를 'playing'으로 변경하고 모두에게 브로드캐스트합니다.
    nextMatch.status = 'playing';
    const bracketUpdateMessage: BracketUpdateDto = { type: 'bracket_update', data: { matches: this.matches } };
    this.broadcast(bracketUpdateMessage);
    this.fastify.log?.info?.(`[Session ${this.tournamentId}] Starting match ${nextMatch.id}`);
    try {
      // GameManager의 createGame이 customCallbacks를 직접 받으므로 바로 넘긴다
      // TournamentMatchInfo의 participants를 PlayerResponseDto로 변환
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
            this.broadcast(message);
          } catch (err) {
            this.fastify.log?.error?.(`[Session ${this.tournamentId}] Error in onStateUpdate callback:`, err);
            // 필요시 추가 복구 로직
          }
        },
        onEvent: (gameEvent: GameEventDto) => {
          try {
            const message: WSGameInTournamentEventMessage = { type: 'game_event', data: gameEvent };
            this.broadcast(message);
            if (gameEvent.event === 'game_end') {
              this.handleMatchEnd(nextMatch.id, gameEvent.data?.winnerId);
            }
          } catch (err) {
            this.fastify.log?.error?.(`[Session ${this.tournamentId}] Error in onEvent callback:`, err);
            // 필요시 추가 복구 로직
          }
        }
      };
      // customCallbacks 누락 방지: undefined일 경우 에러 throw
      if (!customCallbacks || typeof customCallbacks.onStateUpdate !== 'function' || typeof customCallbacks.onEvent !== 'function') {
        throw new Error('TournamentSession: customCallbacks must be provided and must have onStateUpdate/onEvent functions!');
      }
      this.currentGameSessionId = await this.gameManager.createGame('tournament', playersForNextMatch, customCallbacks);
      // 두 플레이어에게 경기 시작 메시지 전송 (1vs1 게임과 같은 방식)
      const player1Socket = this.playerSockets.get(nextMatch.participants[0].id);
      const player2Socket = this.playerSockets.get(nextMatch.participants[1].id);
      
      if (player1Socket && player2Socket) {
        const message: MatchStartingDto = {
          type: 'match_starting',
          data: {
            matchId: nextMatch.id,
            gameId: this.currentGameSessionId,
            participants: nextMatch.participants,
          },
        };
        const messageString = JSON.stringify(message);
        player1Socket.send(messageString);
        player2Socket.send(messageString);
        this.fastify.log.info(`[Session ${this.tournamentId}] Match ${nextMatch.id} started. Players: ${nextMatch.participants[0].id} vs ${nextMatch.participants[1].id}`);
        this.fastify.log.info(`[Session ${this.tournamentId}] Participants data:`, JSON.stringify(nextMatch.participants));
      } else {
        this.fastify.log.error(`[Session ${this.tournamentId}] Player not found for match ${nextMatch.id}. Player1: ${nextMatch.participants[0].id}, Player2: ${nextMatch.participants[1].id}`);
        // 디버깅을 위해 연결된 플레이어 정보 출력
        this.fastify.log.error(`[Session ${this.tournamentId}] Connected players:`, Array.from(this.playerSockets.keys()));
      }
    } catch (error) {
      this.fastify.log?.error?.(`[Session ${this.tournamentId}] Failed to create game session for match ${nextMatch.id}`, error);
    } finally {
      // 플래그 초기화
      (this as any)._isStartingMatch = false;
    }
  }

  /**
   * 특정 경기 종료를 처리하고 승자를 다음 경기에 진출시키는 메서드
   */
  private async handleMatchEnd(matchId: number, winnerId: PlayerId) {
    this.fastify.log?.info?.(`[Session ${this.tournamentId}] Match ${matchId} ended. Winner: ${winnerId}`);
    // 경기 세션 ID 초기화 (상태 전이 보장)
    this.currentGameSessionId = null;

    // 1. 해당 매치 찾기
    const finishedMatch = this.matches.find(m => m.id === matchId);
    if (!finishedMatch) return;

    // 2. DB에 경기 결과 기록 (winner_id, status 등)
    const tournamentsRepository = (this.fastify as any).tournamentsRepository;
    const matchesRepository = (this.fastify as any).matchesRepository;
    await matchesRepository.updateMatchStatus(matchId, 'finished', winnerId);

    finishedMatch.status = 'finished';
    finishedMatch.winner_id = winnerId;

    // 3. 승자를 다음 경기(nextMatchId)에 배정 (nextMatchId가 있다고 가정)
    const nextMatchId = (finishedMatch as any).nextMatchId;
    if (nextMatchId) {
      const nextMatch = this.matches.find(m => m.id === nextMatchId);
      if (nextMatch) {
        // player1, player2 중 빈 자리에 승자 배정 (구조에 따라 수정)
        let updatedPlayer1 = nextMatch.participants[0]?.id;
        let updatedPlayer2 = nextMatch.participants[1]?.id;
        if (!updatedPlayer1) {
          nextMatch.participants[0] = { id: winnerId, display_name: `User${winnerId}` };
          updatedPlayer1 = winnerId;
        } else if (!updatedPlayer2) {
          nextMatch.participants[1] = { id: winnerId, display_name: `User${winnerId}` };
          updatedPlayer2 = winnerId;
        }
        // DB에도 반영
        await matchesRepository.updateNextMatchPlayers(nextMatchId, updatedPlayer1, updatedPlayer2);
      }
    }

    // 4. 브래킷 업데이트 브로드캐스트 (상태 동기화)
    const bracket = makeBracketFromMatches(this.matches);
    const bracketUpdateMessage = {
      type: 'bracket_update',
      data: { matches: this.matches, bracket },
    };
    this.broadcast(bracketUpdateMessage);

    // 5. 다음 경기 시작
    this.startNextMatch();
  }

  /**
   * 토너먼트를 종료하고 최종 결과를 모든 참가자에게 알립니다.
   */
  private async endTournament() {
    if (this.status === 'finished') return; // 중복 실행 방지
    this.status = 'finished';

    // 결승전(nextMatchId가 null 또는 undefined인 경기)을 찾아 최종 우승자를 확인
    const finalMatch = this.matches.find(m => !('nextMatchId' in m) || m.nextMatchId == null);
    const finalWinner = (finalMatch as any)?.winner_id;

    this.fastify.log?.info?.(`[Session ${this.tournamentId}] Tournament has officially ended. Winner: Player ${finalWinner}`);

    // 모든 참가자에게 토너먼트 종료와 최종 우승자 정보를 브로드캐스트
    this.broadcast({
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
      for (const socket of this.playerSockets.values()) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      }
    }, 5000);
  }

  /**
   * 이 세션의 모든 플레이어에게 메시지를 전송합니다.
   */
  broadcast(message: object) {
    const data = JSON.stringify(message);
    for (const socket of this.playerSockets.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }
}