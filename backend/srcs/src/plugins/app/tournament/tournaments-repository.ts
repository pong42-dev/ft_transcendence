import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Knex } from 'knex';

declare module 'fastify' {
	interface FastifyInstance {
		tournamentsRepository: ReturnType<typeof createTournamentsRepository>;
	}
}

export interface Tournament {
	id: number;
	status: 'waiting' | 'in-progress' | 'ended' | 'canceled';
	winner_player_id?: number;
	created_at: string;
	ended_at?: string;
}

export interface TournamentWithDetails extends Tournament {
	participants: any[];
	matches: any[];
}

export interface TournamentMatchInfo {
	id: number;
	round_number: number;
	status: string;
	participants: {
		id: number;
		display_name: string;
		user_id?: number;
	}[];
	winner_id?: number;
	started_at?: string;
}

export interface TournamentProgress {
	tournament_id: number;
	status: string;
	current_match?: TournamentMatchInfo;
	next_matches: TournamentMatchInfo[];
	completed_matches: TournamentMatchInfo[];
	participants: {
		id: number;
		display_name: string;
		user_id?: number;
		eliminated: boolean;
	}[];
}

export interface UserTournamentHistory {
	tournament_id: number;
	tournament_date: string;
	participants: string[];
	user_rounds: {
		round_number: number;
		opponents: string[];
		result: 'win' | 'lose' | 'champion' | 'runner_up';
	}[];
	final_rank: number;
}

export function createTournamentsRepository(fastify: FastifyInstance) {
	const knex: Knex = fastify.knex;

	return {
		/**
		 * 토너먼트 생성
		 */
		async createTournament(): Promise<number> {
			const trx = await knex.transaction();
			
			try {
				const [tournamentId] = await trx('tournaments').insert({
					status: 'waiting',
					winner_player_id: null,
					created_at: new Date().toISOString(),
					ended_at: null
				});

				await trx.commit();
				return tournamentId;
			} catch (err: any) {
				await trx.rollback();
				console.error('Error creating tournament:', err);
				console.error('Error stack:', err.stack);
				console.error('Error message:', err.message);
				throw err;
			}
		},

		/**
		 * 토너먼트 참가자 등록 (players 테이블에 먼저 등록 후 game_participants에 연결)
		 */
		async addTournamentParticipant(
			tournamentId: number,
			playerType: 'user' | 'guest',
			userId?: number,
			displayName?: string
		): Promise<number> {
			// 입력 검증
			if (!tournamentId || typeof tournamentId !== 'number' || tournamentId <= 0) {
				throw new Error('Invalid tournament ID');
			}
		if (playerType !== 'user' && playerType !== 'guest') {
			throw new Error('Invalid player type');
		}

			if (playerType === 'user') {
				if (!userId || typeof userId !== 'number' || userId <= 0) {
					throw new Error('Valid user ID is required for user type participant');
				}
			}

			if (playerType === 'guest') {
				if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
					throw new Error('Valid display name is required for guest participant');
				}
				
				// 게스트 이름 정제 및 검증
				displayName = displayName.trim();
				if (displayName.length > 50 || displayName.length < 2) {
					throw new Error('Display name must be between 2 and 50 characters');
				}
				
				// 특수문자 및 HTML 태그 제거
				const sanitizedName = displayName.replace(/<[^>]*>/g, '').replace(/[<>\"'&]/g, '');
				if (sanitizedName !== displayName) {
					throw new Error('Display name contains invalid characters');
				}
			}

			const trx = await knex.transaction();

			try {
				let playerId: number;

				if (playerType === 'user' && userId) {
					// 기존 플레이어가 있는지 확인
					const existingPlayer = await trx('players')
						.where('user_id', userId)
						.first();

					if (existingPlayer) {
						playerId = existingPlayer.id;
						console.log(`Using existing player for user ${userId}: ${playerId}`);
					} else {
						// 새 플레이어 생성
						const [newPlayerId] = await trx('players').insert({
							type: playerType,
							user_id: userId,
							created_at: new Date().toISOString()
						});
						playerId = newPlayerId;
						console.log(`Created new player for user ${userId}: ${playerId}`);
					}
				} else if (playerType === 'guest' && displayName) {
					// 게스트는 항상 새로 생성 (display_name은 unique가 아님)
					const [newPlayerId] = await trx('players').insert({
						type: playerType,
						display_name: displayName,
						created_at: new Date().toISOString()
					});
					playerId = newPlayerId;
					console.log(`Created new guest player: ${playerId}`);			} else {
				throw new Error('Invalid player data');
			}

			console.log(`Participant added to tournament ${tournamentId}. Player ID: ${playerId}`);
			return playerId;
			} catch (error) {
				await trx.rollback();
				throw error;
			}
		},

		/**
		 * 토너먼트 참가자 등록 (트랜잭션 버전)
		 */
		async addTournamentParticipantWithTransaction(
			trx: Knex.Transaction,
			tournamentId: number,
			playerType: 'user' | 'guest',
			userId?: number,
			displayName?: string
		): Promise<number> {
			// 입력 검증
			if (!tournamentId || typeof tournamentId !== 'number' || tournamentId <= 0) {
				throw new Error('Invalid tournament ID');
			}

			if (playerType !== 'user' && playerType !== 'guest') {
				throw new Error('Invalid player type');
			}

			if (playerType === 'user') {
				if (!userId || typeof userId !== 'number' || userId <= 0) {
					throw new Error('Valid user ID is required for user type participant');
				}
			}

			if (playerType === 'guest') {
				if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
					throw new Error('Valid display name is required for guest participant');
				}
				
				// 게스트 이름 정제 및 검증
				displayName = displayName.trim();
				if (displayName.length > 50 || displayName.length < 2) {
					throw new Error('Display name must be between 2 and 50 characters');
				}
				
				// 특수문자 및 HTML 태그 제거
				const sanitizedName = displayName.replace(/<[^>]*>/g, '').replace(/[<>\"'&]/g, '');
				if (sanitizedName !== displayName) {
					throw new Error('Display name contains invalid characters');
				}
			}

			let playerId: number;

			if (playerType === 'user' && userId) {
				// 기존 플레이어가 있는지 확인
				const existingPlayer = await trx('players')
					.where('user_id', userId)
					.first();

				if (existingPlayer) {
					playerId = existingPlayer.id;
					console.log(`Using existing player for user ${userId}: ${playerId}`);
				} else {
					// 새 플레이어 생성
					const [newPlayerId] = await trx('players').insert({
						type: playerType,
						user_id: userId,
						created_at: new Date().toISOString()
					});
					playerId = newPlayerId;
					console.log(`Created new player for user ${userId}: ${playerId}`);
				}
			} else if (playerType === 'guest' && displayName) {
				// 게스트는 항상 새로 생성 (display_name은 unique가 아님)
				const [newPlayerId] = await trx('players').insert({
					type: playerType,
					display_name: displayName,
					created_at: new Date().toISOString()
				});
				playerId = newPlayerId;
				console.log(`Created new guest player: ${playerId}`);
			} else {
				throw new Error('Invalid player data');
			}

			console.log(`Participant added to tournament ${tournamentId}. Player ID: ${playerId}`);
			return playerId;
		},

		/**
		 * 초기 대진표 생성 (4명 토너먼트)
		 * 반환값: [게임1, 게임2, 결승게임] 형태의 게임 ID 배열
		 */
		async generateTournamentBracket(tournamentId: number, playerIds: number[]): Promise<number[]> {
			const trx = await knex.transaction();

			try {
				// 1. 기존 토너먼트 매치들 조회
				const existingMatches = await trx('tournament_matches')
					.where('tournament_id', tournamentId);

				// 2. 기존 게임들 삭제 (새로운 대진표를 위해)
				if (existingMatches.length > 0) {
					await trx('tournament_matches')
						.where('tournament_id', tournamentId)
						.del();
				}

				// 3. playerIds 배열에서 참가자 정보 조회
				if (!playerIds || playerIds.length !== 4) {
					throw new Error(`Tournament must have exactly 4 participants. Received: ${playerIds?.length || 0}`);
				}

				const participants = await trx('players')
					.whereIn('id', playerIds)
					.select('id as player_id', 'type', 'user_id', 'display_name');

				// 원래 순서 유지
				participants.sort((a, b) => playerIds.indexOf(a.player_id) - playerIds.indexOf(b.player_id));

				// 4. 참가자 목록 검증
				if (participants.length !== 4) {
					throw new Error(`Tournament must have exactly 4 participants. Current: ${participants.length}`);
				}

				// 5. 토너먼트 상태를 'in-progress'로 변경
				await trx('tournaments')
					.where('id', tournamentId)
					.update({ status: 'in-progress' });

				// 6. 4강전 게임 생성 (2개)
				const semifinalGames: number[] = [];

				// 게임 1: 참가자 1 vs 참가자 2
				const [game1Id] = await trx('tournament_matches').insert({
					type: 'tournament',
					tournament_id: tournamentId,
					round_number: 1,
					winner_id: null,
					status: 'waiting',
					started_at: null,
					ended_at: null,
					participant_1_id: participants[0].player_id,
					participant_2_id: participants[1].player_id
				});
				semifinalGames.push(game1Id);

				// 게임 2: 참가자 3 vs 참가자 4
				const [game2Id] = await trx('tournament_matches').insert({
					type: 'tournament',
					tournament_id: tournamentId,
					round_number: 1,
					winner_id: null,
					status: 'waiting',
					started_at: null,
					ended_at: null,
					participant_1_id: participants[2].player_id,
					participant_2_id: participants[3].player_id
				});
				semifinalGames.push(game2Id);

				// 7. 결승전 게임 생성 (나중에 사용)
				const [finalGameId] = await trx('tournament_matches').insert({
					type: 'tournament',
					tournament_id: tournamentId,
					round_number: 2,
					winner_id: null,
					status: 'waiting',
					started_at: null,
					ended_at: null
				});

				await trx.commit();

				console.log(`Tournament bracket generated for tournament ${tournamentId}. Games: ${semifinalGames.join(', ')}, Final: ${finalGameId}`);

				// [4강게임1, 4강게임2, 결승게임] 순서로 반환
				return [...semifinalGames, finalGameId];
			} catch (error) {
				await trx.rollback();
				throw error;
			}
		},

		/**
		 * 초기 대진표 생성 (4명 토너먼트) - 트랜잭션 버전
		 */
		async generateTournamentBracketWithTransaction(trx: Knex.Transaction, tournamentId: number, playerIds?: number[]): Promise<number[]> {
			// 1. 기존 토너먼트 매치들 조회
			const existingMatches = await trx('tournament_matches')
				.where('tournament_id', tournamentId);

			// 2. 기존 게임들 삭제 (새로운 대진표를 위해)
			if (existingMatches.length > 0) {
				await trx('tournament_matches')
					.where('tournament_id', tournamentId)
					.del();
			}

			let participants;

			if (playerIds && playerIds.length === 4) {
				// 3-1. 플레이어 ID 배열이 제공된 경우 (권장 방법)
				participants = await trx('players')
					.whereIn('id', playerIds)
					.select('id as player_id', 'type', 'user_id', 'display_name');
				
				// 원래 순서 유지
				participants.sort((a, b) => playerIds.indexOf(a.player_id) - playerIds.indexOf(b.player_id));
			} else {
				// 3-2. 플레이어 ID 배열이 없는 경우 - 에러 발생
				throw new Error('Player IDs must be provided to generate tournament bracket');
			}

			if (participants.length !== 4) {
				throw new Error(`bracket.Tournament must have exactly 4 participants. Current: ${participants.length}`);
			}

			// 4. 토너먼트 상태를 'in-progress'로 변경
			await trx('tournaments')
				.where('id', tournamentId)
				.update({ status: 'in-progress' });

			// 5. 4강전 게임 생성 (2개)
			const semifinalGames: number[] = [];

			// 게임 1: 플레이어 0 vs 플레이어 1
			const [game1Id] = await trx('tournament_matches').insert({
				type: 'tournament',
				tournament_id: tournamentId,
				round_number: 1,
				winner_id: null,
				status: 'waiting',
				started_at: null,
				ended_at: null,
				participant_1_id: participants[0].player_id,
				participant_2_id: participants[1].player_id
			});
			semifinalGames.push(game1Id);

			// 게임 2: 플레이어 2 vs 플레이어 3
			const [game2Id] = await trx('tournament_matches').insert({
				type: 'tournament',
				tournament_id: tournamentId,
				round_number: 1,
				winner_id: null,
				status: 'waiting',
				started_at: null,
				ended_at: null,
				participant_1_id: participants[2].player_id,
				participant_2_id: participants[3].player_id
			});
			semifinalGames.push(game2Id);

			// 결승전 게임 생성 (나중에 사용)
			const [finalGameId] = await trx('tournament_matches').insert({
				type: 'tournament',
				tournament_id: tournamentId,
				round_number: 2,
				winner_id: null,
				status: 'waiting',
				started_at: null,
				ended_at: null
			});

			console.log(`Tournament bracket generated for tournament ${tournamentId}. Games: ${semifinalGames.join(', ')}, Final: ${finalGameId}`);

			// [4강게임1, 4강게임2, 결승게임] 순서로 반환
			return [...semifinalGames, finalGameId];
		},

		/**
		 * 특정 토너먼트 기본 정보 조회
		 */
		async getTournament(tournamentId: number): Promise<Tournament | null> {
			try {
				const tournament = await knex('tournaments')
					.where('id', tournamentId)
					.first() as Tournament | undefined;

				return tournament || null;
			} catch (err: any) {
				console.error('Error getting tournament:', err.message);
				throw err;
			}
		},

		/**
		 * 특정 토너먼트의 모든 정보 조회
		 */
		async getTournamentWithDetails(tournamentId: number): Promise<TournamentWithDetails | null> {
			try {
				// 1. 토너먼트 기본 정보 조회
				const tournament = await knex('tournaments')
					.where('id', tournamentId)
					.first() as Tournament | undefined;

				if (!tournament) {
					return null;
				}

				// 2. 토너먼트 참가자 조회 (tournament_matches의 participant 컬럼에서)
				const participantIds = await knex('tournament_matches')
					.where('tournament_id', tournamentId)
					.whereNotNull('participant_1_id')
					.select('participant_1_id as player_id')
					.union(function() {
						this.select('participant_2_id as player_id')
							.from('tournament_matches')
							.where('tournament_id', tournamentId)
							.whereNotNull('participant_2_id');
					});

				const participants = await knex('players as p')
					.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
					.select(
						'p.id',
						'p.type', 
						'p.user_id',
						'p.display_name',
						knex.raw('COALESCE(up.name, p.display_name) as name')
					)
					.whereIn('p.id', participantIds.map(p => p.player_id));

				// 3. 토너먼트 게임들 조회
				const games = await knex('tournament_matches')
					.where('tournament_id', tournamentId)
					.orderBy('round_number', 'asc')
					.orderBy('id', 'asc');

				// 4. 각 게임의 참가자 정보 조회
				const gamesWithParticipants = await Promise.all(
					games.map(async (game) => {
						let gameParticipants = [];

						// 게임이 시작되어 game_session_id가 있는 경우, game_participants에서 조회
						if (game.game_session_id) {
							const gameParticipantsData = await knex('game_participants as gp')
								.join('players as p', 'gp.player_id', 'p.id')
								.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
								.select(
									'p.id', 'p.type', 'p.user_id', 'p.display_name', 'gp.score',
									'up.name as user_name', 'up.avatar'
								)
								.where('gp.game_id', game.game_session_id);

							gameParticipants = gameParticipantsData.map(p => {
								const name = p.type === 'user' && p.user_name ? p.user_name : p.display_name;
								const defaultAvatar = `http://localhost:3000/public/default-avatar.png`;
								const avatarUrl = p.avatar ? `http://localhost:3000/${p.avatar}` : defaultAvatar;

								return {
									id: p.id,
									type: p.type,
									user_id: p.user_id,
									name: name,
									display_name: name,
									score: p.score,
									avatarUrl: avatarUrl
								};
							});
						} else {
							// 게임이 아직 시작되지 않은 경우, tournament_matches의 participant 컬럼에서 조회
							const participantPromises = [];
							
							if (game.participant_1_id) {
								participantPromises.push(
									knex('players as p')
										.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
										.select(
											'p.id', 'p.type', 'p.user_id', 'p.display_name',
											'up.name as user_name', 'up.avatar'
										)
										.where('p.id', game.participant_1_id)
										.first()
								);
							}
							
							if (game.participant_2_id) {
								participantPromises.push(
									knex('players as p')
										.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
										.select(
											'p.id', 'p.type', 'p.user_id', 'p.display_name',
											'up.name as user_name', 'up.avatar'
										)
										.where('p.id', game.participant_2_id)
										.first()
								);
							}

							const participantResults = await Promise.all(participantPromises);
							
							gameParticipants = participantResults.filter(p => p).map(p => {
								const name = p.type === 'user' && p.user_name ? p.user_name : p.display_name;
								const defaultAvatar = `http://localhost:3000/public/default-avatar.png`;
								const avatarUrl = p.avatar ? `http://localhost:3000/${p.avatar}` : defaultAvatar;

								return {
									id: p.id,
									type: p.type,
									user_id: p.user_id,
									name: name,
									display_name: name,
									score: 0, // 게임 시작 전이므로 스코어는 0
									avatarUrl: avatarUrl
								};
							});
						}

						return {
							...game,
							participants: gameParticipants
						};
					})
				);

				return {
					...tournament,
					participants,
					matches: gamesWithParticipants
				};
			} catch (err: any) {
				console.error('Error getting tournament details:', err.message);
				throw err;
			}
		},

		/**
		 * 특정 토너먼트의 참가자 목록 조회
		 */
		async getTournamentParticipants(tournamentId: number): Promise<any[]> {
			try {
				// 1. 토너먼트 참가자 조회 (players 테이블에서, user_profiles 조인)
				const participants = await knex('tournament_matches as g')
					.join('game_participants as gp', 'g.id', 'gp.game_id')
					.join('players as p', 'gp.player_id', 'p.id')
					.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
					.select(
						'p.id',
						'p.type',
						'p.user_id',
						knex.raw('COALESCE(up.name, p.display_name) as name')
					)
					.where('g.tournament_id', tournamentId)
					.distinct('p.id');
				return participants;
			} catch (err: any) {
				console.error('Error getting tournament participants:', err.message);
				throw err;
			}
		},

		/**
		 * 토너먼트 진행 상황 조회 (UX용)
		 */
		async getTournamentProgress(tournamentId: number): Promise<TournamentProgress | null> {
			try {
				// 1. 토너먼트 기본 정보
				const tournament = await knex('tournaments')
					.where('id', tournamentId)
					.first();

				if (!tournament) {
					return null;
				}

				// 2. 모든 매치 조회
				const matches = await knex('tournament_matches as g')
					.join('game_participants as gp', 'g.id', 'gp.game_id')
					.join('players as p', 'gp.player_id', 'p.id')
					.leftJoin('user_profiles as up', function () {
						this.on('p.user_id', '=', 'up.user_id');
					})
					.select(
						'g.id', 'g.round_number', 'g.status', 'g.winner_id', 'g.started_at',
						'p.id as player_id', 'p.display_name', 'p.user_id', 'p.type', 'up.name as user_name'
					)
					.where('g.tournament_id', tournamentId)
					.orderBy('g.round_number', 'asc')
					.orderBy('g.id', 'asc')
					.then(rows => rows.map(row => ({
						...row,
						display_name: row.type === 'user' && row.user_name ? row.user_name : row.display_name
					})));

				// 3. 매치별로 그룹화
				const matchGroups = new Map<number, any[]>();
				matches.forEach(match => {
					if (!matchGroups.has(match.id)) {
						matchGroups.set(match.id, []);
					}
					matchGroups.get(match.id)!.push(match);
				});

				// 4. 매치 정보 구성
				const matchInfos: TournamentMatchInfo[] = Array.from(matchGroups.entries()).map(([matchId, participants]) => {
					const first = participants[0];
					return {
						id: matchId,
						round_number: first.round_number,
						status: first.status,
						participants: participants.map(p => ({
							id: p.player_id,
							// display_name: p.display_name || `User${p.user_id}`,
							display_name: p.display_name || p.user_id,
							user_id: p.user_id
						})),
						winner_id: first.winner_id,
						started_at: first.started_at
					};
				});

				// 5. 현재 매치, 다음 매치, 완료된 매치 분류
				const currentMatch = matchInfos.find(m => m.status === 'playing' || m.status === 'countdown');
				const nextMatches = matchInfos.filter(m => m.status === 'waiting');
				const completedMatches = matchInfos.filter(m => m.status === 'finished');

				// 6. 참가자 목록 및 탈락 여부 확인
				const allParticipants = new Map<number, any>();
				matches.forEach(match => {
					if (!allParticipants.has(match.player_id)) {
						allParticipants.set(match.player_id, {
							id: match.player_id,
							display_name: match.display_name || `User${match.user_id}`,
							user_id: match.user_id,
							eliminated: false
						});
					}
				});			// 탈락한 참가자 확인 (4강전에서 패배한 참가자들)
			const semifinalLosers: number[] = [];
			completedMatches
				.filter(m => m.round_number === 1)
				.forEach(m => {
					const losers = m.participants.filter(p => p.id !== m.winner_id);
					semifinalLosers.push(...losers.map(p => p.id));
				});

			semifinalLosers.forEach(playerId => {
				const participant = allParticipants.get(playerId);
				if (participant) {
					participant.eliminated = true;
				}
			});

				return {
					tournament_id: tournamentId,
					status: tournament.status,
					current_match: currentMatch,
					next_matches: nextMatches,
					completed_matches: completedMatches,
					participants: Array.from(allParticipants.values())
				};
			} catch (err: any) {
				console.error('Error getting tournament progress:', err.message);
				throw err;
			}
		},

		/**
		 * 특정 토너먼트의 모든 매치를 'canceled' 상태로 업데이트합니다.
		 * (플레이어 이탈 등으로 인한 비정상 종료 시 사용)
		 */
		async cancelAllMatchesForTournament(tournamentId: number): Promise<void> {
			try {
				const updatedCount = await knex('tournament_matches')
					.where('tournament_id', tournamentId)
					.whereNot('status', 'canceled')
					.update({
						status: 'canceled',
						ended_at: new Date().toISOString()
					});
			} catch (error) {
				throw error;
			}
		},

		/**
		 * 사용자의 토너먼트 기록 조회
		 */
		async getUserTournamentHistory(userId: number): Promise<any[]> {
			try {
				// 1. 사용자가 참가한 모든 토너먼트 조회 (cancelled 상태 제외)
				const tournaments = await knex('tournaments as t')
					.join('tournament_matches as g', 't.id', 'g.tournament_id')
					.join('game_participants as gp', 'g.id', 'gp.game_id')
					.join('players as p', 'gp.player_id', 'p.id')
					.select(
						't.id as tournament_id', 't.created_at', 't.winner_player_id', 't.status',
						'g.id as game_id', 'g.round_number', 'g.winner_id',
						'p.id as player_id', 'p.display_name', 'p.user_id'
					)
					.where('p.user_id', userId)
					.whereNot('t.status', 'canceled') // canceled 상태 토너먼트 제외
					.orderBy('t.created_at', 'desc');

				// 2. 토너먼트별로 그룹화
				const tournamentGroups = new Map<number, any[]>();
				tournaments.forEach(t => {
					if (!tournamentGroups.has(t.tournament_id)) {
						tournamentGroups.set(t.tournament_id, []);
					}
					tournamentGroups.get(t.tournament_id)!.push(t);
				});

				// 3. 각 토너먼트의 기록 구성
				const history: any[] = [];
				for (const [tournamentId, matches] of tournamentGroups) {
					// 토너먼트의 모든 참가자 조회
					const allParticipants = await knex('tournament_matches as g')
						.join('game_participants as gp', 'g.id', 'gp.game_id')
						.join('players as p', 'gp.player_id', 'p.id')
						.select('p.id', 'p.display_name', 'p.user_id')
						.where('g.tournament_id', tournamentId)
						.groupBy('p.id');
					const participantNames = allParticipants.map(p => p.display_name || `User${p.user_id}`);

					// 토너먼트의 모든 매치 조회 (라운드별)
					const allGames = await knex('tournament_matches')
						.where('tournament_id', tournamentId)
						.orderBy('round_number', 'asc')
						.orderBy('id', 'asc');

					// 각 매치의 참가자, 승자 정보 조회
					const rounds = await Promise.all(
						allGames.map(async (game) => {
							const participants = await knex('game_participants as gp')
								.join('players as p', 'gp.player_id', 'p.id')
								.select('p.display_name', 'p.user_id', 'p.id')
								.where('gp.game_id', game.id);
							const playerNames = participants.map(p => p.display_name || `User${p.user_id}`);
							const winner = participants.find(p => p.id === game.winner_id);
							let result: string | undefined = undefined;
							if (game.round_number === 2 && game.winner_id) {
								result = (game.winner_id === matches[0].player_id) ? 'champion' : (playerNames.includes(matches[0].display_name) ? 'runner_up' : undefined);
							}
							return {
								round_number: game.round_number,
								players: playerNames,
								winner: winner ? (winner.display_name || `User${winner.user_id}`) : null,
								result
							};
						})
					);

					// 최종 순위 결정 (기존 로직 유지)
					let finalRank = 4;
					const userMatches = matches.filter(m => m.user_id === userId);
					const lastMatch = userMatches[userMatches.length - 1];
					if (lastMatch) {
						if (lastMatch.round_number === 2) {
							finalRank = lastMatch.winner_id === lastMatch.player_id ? 1 : 2;
						} else {
							finalRank = 3;
						}
					}

					history.push({
						tournament_id: tournamentId,
						tournament_date: matches[0].created_at,
						participants: participantNames,
						rounds,
						final_rank: finalRank
					});
				}
				return history;
			} catch (err: any) {
				console.error('Error getting user tournament history:', err.message);
				throw err;
			}
		},

		/**
		 * 토너먼트 상태 업데이트
		 */
		async updateTournamentStatus(
			tournamentId: number,
			status: 'waiting' | 'in-progress' | 'ended' | 'canceled',
			winnerPlayerId?: number
		): Promise<void> {
			// 입력 검증
			if (!tournamentId || typeof tournamentId !== 'number' || tournamentId <= 0) {
				throw new Error('Invalid tournament ID');
			}

			const validStatuses = ['waiting', 'in-progress', 'ended', 'canceled'];
			if (!status || validStatuses.indexOf(status) === -1) {
				throw new Error('Invalid tournament status');
			}

			if (status === 'ended' && winnerPlayerId) {
				if (typeof winnerPlayerId !== 'number' || winnerPlayerId <= 0) {
					throw new Error('Invalid winner player ID');
				}
			}

			const trx = await knex.transaction();
			
			try {
				const updateData: any = { status };

				if (status === 'ended' && winnerPlayerId) {
					updateData.winner_player_id = winnerPlayerId;
					updateData.ended_at = new Date().toISOString();
				}

				await trx('tournaments')
					.where('id', tournamentId)
					.update(updateData);

				await trx.commit();
				console.log(`Tournament ${tournamentId} status updated to: ${status}`);
			} catch (err: any) {
				await trx.rollback();
				console.error('Error updating tournament status:', err.message);
				throw err;
			}
		},

		/**
		 * 모든 토너먼트 목록 조회
		 */
		async getAllTournaments(): Promise<Tournament[]> {
			const trx = await knex.transaction();
			
			try {
				const tournaments = await trx('tournaments')
					.orderBy('created_at', 'desc');

				await trx.commit();
				return tournaments as Tournament[];
			} catch (err: any) {
				await trx.rollback();
				console.error('Error getting all tournaments:', err.message);
				throw err;
			}
		},

		/**
		 * 사용자의 토너먼트 매치 기록 조회 (프로필용 - 간단한 버전)
		 */
		async getTournamentHistoryForProfile(userId: number): Promise<any[]> {
			try {
				const knex = fastify.knex;

				console.log(`[DEBUG] Getting tournament history for userId: ${userId}`);

				// 1. userId로 player_id 조회
				const player = await knex('players').where('user_id', userId).first('id');
				console.log(`[DEBUG] Found player for userId ${userId}:`, player);
				if (!player) {
					console.log(`[DEBUG] No player found for userId ${userId}`);
					return [];
				}

				// 2. 내가 참가한 토너먼트 ID 목록 조회 (직접 participant_1_id, participant_2_id로 조회)
				const tournamentIdsRows = await knex('tournament_matches as tm')
					.join('tournaments as t', 'tm.tournament_id', 't.id')
					.where('tm.type', 'tournament')
					.where(function() {
						this.where('tm.participant_1_id', player.id)
							.orWhere('tm.participant_2_id', player.id);
					})
					.whereNot('t.status', 'canceled') // canceled 상태 토너먼트 제외
					.distinct('tm.tournament_id');

				console.log(`[DEBUG] Found tournament IDs for player ${player.id}:`, tournamentIdsRows);

				const tournamentIds = tournamentIdsRows.map(r => r.tournament_id);
				console.log(`[DEBUG] Tournament IDs array:`, tournamentIds);

				// 3. 토너먼트별 참가자 정보와 게임 기록 조회
				const tournHistories = [];

				for (const tournamentId of tournamentIds) {
					// 토너먼트 기본 정보 (canceled 상태 제외)
					const tournamentInfo = await knex('tournaments')
						.where('id', tournamentId)
						.whereNot('status', 'canceled') // canceled 상태 토너먼트 제외
						.first('id', 'created_at', 'winner_player_id', 'status');
					if (!tournamentInfo) continue;

					// 참가자 목록 조회 (tournament_matches에서 직접)
					const participantsRows = await knex('tournament_matches as tm')
						.leftJoin('players as p1', 'tm.participant_1_id', 'p1.id')
						.leftJoin('players as p2', 'tm.participant_2_id', 'p2.id')
						.where('tm.tournament_id', tournamentId)
						.select(
							'p1.id as p1_id', 'p1.type as p1_type', 'p1.user_id as p1_user_id', 'p1.display_name as p1_display_name',
							'p2.id as p2_id', 'p2.type as p2_type', 'p2.user_id as p2_user_id', 'p2.display_name as p2_display_name'
						);

					// 참가자들의 user_id 수집
					const userIds = [];
					participantsRows.forEach(row => {
						if (row.p1_type === 'user' && row.p1_user_id) userIds.push(row.p1_user_id);
						if (row.p2_type === 'user' && row.p2_user_id) userIds.push(row.p2_user_id);
					});

					// 중복 제거
					const uniqueUserIds = [...new Set(userIds)];

					// 2. 한 번에 이름들을 가져옴
					const userProfiles = await knex('user_profiles')
						.whereIn('user_id', uniqueUserIds)
						.select('user_id', 'name');

					// 3. user_id → name 맵으로 변환
					const userIdToName: Record<number, string> = {};
					userProfiles.forEach(profile => {
						userIdToName[profile.user_id] = profile.name;
					});

					// 4. participants 이름 변환
					const participantNames = new Set();
					participantsRows.forEach(row => {
						// participant 1
						if (row.p1_type === 'user') {
							participantNames.add(userIdToName[row.p1_user_id] || 'Unknown User');
						} else {
							participantNames.add(row.p1_display_name || 'Unknown');
						}
						// participant 2
						if (row.p2_type === 'user') {
							participantNames.add(userIdToName[row.p2_user_id] || 'Unknown User');
						} else {
							participantNames.add(row.p2_display_name || 'Unknown');
						}
					});
					
					const participants = Array.from(participantNames);

					// 토너먼트의 모든 라운드 게임 조회 (사용자가 참여한 토너먼트의 전체 대진표)
					// tournament_matches 테이블에서 직접 참가자 정보를 가져오도록 수정
					const allGames = await knex('tournament_matches as g')
						.select(
							'g.id as game_id',
							'g.round_number',
							'g.ended_at',
							'g.winner_id',
							'g.participant_1_id',
							'g.participant_2_id'
						)
						.where('g.tournament_id', tournamentId)
						.whereNotNull('g.participant_1_id')
						.whereNotNull('g.participant_2_id')
						.orderBy('g.round_number', 'asc');

					// 각 게임의 참가자 정보를 별도로 조회
					const gamesWithParticipants = await Promise.all(
						allGames.map(async (game) => {
							// participant_1 정보 조회
							const p1 = await knex('players as p')
								.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
								.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'up.name as user_name')
								.where('p.id', game.participant_1_id)
								.first();

							// participant_2 정보 조회
							const p2 = await knex('players as p')
								.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
								.select('p.id', 'p.type', 'p.user_id', 'p.display_name', 'up.name as user_name')
								.where('p.id', game.participant_2_id)
								.first();

							return {
								game_id: game.game_id,
								round_number: game.round_number,
								ended_at: game.ended_at,
								winner_id: game.winner_id,
								player1_id: p1?.id,
								player1_type: p1?.type,
								player1_user_id: p1?.user_id,
								player1_display_name: p1?.display_name,
								player1_user_name: p1?.user_name,
								player2_id: p2?.id,
								player2_type: p2?.type,
								player2_user_id: p2?.user_id,
								player2_display_name: p2?.display_name,
								player2_user_name: p2?.user_name,
								player1_score: 0, // 스코어는 별도로 관리되므로 기본값
								player2_score: 0
							};
						})
					);

					// 중복 제거 로직 제거 (이미 tournament_matches에서 직접 가져오므로 중복 없음)
					const uniqueGames = gamesWithParticipants;

					// 사용자 정보를 포함한 라운드 정보 구성
					const rounds = uniqueGames.map(game => {
						// 사용자가 player1인지 player2인지 확인
						const isPlayer1 = game.player1_user_id === userId;
						const isPlayer2 = game.player2_user_id === userId;
						const isMyGame = isPlayer1 || isPlayer2;

						// player1 정보 구성
						const player1Name = game.player1_type === 'user' 
							? (userIdToName[game.player1_user_id] || 'Unknown User')
							: (game.player1_display_name || 'Unknown');
						
						const player1 = {
							id: game.player1_id,
							type: game.player1_type,
							name: player1Name,
							is_winner: game.winner_id === game.player1_id
						};

						// player2 정보 구성
						const player2Name = game.player2_type === 'user' 
							? (userIdToName[game.player2_user_id] || 'Unknown User')
							: (game.player2_display_name || 'Unknown');
						
						const player2 = {
							id: game.player2_id,
							type: game.player2_type,
							name: player2Name,
							is_winner: game.winner_id === game.player2_id
						};

						// 내 정보와 상대방 정보 구분 (기존 호환성을 위해 유지)
						const myPlayer = isPlayer1 ? player1 : player2;
						const opponentPlayer = isPlayer1 ? player2 : player1;

						return {
							round_number: game.round_number,
							endedAt: game.ended_at,
							// 새로운 player1, player2 구조 추가
							player1: player1,
							player2: player2,
							player1_score: game.player1_score,
							player2_score: game.player2_score,
							winnerId: game.winner_id,
							my_player_id: myPlayer.id,
							// 사용자가 이 게임에 참여했는지 여부
							isMyGame: isMyGame
						};
					});

			// final_rank 계산 (결승(round_number=2) 승리시 1, 결승 진출 후 패배시 2, 아니면 3)
			let final_rank = 3;
			const finalGame = rounds.find(r => r.round_number === 2);
			if (finalGame) {
				console.log('[DEBUG] Final game data:', {
					winnerId: finalGame.winnerId,
					my_player_id: finalGame.my_player_id,
					isMyGame: finalGame.isMyGame,
					player1: finalGame.player1,
					player2: finalGame.player2,
					winnerId_type: typeof finalGame.winnerId,
					my_player_id_type: typeof finalGame.my_player_id
				});
				
				// 내가 결승에 참여했는지 확인
				if (finalGame.isMyGame) {
					// null 체크 후 안전한 비교
					if (finalGame.winnerId != null && finalGame.my_player_id != null) {
						// 안전한 비교를 위해 둘 다 숫자로 변환해서 비교
						const winnerId = parseInt(finalGame.winnerId.toString());
						const myPlayerId = parseInt(finalGame.my_player_id.toString());
						final_rank = winnerId === myPlayerId ? 1 : 2;
						console.log('[DEBUG] Final rank calculation:', { winnerId, myPlayerId, final_rank });
					} else {
						console.log('[DEBUG] Warning: winnerId or my_player_id is null in final game');
						final_rank = 2; // 결승 진출했지만 데이터 오류로 2등 처리
					}
				} else {
					// 결승에 참여하지 않았다면 3등 이하
					console.log('[DEBUG] User did not participate in final game');
					final_rank = 3;
				}
			} else {
				console.log('[DEBUG] No final game (round_number=2) found');
			}
			console.log('[DEBUG] Calculated final_rank:', final_rank);

					// my_player_id는 반환할 필요 없으니 rounds에서 삭제, isMyGame은 유지
					const cleanRounds = rounds.map(({ my_player_id, ...rest }) => rest);

			console.log('[DEBUG] Clean rounds after my_player_id removal:', JSON.stringify(cleanRounds, null, 2));

			const tournamentHistory = {
				tournament_id: tournamentInfo.id,
				tournament_date: tournamentInfo.created_at,
				participants: participants,
				rounds: cleanRounds,
				final_rank: final_rank,
			};

			// 상세한 로그 출력
			console.log(`[DEBUG] Tournament History for userId ${userId}, tournamentId ${tournamentInfo.id}:`);
			console.log(`[DEBUG] - tournament_id: ${tournamentHistory.tournament_id}`);
			console.log(`[DEBUG] - tournament_date: ${tournamentHistory.tournament_date}`);
			console.log(`[DEBUG] - participants:`, JSON.stringify(tournamentHistory.participants, null, 2));
			console.log(`[DEBUG] - final_rank: ${tournamentHistory.final_rank}`);
			console.log(`[DEBUG] - rounds (${tournamentHistory.rounds.length} rounds):`, JSON.stringify(tournamentHistory.rounds, null, 2));

			tournHistories.push(tournamentHistory);
			}

			console.log(`[DEBUG] Final tournHistories for userId ${userId} (${tournHistories.length} tournaments):`);
			console.log('[DEBUG] Complete result:', JSON.stringify(tournHistories, null, 2));

				return tournHistories;
			} catch (err: any) {
				console.error('Error getting tournament history:', err.message);
				return [];
			}
		}


		// async getTournamentHistoryForProfile(userId: number): Promise<any[]> {
		// 	try {
		// 		// 사용자가 참가한 토너먼트 게임들 조회
		// 		const matches = await knex('tournament_matches as g')
		// 			.join('game_participants as gp', 'g.id', 'gp.game_id')
		// 			.join('players as p', 'gp.player_id', 'p.id')
		// 			.join('tournaments as t', 'g.tournament_id', 't.id')
		// 			.select(
		// 				'g.id', 'g.tournament_id', 'g.round_number', 'g.started_at', 'g.ended_at', 'g.winner_id',
		// 				'p.id as player_id', 'p.type', 'p.user_id', 'p.display_name',
		// 				't.winner_player_id as tournament_winner_id'
		// 			)
		// 			.where('g.type', 'tournament')
		// 			.where('g.status', 'finished')
		// 			.where('p.user_id', userId)
		// 			.orderBy('g.ended_at', 'desc')
		// 			.limit(10); // 최근 10개만

		// 		const history = [];
		// 		for (const match of matches) {
		// 			// 상대방 정보 조회
		// 			const opponent = await knex('game_participants as gp')
		// 				.join('players as p', 'gp.player_id', 'p.id')
		// 				.select('p.type', 'p.user_id', 'p.display_name')
		// 				.where('gp.game_id', match.id)
		// 				.where('p.id', '!=', match.player_id)
		// 				.first();

		// 			if (opponent) {
		// 				const opponentName = opponent.type === 'user' 
		// 					? `User${opponent.user_id}` // 간단한 이름 처리
		// 					: opponent.display_name;

		// 				// 토너먼트에서의 최종 순위 결정
		// 				let finalRank = 3; // 기본값 (4강 탈락)
		// 				if (match.round_number === 2) {
		// 					// 결승전
		// 					finalRank = match.winner_id === match.player_id ? 1 : 2;
		// 				}

		// 				history.push({
		// 					date: match.ended_at,
		// 					tournament_id: match.tournament_id,
		// 					round: match.round_number,
		// 					opponent: opponentName,
		// 					result: match.winner_id === match.player_id ? 'win' : 'lose',
		// 					rank: finalRank
		// 				});
		// 			}
		// 		}

		// 		return history;
		// 	} catch (err: any) {
		// 		console.error('Error getting tournament history for profile:', err.message);
		// 		return [];
		// 	}
		// }
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = createTournamentsRepository(fastify);
		(fastify as any).decorate('tournamentsRepository', repo);
	},
	{
		name: 'tournaments-repository',
		dependencies: ['knex']
	}
);
