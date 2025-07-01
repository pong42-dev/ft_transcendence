//참가자 관리, 모든 참가자에게 브로드캐스트
import { WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { WSTournamentStartMessage, WSTournamentBracketMessage, TournamentBracket } from '../src/schemas/tournament-websocket';

type PlayerId = number; // 실제 프로젝트에 맞는 타입으로 변경 가능

export class TournamentSession {
  private players = new Map<PlayerId, WebSocket>();
  public status: 'waiting' | 'in_progress' | 'finished' = 'waiting';

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
    let parsed: WSTournamentStartMessage | any;
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
      // TODO: 다른 타입 메시지 분기 추가
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
      roundsMap.get(match.round_number)!.push({
        matchId: String(match.id),
        player1: {
          id: match.participants[0].id,
          name: match.participants[0].name,
        },
        player2: {
          id: match.participants[1].id,
          name: match.participants[1].name,
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