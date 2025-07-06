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

    // 2. 모든 참가자 조회 (사용자 + 게스트)
    const participants = await (this.fastify as any).tournamentsRepository.getTournamentParticipants(Number(tournamentId));
    this.fastify.log.info(`[Handler] All participants for tournament ${tournamentId}:`, participants);
    
    // 3. 모든 참가자를 세션에 추가 (1vs1 게임과 같은 방식)
    participants.forEach((participant: any) => {
      session.addPlayer(participant.id, socket);
      this.fastify.log.info(`[Handler] Added Player ${participant.id} (${participant.name}) to tournament session`);
    });
    
    this.fastify.log.info(`[Handler] User ${userId} connected to tournament ${tournamentId} with ${participants.length} participants`);

    // 연결이 끊어졌을 때 세션이 비면 맵에서 제거
    socket.on('close', () => {
      // 세션에서 플레이어 제거
      session?.removePlayer(Number(userId));
      
      // 세션이 비었는지 확인 (players Map의 크기를 직접 확인할 수 없으므로 다른 방법 사용)
      setTimeout(() => {
        // 세션이 비었는지 확인하는 로직을 추가할 수 있음
        // 현재는 단순히 세션을 유지
      }, 1000);
    });
  }
}