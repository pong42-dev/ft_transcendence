// backend/srcs/websocket/TournamentWebsocketHandler.ts

import { FastifyInstance, FastifyRequest } from 'fastify';
import WebSocket from 'ws';
import { TournamentSession } from './TournamentSession';

export class TournamentWebSocketHandler {
  private sessions = new Map<string, TournamentSession>();

  constructor(private fastify: FastifyInstance) {}

  public async handleConnection(socket: WebSocket, request: FastifyRequest) {
    // URL에서 tournamentId와 userId 가져옴
    const { tournamentId } = (request as any).params as { tournamentId: string };
    const { userId } = (request as any).query as { userId?: string };

    // 입력 데이터 검증 및 정제
    if (!userId || !/^\d+$/.test(userId)) {
      (this.fastify as any).log.error('Invalid or missing User ID.');
      socket.close(1008, 'Valid User ID is required');
      return;
    }

    if (!tournamentId || !/^\d+$/.test(tournamentId)) {
      (this.fastify as any).log.error('Invalid or missing Tournament ID.');
      socket.close(1008, 'Valid Tournament ID is required');
      return;
    }

    const numericUserId = parseInt(userId, 10);
    const numericTournamentId = parseInt(tournamentId, 10);

    // 토너먼트 참가자 검증
    try {
      const isParticipant = await this.verifyTournamentParticipant(numericTournamentId, numericUserId);
      if (!isParticipant) {
        (this.fastify as any).log.error(`User ${numericUserId} is not a participant in tournament ${numericTournamentId}`);
        socket.close(1008, 'User is not a participant in this tournament');
        return;
      }
    } catch (error) {
      (this.fastify as any).log.error('Error verifying tournament participant:', error);
      socket.close(1011, 'Server error during authentication');
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
    await session.addPlayer(numericUserId, socket);
    (this.fastify as any).log.info(`[Handler] User ${userId} connected to tournament ${tournamentId}`);

    // TournamentSession에서 이미 close 이벤트를 처리하므로 여기서는 중복 처리하지 않음
  }

  /**
   * 토너먼트 참가자 검증 - tournament_matches의 participant 컬럼 사용
   */
  private async verifyTournamentParticipant(tournamentId: number, userId: number): Promise<boolean> {
    try {
      // 해당 user_id를 가진 플레이어 찾기
      const player = await (this.fastify as any).knex('players')
        .where('user_id', userId)
        .first();
      
      if (!player) {
        (this.fastify as any).log.warn(`Player not found for user_id: ${userId}`);
        return false;
      }
      
      // tournament_matches에서 해당 플레이어가 참가자로 등록되어 있는지 확인
      const participantMatch = await (this.fastify as any).knex('tournament_matches')
        .where('tournament_id', tournamentId)
        .where(function() {
          this.where('participant_1_id', player.id)
            .orWhere('participant_2_id', player.id);
        })
        .first();
      
      const isParticipant = !!participantMatch;
      (this.fastify as any).log.info(`User ${userId} (player ${player.id}) participation verification: ${isParticipant}`);
      
      return isParticipant;
    } catch (error) {
      (this.fastify as any).log.error('Database error during participant verification:', error);
      return false;
    }
  }
}