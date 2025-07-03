// backend/srcs/websocket/TournamentWebsocketHandler.ts

import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { TournamentSession } from './TournamentSession';

export class TournamentWebSocketHandler {
  private sessions = new Map<string, TournamentSession>();

  constructor(private fastify: FastifyInstance) {}

  public async handleConnection(socket: WebSocket, request: FastifyRequest) {
    // URL에서 tournamentId와 userId 가져옴 (userId는 쿼리 파라미터로 받음)
    const { tournamentId } = request.params as { tournamentId: string };
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      this.fastify.log.error('User ID is missing.');
      socket.close(1008, 'User ID is required');
      return;
    }

    // 1. 세션을 찾거나 새로 생성합니다.
    let session = this.sessions.get(tournamentId);
    if (!session) {
      session = new TournamentSession(tournamentId, this.fastify);
      this.sessions.set(tournamentId, session);
      this.fastify.log.info(`[Handler] New session created for tournament: ${tournamentId}`);
    }

    // 2. userId로 playerId를 찾는다 (DB 조회)
    const participants = await (this.fastify as any).tournamentsRepository.getTournamentParticipants(Number(tournamentId));
    const participant = participants.find((p: any) => p.user_id === Number(userId));
    if (!participant) {
      this.fastify.log.error(`User ${userId} is not a participant of tournament ${tournamentId}`);
      socket.close(1008, 'User is not a participant of this tournament');
      return;
    }
    const playerId = participant.id;

    // 3. 플레이어를 세션에 추가
    session.addPlayer(playerId, socket);

    // 연결이 끊어졌을 때 세션이 비면 맵에서 제거
    socket.on('close', () => {
      if (session?.players.size === 0) {
        this.sessions.delete(tournamentId);
        this.fastify.log.info(`[Handler] Session for tournament ${tournamentId} is empty and has been removed.`);
      }
    });
  }
}