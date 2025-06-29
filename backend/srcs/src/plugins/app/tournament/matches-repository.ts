import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Knex } from 'knex';

declare module 'fastify' {
	interface FastifyInstance {
		matchesRepository: ReturnType<typeof createMatchesRepository>;
	}
}

export interface TournamentMatch {
	id: number;
	tournament_id: number;
	round_number: number;
	winner_id?: number;
	status: 'waiting' | 'countdown' | 'playing' | 'finished' | 'canceled';
	started_at?: string;
	ended_at?: string;
	participants: any[];
}

export interface MatchResult {
	match_id: number;
	winner_id: number;
	winner_name: string;
	loser_id: number;
	loser_name: string;
	round_number: number;
}

export function createMatchesRepository(fastify: FastifyInstance) {
	const knex: Knex = fastify.knex;

	return {
		/**
		 * 토너먼트의 모든 매치 조회
		 */
		async getTournamentMatches(tournamentId: number): Promise<TournamentMatch[]> {
			try {
				const matches = await knex('games')
					.where('tournament_id', tournamentId)
					.orderBy('round_number', 'asc')
					.orderBy('id', 'asc');

				// 각 매치의 참가자 정보 조회
				const matchesWithParticipants = await Promise.all(
					matches.map(async (match) => {
						const participants = await knex('game_participants as gp')
							.join('players as p', 'gp.player_id', 'p.id')
							.leftJoin('user_profiles as up', function() {
								this.on('p.user_id', '=', 'up.user_id');
							})
							.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'up.name as user_name', 'gp.score')
							.where('gp.game_id', match.id)
							.then(rows => rows.map(row => ({
								...row,
								display_name: row.type === 'user' && row.user_name ? row.user_name : row.display_name
							})));
						
						return {
							...match,
							participants
						};
					})
				);

				return matchesWithParticipants as TournamentMatch[];
			} catch (err: any) {
				console.error('Error getting tournament matches:', err.message);
				throw err;
			}
		},

		/**
		 * 특정 라운드의 매치들 조회
		 */
		async getMatchesByRound(tournamentId: number, roundNumber: number): Promise<TournamentMatch[]> {
			try {
				const matches = await knex('games')
					.where({
						tournament_id: tournamentId,
						round_number: roundNumber
					})
					.orderBy('id', 'asc');

				// 각 매치의 참가자 정보 조회
				const matchesWithParticipants = await Promise.all(
					matches.map(async (match) => {
						const participants = await knex('game_participants as gp')
							.join('players as p', 'gp.player_id', 'p.id')
							.leftJoin('user_profiles as up', function() {
								this.on('p.user_id', '=', 'up.user_id');
							})
							.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'up.name as user_name', 'gp.score')
							.where('gp.game_id', match.id)
							.then(rows => rows.map(row => ({
								...row,
								display_name: row.type === 'user' && row.user_name ? row.user_name : row.display_name
							})));
						
						return {
							...match,
							participants
						};
					})
				);

				return matchesWithParticipants as TournamentMatch[];
			} catch (err: any) {
				console.error('Error getting matches by round:', err.message);
				throw err;
			}
		},

		/**
		 * 매치 상태 업데이트
		 */
		async updateMatchStatus(
			matchId: number, 
			status: 'waiting' | 'countdown' | 'playing' | 'finished' | 'canceled',
			winnerId?: number
		): Promise<void> {
			try {
				const updateData: any = { status };
				
				if (status === 'playing') {
					updateData.started_at = new Date().toISOString();
				} else if (status === 'finished' && winnerId) {
					updateData.winner_id = winnerId;
					updateData.ended_at = new Date().toISOString();
				}

				await knex('games')
					.where('id', matchId)
					.update(updateData);

				console.log(`Match ${matchId} status updated to: ${status}`);
			} catch (err: any) {
				console.error('Error updating match status:', err.message);
				throw err;
			}
		},

		/**
		 * 매치 참가자 스코어 업데이트
		 */
		async updateMatchScore(
			matchId: number, 
			playerId: number, 
			score: number
		): Promise<void> {
			try {
				await knex('game_participants')
					.where({
						game_id: matchId,
						player_id: playerId
					})
					.update({ score });

				console.log(`Match ${matchId} player ${playerId} score updated to: ${score}`);
			} catch (err: any) {
				console.error('Error updating match score:', err.message);
				throw err;
			}
		},

		/**
		 * 매치 결과 처리 (승자 기록, 다음 라운드 준비)
		 */
		async processMatchResult(matchId: number, winnerId: number): Promise<MatchResult | null> {
			const trx = await knex.transaction();
			
			try {
				// 1. 매치 정보 조회
				const match = await trx('games')
					.where('id', matchId)
					.first();

				if (!match) {
					throw new Error(`Match ${matchId} not found`);
				}

				// 2. 매치 참가자 조회
				const participants = await trx('game_participants as gp')
					.join('players as p', 'gp.player_id', 'p.id')
					.select('p.id', 'p.display_name', 'p.user_id')
					.where('gp.game_id', matchId);

				if (participants.length !== 2) {
					throw new Error(`Match ${matchId} must have exactly 2 participants`);
				}

				// 3. 승자/패자 구분
				const winner = participants.find(p => p.id === winnerId);
				const loser = participants.find(p => p.id !== winnerId);

				if (!winner || !loser) {
					throw new Error(`Winner or loser not found in match ${matchId}`);
				}

				// 4. 매치 상태 업데이트
				await trx('games')
					.where('id', matchId)
					.update({
						status: 'finished',
						winner_id: winnerId,
						ended_at: new Date().toISOString()
					});

				// 5. 4강전인 경우 결승전 준비
				if (match.round_number === 1) {
					await this.prepareFinalMatch(trx, match.tournament_id, winnerId);
				} else if (match.round_number === 2) {
					// 결승전인 경우 토너먼트 종료
					await trx('tournaments')
						.where('id', match.tournament_id)
						.update({
							status: 'ended',
							winner_player_id: winnerId,
							ended_at: new Date().toISOString()
						});
				}

				await trx.commit();

				const result: MatchResult = {
					match_id: matchId,
					winner_id: winnerId,
					winner_name: winner.display_name || `User${winner.user_id}`,
					loser_id: loser.id,
					loser_name: loser.display_name || `User${loser.user_id}`,
					round_number: match.round_number
				};

				console.log(`Match ${matchId} result processed: ${result.winner_name} vs ${result.loser_name}`);
				return result;
			} catch (error) {
				await trx.rollback();
				throw error;
			}
		},

		/**
		 * 결승전 준비 (4강전 승자들을 결승전에 등록)
		 */
		async prepareFinalMatch(trx: Knex.Transaction, tournamentId: number, winnerId: number): Promise<void> {
			// 1. 이미 완료된 4강전 매치들 조회
			const completedSemifinals = await trx('games')
				.where({
					tournament_id: tournamentId,
					round_number: 1,
					status: 'finished'
				})
				.orderBy('id', 'asc');

			// 2. 4강전이 모두 완료되었는지 확인
			if (completedSemifinals.length === 2) {
				// 3. 결승전 매치 찾기
				const finalMatch = await trx('games')
					.where({
						tournament_id: tournamentId,
						round_number: 2
					})
					.first();

				if (finalMatch) {
					// 4. 결승전 참가자 등록
					const winners = completedSemifinals.map(m => m.winner_id);
					
					await trx('game_participants').insert([
						{ game_id: finalMatch.id, player_id: winners[0], score: 0 },
						{ game_id: finalMatch.id, player_id: winners[1], score: 0 }
					]);

					console.log(`Final match prepared for tournament ${tournamentId}: ${winners.join(' vs ')}`);
				}
			}
		},

		/**
		 * 결승전 매치 생성 (4강전 승자들로)
		 */
		async createFinalMatch(
			tournamentId: number, 
			winner1Id: number, 
			winner2Id: number
		): Promise<number> {
			const trx = await knex.transaction();
			
			try {
				// 결승전 게임 생성
				const [finalGameId] = await trx('games').insert({
					type: 'tournament',
					tournament_id: tournamentId,
					round_number: 2,
					winner_id: null,
					status: 'waiting',
					started_at: null,
					ended_at: null
				});

				// 결승전 참가자 등록
				await trx('game_participants').insert([
					{ game_id: finalGameId, player_id: winner1Id, score: 0 },
					{ game_id: finalGameId, player_id: winner2Id, score: 0 }
				]);

				await trx.commit();
				
				console.log(`Final match created for tournament ${tournamentId}. Game ID: ${finalGameId}`);
				return finalGameId;
			} catch (error) {
				await trx.rollback();
				throw error;
			}
		},

		/**
		 * 토너먼트 우승자 설정
		 */
		async setTournamentWinner(
			tournamentId: number, 
			winnerPlayerId: number
		): Promise<void> {
			try {
				await knex('tournaments')
					.where('id', tournamentId)
					.update({
						winner_player_id: winnerPlayerId,
						status: 'ended',
						ended_at: new Date().toISOString()
					});

				console.log(`Tournament ${tournamentId} winner set to player ${winnerPlayerId}`);
			} catch (err: any) {
				console.error('Error setting tournament winner:', err.message);
				throw err;
			}
		},

		/**
		 * 다음 매치 조회 (대기 중인 매치)
		 */
		async getNextPendingMatch(tournamentId: number): Promise<TournamentMatch | null> {
			try {
				const nextMatch = await knex('games')
					.where({
						tournament_id: tournamentId,
						status: 'waiting'
					})
					.orderBy('round_number', 'asc')
					.orderBy('id', 'asc')
					.first();

				if (!nextMatch) {
					return null;
				}

				// 참가자 정보 조회
				const participants = await knex('game_participants as gp')
					.join('players as p', 'gp.player_id', 'p.id')
					.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'gp.score')
					.where('gp.game_id', nextMatch.id);

				return {
					...nextMatch,
					participants
				} as TournamentMatch;
			} catch (err: any) {
				console.error('Error getting next pending match:', err.message);
				throw err;
			}
		},

		/**
		 * 현재 진행 중인 매치 조회
		 */
		async getCurrentMatch(tournamentId: number): Promise<TournamentMatch | null> {
			try {
				const currentMatch = await knex('games')
					.where({
						tournament_id: tournamentId,
						status: 'playing'
					})
					.first();

				if (!currentMatch) {
					return null;
				}

				// 참가자 정보 조회
				const participants = await knex('game_participants as gp')
					.join('players as p', 'gp.player_id', 'p.id')
					.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'gp.score')
					.where('gp.game_id', currentMatch.id);

				return {
					...currentMatch,
					participants
				} as TournamentMatch;
			} catch (err: any) {
				console.error('Error getting current match:', err.message);
				throw err;
			}
		},

		/**
		 * 매치 시작 (countdown 상태로 변경)
		 */
		async startMatch(matchId: number): Promise<void> {
			try {
				await knex('games')
					.where('id', matchId)
					.update({
						status: 'countdown',
						started_at: new Date().toISOString()
					});

				console.log(`Match ${matchId} started (countdown)`);
			} catch (err: any) {
				console.error('Error starting match:', err.message);
				throw err;
			}
		}
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = createMatchesRepository(fastify);
		fastify.decorate('matchesRepository', repo);
	},
	{
		name: 'matches-repository',
		dependencies: ['knex']
	}
);
