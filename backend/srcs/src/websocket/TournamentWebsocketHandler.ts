import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';

// 토너먼트 ID를 키로, 접속한 클라이언트 Set을 값으로 가짐
type TournamentId = string;
const tournamentSessions = new Map<TournamentId, Set<WebSocket>>();

export class TournamentWebSocketHandler {
  constructor(private fastify: FastifyInstance) {}

  public handleConnection(socket: WebSocket, request: FastifyRequest) {
    const { tournamentId } = request.params as { tournamentId: string };

    // 1. 이 토너먼트의 세션이 없으면 새로 생성
    if (!tournamentSessions.has(tournamentId)) {
      tournamentSessions.set(tournamentId, new Set());
    }

    // 2. 현재 연결을 해당 토너먼트 세션에 추가
    const session = tournamentSessions.get(tournamentId)!;
    session.add(socket);
    this.fastify.log.info(
      `[Tournament] Connection established for tournament: ${tournamentId}. Current participants: ${session.size}`
    );

    // 3. 연결이 끊겼을 때의 처리
    socket.on('close', () => {
      session.delete(socket);
      this.fastify.log.info(
        `[Tournament] Connection closed for tournament: ${tournamentId}. Remaining participants: ${session.size}`
      );
      // 세션에 아무도 없으면 맵에서 삭제하여 메모리 관리
      if (session.size === 0) {
        tournamentSessions.delete(tournamentId);
      }
    });

    // 4. 메시지 수신 처리 (지금은 로그만 남김)
    socket.on('message', (message) => {
      const messageString = message.toString();
      this.fastify.log.info(`[Tournament ${tournamentId}] MSG: ${messageString}`);
      
      // 받은 메시지를 클라이언트에게 다시 전송 (에코)
      socket.send(`Server received: ${messageString}`);
    });
  }
}