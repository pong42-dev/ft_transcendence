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
	participant_1_id?: number;
	participant_2_id?: number;
	winner_id?: number;
	status: 'waiting' | 'countdown' | 'playing' | 'finished' | 'canceled';
	started_at?: string;
	ended_at?: string;
	game_session_id?: string; // GameManager의 게임 세션 ID
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

	const updateNextMatchPlayers = async (tournamentId: number, winnerId: number, trx?: Knex.Transaction): Promise<void> => {
		try {
			if (trx) {
				// 트랜잭션이 제공된 경우 트랜잭션 사용
				await updateNextMatchPlayersWithTransaction(trx, tournamentId, winnerId);
			} else {
				// 트랜잭션이 없는 경우 새 트랜잭션 생성
				const transaction = await knex.transaction();
				try {
					await updateNextMatchPlayersWithTransaction(transaction, tournamentId, winnerId);
					await transaction.commit();
				} catch (error) {
					await transaction.rollback();
					throw error;
				}
			}
		} catch (err: any) {
			console.error('Error updating next match players:', err.message);
			throw err;
		}
	};

	const updateNextMatchPlayersWithTransaction = async (trx: Knex.Transaction, tournamentId: number, winnerId: number): Promise<void> => {
		// 완료된 4강전 조회
		const completedSemifinals = await trx('tournament_matches')
			.where({
				tournament_id: tournamentId,
				round_number: 1,
				status: 'finished'
			})
			.orderBy('id', 'asc');

		// 4강전이 모두 완료되었으면 결승전 참가자 업데이트
		if (completedSemifinals.length === 2) {
			const finalMatch = await trx('tournament_matches')
				.where({
					tournament_id: tournamentId,
					round_number: 2
				})
				.first();

			if (finalMatch) {
				const winners = completedSemifinals.map(m => m.winner_id);
				
				await trx('tournament_matches')
					.where('id', finalMatch.id)
					.update({
						participant_1_id: winners[0],
						participant_2_id: winners[1]
					});

				console.log(`Final match ${finalMatch.id} players updated: ${winners.join(' vs ')}`);
			}
		}
	};

	const getMatchById = async (matchId: number): Promise<TournamentMatch | null> => {
		const trx = await knex.transaction();
		
		try {
			const match = await trx('tournament_matches')
				.where('id', matchId)
				.first();

			if (!match) {
				await trx.rollback();
				return null;
			}

			// 참가자 정보 조회 - tournament_matches의 participant 컬럼 사용
			const participants = [];
			
			// participant_1_id가 있으면 조회
			if (match.participant_1_id) {
				const p1 = await trx('players as p')
					.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
					.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'up.name as user_name', 'up.avatar')
					.where('p.id', match.participant_1_id)
					.first();
				
				if (p1) {
					const name = p1.type === 'user' && p1.user_name ? p1.user_name : p1.display_name;
					const defaultAvatar = `http://localhost:3000/public/default-avatar.png`;
					const avatarUrl = p1.avatar ? `http://localhost:3000/${p1.avatar}` : defaultAvatar;
					
					participants.push({
						id: p1.id,
						type: p1.type,
						user_id: p1.user_id,
						display_name: name,
						score: 0, // 게임 시작 전이므로 기본값
						avatarUrl: avatarUrl
					});
				}
			}
			
			// participant_2_id가 있으면 조회
			if (match.participant_2_id) {
				const p2 = await trx('players as p')
					.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
					.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'up.name as user_name', 'up.avatar')
					.where('p.id', match.participant_2_id)
					.first();
				
				if (p2) {
					const name = p2.type === 'user' && p2.user_name ? p2.user_name : p2.display_name;
					const defaultAvatar = `http://localhost:3000/public/default-avatar.png`;
					const avatarUrl = p2.avatar ? `http://localhost:3000/${p2.avatar}` : defaultAvatar;
					
					participants.push({
						id: p2.id,
						type: p2.type,
						user_id: p2.user_id,
						display_name: name,
						score: 0, // 게임 시작 전이므로 기본값
						avatarUrl: avatarUrl
					});
				}
			}

			await trx.commit();
			return {
				...match,
				participants
			} as TournamentMatch;
		} catch (err: any) {
			await trx.rollback();
			console.error('Error getting match by ID:', err.message);
			throw err;
		}
	};

	return {
		/**
		 * 특정 매치 조회
		 */
		getMatchById,

		/**
		 * 토너먼트의 모든 매치 조회
		 */
		async getTournamentMatches(tournamentId: number): Promise<TournamentMatch[]> {
			try {
				const matches = await knex('tournament_matches')
					.where('tournament_id', tournamentId)
					.orderBy('round_number', 'asc')
					.orderBy('id', 'asc');

				// 각 매치의 참가자 정보 조회 - tournament_matches의 participant 컬럼 사용
				const matchesWithParticipants = await Promise.all(
					matches.map(async (match) => {
						const participants = [];
						
						// participant_1_id가 있으면 조회
						if (match.participant_1_id) {
							const p1 = await knex('players as p')
								.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
								.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'up.name as user_name', 'up.avatar')
								.where('p.id', match.participant_1_id)
								.first();
							
							if (p1) {
								const name = p1.type === 'user' && p1.user_name ? p1.user_name : p1.display_name;
								const defaultAvatar = `http://localhost:3000/public/default-avatar.png`;
								const avatarUrl = p1.avatar ? `http://localhost:3000/${p1.avatar}` : defaultAvatar;
								
								participants.push({
									id: p1.id,
									type: p1.type,
									user_id: p1.user_id,
									display_name: name,
									score: 0, // 스코어는 게임에서 관리
									avatarUrl: avatarUrl
								});
							}
						}
						
						// participant_2_id가 있으면 조회
						if (match.participant_2_id) {
							const p2 = await knex('players as p')
								.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
								.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'up.name as user_name', 'up.avatar')
								.where('p.id', match.participant_2_id)
								.first();
							
							if (p2) {
								const name = p2.type === 'user' && p2.user_name ? p2.user_name : p2.display_name;
								const defaultAvatar = `http://localhost:3000/public/default-avatar.png`;
								const avatarUrl = p2.avatar ? `http://localhost:3000/${p2.avatar}` : defaultAvatar;
								
								participants.push({
									id: p2.id,
									type: p2.type,
									user_id: p2.user_id,
									display_name: name,
									score: 0, // 스코어는 게임에서 관리
									avatarUrl: avatarUrl
								});
							}
						}
						
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
				const matches = await knex('tournament_matches')
					.where({
						tournament_id: tournamentId,
						round_number: roundNumber
					})
					.orderBy('id', 'asc');

				// 각 매치의 참가자 정보 조회 - tournament_matches의 participant 컬럼 사용
				const matchesWithParticipants = await Promise.all(
					matches.map(async (match) => {
						const participants = [];
						
						// participant_1_id가 있으면 조회
						if (match.participant_1_id) {
							const p1 = await knex('players as p')
								.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
								.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'up.name as user_name', 'up.avatar')
								.where('p.id', match.participant_1_id)
								.first();
							
							if (p1) {
								const name = p1.type === 'user' && p1.user_name ? p1.user_name : p1.display_name;
								const defaultAvatar = `http://localhost:3000/public/default-avatar.png`;
								const avatarUrl = p1.avatar ? `http://localhost:3000/${p1.avatar}` : defaultAvatar;
								
								participants.push({
									id: p1.id,
									type: p1.type,
									user_id: p1.user_id,
									display_name: name,
									score: 0, // 스코어는 게임에서 관리
									avatarUrl: avatarUrl
								});
							}
						}
						
						// participant_2_id가 있으면 조회
						if (match.participant_2_id) {
							const p2 = await knex('players as p')
								.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
								.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'up.name as user_name', 'up.avatar')
								.where('p.id', match.participant_2_id)
								.first();
							
							if (p2) {
								const name = p2.type === 'user' && p2.user_name ? p2.user_name : p2.display_name;
								const defaultAvatar = `http://localhost:3000/public/default-avatar.png`;
								const avatarUrl = p2.avatar ? `http://localhost:3000/${p2.avatar}` : defaultAvatar;
								
								participants.push({
									id: p2.id,
									type: p2.type,
									user_id: p2.user_id,
									display_name: name,
									score: 0, // 스코어는 게임에서 관리
									avatarUrl: avatarUrl
								});
							}
						}
						
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
			const trx = await knex.transaction();
			
			try {
				const updateData: any = { status };
				
				if (status === 'playing') {
					updateData.started_at = new Date().toISOString();
				} else if (status === 'finished' && winnerId) {
					updateData.winner_id = winnerId;
					updateData.ended_at = new Date().toISOString();
					console.log(`[DEBUG updateMatchStatus] Adding winner_id to updateData: ${winnerId}`);
				} else if (status === 'finished' && !winnerId) {
					console.log(`[DEBUG updateMatchStatus] WARNING: status is finished but winnerId is null/undefined`);
				}

				console.log(`[DEBUG updateMatchStatus] Final updateData:`, JSON.stringify(updateData));

				const result = await trx('tournament_matches')
					.where('id', matchId)
					.update(updateData);

				await trx.commit();
				console.log(`[DEBUG updateMatchStatus] Update result: ${result} rows affected`);
				console.log(`Match ${matchId} status updated to: ${status}`);
			} catch (err: any) {
				await trx.rollback();
				console.error('Error updating match status:', err.message);
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
				const match = await trx('tournament_matches')
					.where('id', matchId)
					.first();

				if (!match) {
					throw new Error(`Match ${matchId} not found`);
				}

				// 2. 매치 참가자 조회 - tournament_matches의 participant 컬럼 사용
				const participants = [];
				
				if (match.participant_1_id) {
					const p1 = await trx('players')
						.where('id', match.participant_1_id)
						.select('id', 'display_name', 'user_id')
						.first();
					if (p1) participants.push(p1);
				}
				
				if (match.participant_2_id) {
					const p2 = await trx('players')
						.where('id', match.participant_2_id)
						.select('id', 'display_name', 'user_id')
						.first();
					if (p2) participants.push(p2);
				}

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
				await trx('tournament_matches')
					.where('id', matchId)
					.update({
						status: 'finished',
						winner_id: winnerId,
						ended_at: new Date().toISOString()
					});

				// 5. 4강전인 경우 다음 라운드 준비
				if (match.round_number === 1) {
					await updateNextMatchPlayers(match.tournament_id, winnerId, trx);
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
		 * Note: 이 메서드는 deprecated - updateNextMatchPlayers로 대체됨
		 */
		async prepareFinalMatch(trx: Knex.Transaction, tournamentId: number, winnerId: number): Promise<void> {
			// 1. 이미 완료된 4강전 매치들 조회
			const completedSemifinals = await trx('tournament_matches')
				.where({
					tournament_id: tournamentId,
					round_number: 1,
					status: 'finished'
				})
				.orderBy('id', 'asc');

			// 2. 4강전이 모두 완료되었는지 확인
			if (completedSemifinals.length === 2) {
				// 3. 결승전 매치 찾기
				const finalMatch = await trx('tournament_matches')
					.where({
						tournament_id: tournamentId,
						round_number: 2
					})
					.first();

				if (finalMatch) {
					// 4. 결승전 참가자 등록 - tournament_matches의 participant 컬럼 사용
					const winners = completedSemifinals.map(m => m.winner_id);
					
					await trx('tournament_matches')
						.where('id', finalMatch.id)
						.update({
							participant_1_id: winners[0],
							participant_2_id: winners[1]
						});

					console.log(`Final match prepared for tournament ${tournamentId}: ${winners.join(' vs ')}`);
				}
			}
		},

		/**
		 * 결승전 매치 생성 (4강전 승자들로)
		 * Note: 이 메서드는 deprecated - 브래킷 생성 시 모든 매치가 미리 생성됨
		 */
		async createFinalMatch(
			tournamentId: number, 
			winner1Id: number, 
			winner2Id: number
		): Promise<number> {
			const trx = await knex.transaction();
			
			try {
				// 결승전 매치 생성
				const [finalMatchId] = await trx('tournament_matches').insert({
					tournament_id: tournamentId,
					round_number: 2,
					participant_1_id: winner1Id,
					participant_2_id: winner2Id,
					winner_id: null,
					status: 'waiting',
					started_at: null,
					ended_at: null
				});

				await trx.commit();
				
				console.log(`Final match created for tournament ${tournamentId}. Match ID: ${finalMatchId}`);
				return finalMatchId;
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
			const trx = await knex.transaction();
			
			try {
				await trx('tournaments')
					.where('id', tournamentId)
					.update({
						winner_player_id: winnerPlayerId,
						status: 'ended',
						ended_at: new Date().toISOString()
					});

				await trx.commit();
				console.log(`Tournament ${tournamentId} winner set to player ${winnerPlayerId}`);
			} catch (err: any) {
				await trx.rollback();
				console.error('Error setting tournament winner:', err.message);
				throw err;
			}
		},

		/**
		 * 다음 매치 조회 (대기 중인 매치)
		 */
		async getNextPendingMatch(tournamentId: number): Promise<TournamentMatch | null> {
			try {
				const nextMatch = await knex('tournament_matches')
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

				// getMatchById를 사용하여 참가자 정보도 함께 조회
				return getMatchById(nextMatch.id);
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
				const currentMatch = await knex('tournament_matches')
					.where({
						tournament_id: tournamentId,
						status: 'playing'
					})
					.first();

				if (!currentMatch) {
					return null;
				}

				// getMatchById를 사용하여 참가자 정보도 함께 조회
				return getMatchById(currentMatch.id);
			} catch (err: any) {
				console.error('Error getting current match:', err.message);
				throw err;
			}
		},

		/**
		 * 매치 시작 (countdown 상태로 변경)
		 */
		async startMatch(matchId: number): Promise<void> {
			const trx = await knex.transaction();
			
			try {
				await trx('tournament_matches')
					.where('id', matchId)
					.update({
						status: 'countdown',
						started_at: new Date().toISOString()
					});

				await trx.commit();
				console.log(`Match ${matchId} started (countdown)`);
			} catch (err: any) {
				await trx.rollback();
				console.error('Error starting match:', err.message);
				throw err;
			}
		},

		/**
		 * 다음 라운드 매치의 참가자 업데이트 (4강전 승자를 결승전에 배치)
		 */
		updateNextMatchPlayers,

		/**
		 * 토너먼트 매치에 게임 세션 ID 연결
		 */
		async linkGameSession(matchId: number, gameSessionId: string): Promise<void> {
			const trx = await knex.transaction();
			
			try {
				await trx('tournament_matches')
					.where('id', matchId)
					.update({
						game_session_id: gameSessionId,
						status: 'playing',
						started_at: new Date().toISOString()
					});
				
				await trx.commit();
				(fastify as any).log.info(`Game session ${gameSessionId} linked to match ${matchId}`);
			} catch (error: any) {
				await trx.rollback();
				(fastify as any).log.error(`Error linking game session to match ${matchId}:`, error);
				throw error;
			}
		},

		/**
		 * 게임 세션 ID로 매치 조회
		 */
		async getMatchByGameSessionId(gameSessionId: string): Promise<TournamentMatch | null> {
			try {
				const match = await knex('tournament_matches')
					.where('game_session_id', gameSessionId)
					.first();

				if (!match) {
					return null;
				}

				// 참가자 정보도 함께 조회
				return getMatchById(match.id);
			} catch (error: any) {
				(fastify as any).log.error(`Error getting match by game session ID ${gameSessionId}:`, error);
				throw error;
			}
		},

		/**
		 * 매치의 게임 세션 ID 조회
		 */
		async getGameSessionId(matchId: number): Promise<string | null> {
			try {
				const match = await knex('tournament_matches')
					.where('id', matchId)
					.select('game_session_id')
					.first();

				return match?.game_session_id || null;
			} catch (error: any) {
				(fastify as any).log.error(`Error getting game session ID for match ${matchId}:`, error);
				throw error;
			}
		},
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = createMatchesRepository(fastify);
		(fastify as any).decorate('matchesRepository', repo);
	},
	{
		name: 'matches-repository',
		dependencies: ['knex']
	}
);
