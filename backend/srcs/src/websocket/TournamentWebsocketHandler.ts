// backend/srcs/websocket/TournamentWebsocketHandler.ts

import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { TournamentSession } from './TournamentSession';

export class TournamentWebSocketHandler {
  private sessions = new Map<string, TournamentSession>();

  constructor(private fastify: FastifyInstance) {}

  public handleConnection(socket: WebSocket, request: FastifyRequest) {
    // URL에서 tournamentId와 playerId 가져옴 (playerId는 쿼리 파라미터로 받는다고 가정)
    // ex ) 클라이언트가 ws://.../ws/tournament/123?playerId=456처럼 쿼리 스트링으로 자신의 ID를 보내준다고 가정
    const { tournamentId } = request.params as { tournamentId: string };
    const { playerId } = request.query as { playerId?: string };

    if (!playerId) {
      this.fastify.log.error('Player ID is missing.');
      socket.close(1008, 'Player ID is required');
      return;
    }

    // 1. 세션을 찾거나 새로 생성합니다.
    let session = this.sessions.get(tournamentId);
    if (!session) {
      session = new TournamentSession(tournamentId, this.fastify);
      this.sessions.set(tournamentId, session);
      this.fastify.log.info(`[Handler] New session created for tournament: ${tournamentId}`);
    }

    // 2. 플레이어를 세션에 추가하는 것은 세션 객체의 책임입니다.
    session.addPlayer(parseInt(playerId, 10), socket);

    // 연결이 끊어졌을 때 세션이 비면 맵에서 제거
    socket.on('close', () => {
      if (session?.players.size === 0) {
        this.sessions.delete(tournamentId);
        this.fastify.log.info(`[Handler] Session for tournament ${tournamentId} is empty and has been removed.`);
      }
    });
  }
}