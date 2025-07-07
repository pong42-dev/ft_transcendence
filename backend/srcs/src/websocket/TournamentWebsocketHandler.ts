// backend/srcs/websocket/TournamentWebsocketHandler.ts

import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { TournamentSession } from './TournamentSession';

export class TournamentWebSocketHandler {
  private sessions = new Map<string, TournamentSession>();

  constructor(private fastify: FastifyInstance) {}

  public async handleConnection(socket: WebSocket, request: FastifyRequest) {
    // URL에서 tournamentId와 userId 가져옴
    const { tournamentId } = (request as any).params as { tournamentId: string };
    const { userId } = (request as any).query as { userId?: string };

    if (!userId) {
      (this.fastify as any).log.error('User ID is missing.');
      socket.close(1008, 'User ID is required');
      return;
    }

    // 1. 세션을 찾거나 새로 생성
    let session = this.sessions.get(tournamentId);
    if (!session) {
      session = new TournamentSession(tournamentId, this.fastify);
      this.sessions.set(tournamentId, session);
      (this.fastify as any).log.info(`[Handler] New session created for tournament: ${tournamentId}`);
    }

    // 단일 연결만 관리: 한 번만 addPlayer 호출
    session.addPlayer(Number(userId), socket);
    (this.fastify as any).log.info(`[Handler] User ${userId} connected to tournament ${tournamentId}`);

    // 연결이 끊어졌을 때 세션에서 플레이어 제거
    socket.on('close', () => {
      session?.removePlayer(Number(userId));
      // 세션이 비었는지 확인하는 로직은 필요시 추가
    });
  }
}