import { FastifyInstance } from 'fastify';
import process from 'process';

/**
 * 토너먼트 비정상 종료 처리를 위한 유틸리티 함수들
 */

/**
 * 서버 시작 시 미완료된 토너먼트들을 정리하는 함수
 */
export async function cleanupIncompleteTournaments(fastify: FastifyInstance): Promise<void> {
  try {
    console.log('=== [ Cleaning up incomplete tournaments ] ===');
    
    // 진행 중이거나 대기 중인 토너먼트들 조회
    const incompleteTournaments = await fastify.knex('tournaments')
      .whereIn('status', ['waiting', 'in-progress'])
      .select('id', 'status', 'created_at');
    
    if (incompleteTournaments.length === 0) {
      console.log('No incomplete tournaments found.');
      return;
    }
    
    console.log(`Found ${incompleteTournaments.length} incomplete tournaments. Marking as canceled...`);
    
    // 각 토너먼트에 대해 처리
    for (const tournament of incompleteTournaments) {
      const tournamentId = tournament.id;
      
      // 토너먼트 상태를 canceled로 업데이트
      await fastify.knex('tournaments')
        .where('id', tournamentId)
        .update({
          status: 'canceled',
          ended_at: new Date().toISOString()
        });
      
      // 해당 토너먼트의 미완료 게임들도 canceled로 업데이트
      const updatedGames = await fastify.knex('tournament_matches')
        .where('tournament_id', tournamentId)
        .whereIn('status', ['waiting', 'playing', 'countdown'])
        .update({
          status: 'canceled',
          ended_at: new Date().toISOString()
        });
      
      console.log(`Tournament ${tournamentId}: ${updatedGames} games marked as canceled`);
    }
    
    console.log('Cleanup completed successfully.');
  } catch (error) {
    console.error('Error during tournament cleanup:', error);
    throw error;
  }
}

/**
 * 서버 종료 시 토너먼트를 정리하는 함수 (graceful shutdown용)
 */
export async function gracefulTournamentCleanup(fastify: FastifyInstance): Promise<void> {
  try {
    console.log('=== [ Server shutdown: Cleaning up active tournaments ] ===');
    
    // 진행 중이거나 대기 중인 토너먼트들 조회
    const activeTournaments = await fastify.knex('tournaments')
      .whereIn('status', ['waiting', 'in-progress'])
      .select('id', 'status');
    
    if (activeTournaments.length > 0) {
      console.log(`Found ${activeTournaments.length} active tournaments. Marking as canceled...`);
      
      // 토너먼트 상태를 canceled로 업데이트
      await fastify.knex('tournaments')
        .whereIn('status', ['waiting', 'in-progress'])
        .update({
          status: 'canceled',
          ended_at: new Date().toISOString()
        });
      
      // 해당 토너먼트들의 미완료 게임들도 canceled로 업데이트
      for (const tournament of activeTournaments) {
        await fastify.knex('tournament_matches')
          .where('tournament_id', tournament.id)
          .whereIn('status', ['waiting', 'playing', 'countdown'])
          .update({
            status: 'canceled',
            ended_at: new Date().toISOString()
          });
      }
      
      console.log('Tournament cleanup on shutdown completed.');
    } else {
      console.log('No active tournaments to cleanup.');
    }
  } catch (cleanupError) {
    console.error('Error during tournament cleanup on shutdown:', cleanupError);
  }
}

/**
 * 긴급 상황에서 토너먼트를 정리하는 함수 (프로세스 종료 신호 처리용)
 */
export async function emergencyTournamentCleanup(fastify: FastifyInstance, signal: string): Promise<void> {
  console.log(`\n=== [ Received ${signal}: Emergency tournament cleanup ] ===`);
  try {
    // 진행 중인 토너먼트들 긴급 정리
    const activeTournaments = await fastify.knex('tournaments')
      .whereIn('status', ['waiting', 'in-progress'])
      .select('id');
    
    if (activeTournaments.length > 0) {
      console.log(`Emergency cleanup: ${activeTournaments.length} tournaments`);
      
      await fastify.knex('tournaments')
        .whereIn('status', ['waiting', 'in-progress'])
        .update({
          status: 'canceled',
          ended_at: new Date().toISOString()
        });
      
      for (const tournament of activeTournaments) {
        await fastify.knex('tournament_matches')
          .where('tournament_id', tournament.id)
          .whereIn('status', ['waiting', 'playing', 'countdown'])
          .update({
            status: 'canceled',
            ended_at: new Date().toISOString()
          });
      }
      
      console.log('Emergency tournament cleanup completed.');
    }
  } catch (error) {
    console.error('Error during emergency cleanup:', error);
  } finally {
    process.exit(0);
  }
}
