//참가자 관리, 모든 참가자에게 브로드캐스트
import { WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { WSTournamentStartMessage, WSTournamentBracketMessage, TournamentBracket } from '../schemas/tournament-websocket';
// 수정: TournamentMatchInfo import
import { TournamentMatchInfo } from '../plugins/app/tournament/tournaments-repository';
import { WSMatchStartingMessage } from '../schemas/game-websocket';
import { GameManager } from '../game/GameManager';
import { GameStateDto, GameEventDto, PlayerResponseDto, PlayerInputDto } from '../schemas/games';
import { BracketUpdateDto, MatchStartingDto } from '../schemas/tournament-websocket';

type PlayerId = number; // 실제 프로젝트에 맞는 타입으로 변경 가능

export class TournamentSession {
  private players = new Map<PlayerId, WebSocket>();
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
   * 세션에 플레이어를 추가합니다.
   */
  addPlayer(playerId: PlayerId, socket: WebSocket) {
    this.players.set(playerId, socket);
    this.fastify.log.info(`[Session ${this.tournamentId}] Player ${playerId} joined. Total: ${this.players.size}`);

    // TODO: 여기서부터 메시지 핸들링 로직 추가
    socket.on('message', (message) => this.handleMessage(playerId, message.toString()));
    socket.on('close', () => this.removePlayer(playerId));

    // 새로운 플레이어에게 현재 토너먼트 정보 전송 (예: 참가자 목록)
    // this.broadcast({ type: 'player_list_update', ... });
  }

  /**
   * 세션에서 플레이어를 제거합니다.
   */
  removePlayer(playerId: PlayerId) {
    this.players.delete(playerId);
    this.fastify.log.info(`[Session ${this.tournamentId}] Player ${playerId} left. Remaining: ${this.players.size}`);
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
    switch (parsed.type) {
      case 'tournament_start':
        await this.startTournament();
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
   * 토너먼트 시작 로직: 대진표 생성 및 참가자들에게 브로드캐스트
   */
  private async startTournament() {
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
    const roundsMap = new Map<number, any[]>();
    for (const match of tournamentDetails.matches) {
      if (
        !match.participants ||
        match.participants.length < 2 ||
        !match.participants[0] ||
        !match.participants[1]
      ) continue;
      if (!roundsMap.has(match.round_number)) {
        roundsMap.set(match.round_number, []);
      }
      const getNickname = (p: any) => {
        if (p.type === 'user') {
          // 반드시 participants에 name이 포함되어 있어야 함 (쿼리/조인에서 users.name을 포함)
          return p.name || `User${p.user_id}`;
        } else {
          return p.display_name || `Player${p.id}`;
        }
      };
      roundsMap.get(match.round_number)!.push({
        matchId: String(match.id),
        player1: {
          id: match.participants[0].id,
          nickname: getNickname(match.participants[0]),
        },
        player2: {
          id: match.participants[1].id,
          nickname: getNickname(match.participants[1]),
        },
        winnerId: match.winner_id ?? undefined,
      });
    }
    const sortedKeys = Array.from(roundsMap.keys()).sort((a, b) => a - b);
    const rounds = sortedKeys.reduce<any[][]>((acc, rn) => {
      const arr = roundsMap.get(rn);
      if (arr && Array.isArray(arr)) acc.push(arr);
      return acc;
    }, []);
    const bracket: TournamentBracket = { rounds };

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

    if (match.status !== 'pending') {
      this.fastify.log.warn(`[Session ${this.tournamentId}] Match ${matchId} is not in pending status.`);
      return;
    }

    // 매치 상태를 'in_progress'로 변경
    match.status = 'in_progress';
    const bracketUpdateMessage: BracketUpdateDto = { type: 'bracket_update', data: { matches: this.matches } };
    this.broadcast(bracketUpdateMessage);
    this.fastify.log.info(`[Session ${this.tournamentId}] Match ${matchId} started manually.`);
  }

  /**
   * 다음 경기를 찾아 시작시키는 메소드
   */
  private async startNextMatch() {
    // 1. 'pending' 상태이면서 두 플레이어가 모두 배정된 다음 경기를 찾습니다.
    const nextMatch = this.matches.find(match => match.status === 'pending' && match.participants[0] && match.participants[1]);
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
    // 2. 해당 경기의 상태를 'in_progress'로 변경하고 모두에게 브로드캐스트합니다.
    nextMatch.status = 'in_progress';
    const bracketUpdateMessage: BracketUpdateDto = { type: 'bracket_update', data: { matches: this.matches } };
    this.broadcast(bracketUpdateMessage);
    this.fastify.log?.info?.(`[Session ${this.tournamentId}] Starting match ${nextMatch.id}`);
    try {
      // GameManager에 콜백을 넘겨 게임 생성
      const playersForNextMatch: PlayerResponseDto[] = nextMatch.participants;
      const customCallbacks = {
        onStateUpdate: (gameState: GameStateDto) => {
          this.broadcast({ type: 'game_state', data: gameState });
        },
        onEvent: (gameEvent: GameEventDto) => {
          this.broadcast({ type: 'game_event', data: gameEvent });
          if (gameEvent.event === 'game_end') {
            this.handleMatchEnd(nextMatch.id, gameEvent.data?.winnerId);
          }
        }
      };
      // GameManager의 createGame은 콜백 인자를 받지 않으므로, webSocketHandler를 임시로 교체하는 방식으로 콜백을 주입
      // (아래는 예시이며, 실제 GameManager 구조에 따라 조정 필요)
      const originalWebSocketHandler = this.gameManager['webSocketHandler'];
      this.gameManager.setWebSocketHandler({
        broadcastGameState: customCallbacks.onStateUpdate,
        broadcastGameEvent: customCallbacks.onEvent
      });
      this.currentGameSessionId = await this.gameManager.createGame('tournament', playersForNextMatch);
      this.gameManager.setWebSocketHandler(originalWebSocketHandler); // 원복
      // 두 플레이어에게 경기 시작 메시지 전송
      const player1Socket = this.players.get(nextMatch.participants[0].id);
      const player2Socket = this.players.get(nextMatch.participants[1].id);
      if (player1Socket && player2Socket) {
        const message: MatchStartingDto = {
          type: 'match_starting',
          data: {
            matchId: nextMatch.id,
            gameId: this.currentGameSessionId,
          },
        };
        const messageString = JSON.stringify(message);
        player1Socket.send(messageString);
        player2Socket.send(messageString);
      } else {
        this.fastify.log.error(`[Session ${this.tournamentId}] Player not found for match ${nextMatch.id}.`);
      }
    } catch (error) {
      this.fastify.log?.error?.(`[Session ${this.tournamentId}] Failed to create game session for match ${nextMatch.id}`, error);
    }
  }

  /**
   * 특정 경기 종료를 처리하고 승자를 다음 경기에 진출시키는 메서드
   */
  private async handleMatchEnd(matchId: number, winnerId: PlayerId) {
    this.fastify.log?.info?.(`[Session ${this.tournamentId}] Match ${matchId} ended. Winner: ${winnerId}`);

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

    // 4. 브래킷 업데이트 브로드캐스트
    const bracketUpdateMessage = {
      type: 'bracket_update',
      data: { matches: this.matches },
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

    // (선택) 모든 웹소켓 연결을 닫거나, 결과 화면을 보여준 뒤 닫도록 처리할 수 있음
    // for (const socket of this.players.values()) {
    //   socket.close();
    // }
  }

  /**
   * 이 세션의 모든 플레이어에게 메시지를 전송합니다.
   */
  broadcast(message: object) {
    const data = JSON.stringify(message);
    for (const socket of this.players.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }
}