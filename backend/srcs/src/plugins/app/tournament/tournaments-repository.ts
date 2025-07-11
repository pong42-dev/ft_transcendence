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
			try {
				const [tournamentId] = await knex('tournaments').insert({
					status: 'waiting',
					winner_player_id: null,
					created_at: new Date().toISOString(),
					ended_at: null
				});

				return tournamentId;
			} catch (err: any) {
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
					console.log(`Created new guest player: ${playerId}`);
				} else {
					throw new Error('Invalid player data');
				}

				// 2. 토너먼트의 첫 번째 게임에 참가자로 등록
				// (토너먼트가 시작되면 실제 대진표가 생성됨)
				const [gameId] = await trx('games').insert({
					type: 'tournament',
					tournament_id: tournamentId,
					round_number: 1,
					winner_id: null,
					status: 'waiting',
					started_at: null,
					ended_at: null
				});

				await trx('game_participants').insert({
					game_id: gameId,
					player_id: playerId,
					score: 0
				});

				await trx.commit();

				console.log(`Participant added to tournament ${tournamentId}. Player ID: ${playerId}, Game ID: ${gameId}`);
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

			// 2. 토너먼트의 첫 번째 게임에 참가자로 등록
			// (토너먼트가 시작되면 실제 대진표가 생성됨)
			const [gameId] = await trx('games').insert({
				type: 'tournament',
				tournament_id: tournamentId,
				round_number: 1,
				winner_id: null,
				status: 'waiting',
				started_at: null,
				ended_at: null
			});

			await trx('game_participants').insert({
				game_id: gameId,
				player_id: playerId,
				score: 0
			});

			console.log(`Participant added to tournament ${tournamentId}. Player ID: ${playerId}, Game ID: ${gameId}`);
			return playerId;
		},

		/**
		 * 초기 대진표 생성 (4명 토너먼트)
		 * 반환값: [게임1, 게임2, 결승게임] 형태의 게임 ID 배열
		 */
		async generateTournamentBracket(tournamentId: number): Promise<number[]> {
			const trx = await knex.transaction();

			try {
				// 1. 토너먼트의 모든 게임과 참가자 조회
				const tournamentGames = await trx('games as g')
					.join('game_participants as gp', 'g.id', 'gp.game_id')
					.join('players as p', 'gp.player_id', 'p.id')
					.select('g.id as game_id', 'g.round_number', 'p.id as player_id', 'p.type', 'p.user_id', 'p.display_name')
					.where('g.tournament_id', tournamentId)
					.orderBy('g.round_number', 'asc')
					.orderBy('g.id', 'asc');

				// 2. 기존 게임들 삭제 (새로운 대진표를 위해)
				await trx('game_participants')
					.whereIn('game_id', tournamentGames.map(g => g.game_id))
					.del();

				await trx('games')
					.where('tournament_id', tournamentId)
					.del();

				// 3. 참가자 목록 추출
				const participants = tournamentGames
					.filter((game, index, self) =>
						self.findIndex(g => g.player_id === game.player_id) === index
					);

				if (participants.length !== 4) {
					throw new Error(`Tournament must have exactly 4 participants. Current: ${participants.length}`);
				}

				// 4. 토너먼트 상태를 'in-progress'로 변경
				await trx('tournaments')
					.where('id', tournamentId)
					.update({ status: 'in-progress' });

				// 5. 4강전 게임 생성 (2개)
				const semifinalGames: number[] = [];

				// 게임 1: 참가자 1 vs 참가자 2
				const [game1Id] = await trx('games').insert({
					type: 'tournament',
					tournament_id: tournamentId,
					round_number: 1,
					winner_id: null,
					status: 'waiting',
					started_at: null,
					ended_at: null
				});
				semifinalGames.push(game1Id);

				// 게임 1 참가자 등록
				await trx('game_participants').insert([
					{ game_id: game1Id, player_id: participants[0].player_id, score: 0 },
					{ game_id: game1Id, player_id: participants[1].player_id, score: 0 }
				]);

				// 게임 2: 참가자 3 vs 참가자 4
				const [game2Id] = await trx('games').insert({
					type: 'tournament',
					tournament_id: tournamentId,
					round_number: 1,
					winner_id: null,
					status: 'waiting',
					started_at: null,
					ended_at: null
				});
				semifinalGames.push(game2Id);

				// 게임 2 참가자 등록
				await trx('game_participants').insert([
					{ game_id: game2Id, player_id: participants[2].player_id, score: 0 },
					{ game_id: game2Id, player_id: participants[3].player_id, score: 0 }
				]);

				// 6. 결승전 게임 생성 (나중에 사용)
				const [finalGameId] = await trx('games').insert({
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
		async generateTournamentBracketWithTransaction(trx: Knex.Transaction, tournamentId: number): Promise<number[]> {
			// 1. 토너먼트의 모든 게임과 참가자 조회
			const tournamentGames = await trx('games as g')
				.join('game_participants as gp', 'g.id', 'gp.game_id')
				.join('players as p', 'gp.player_id', 'p.id')
				.select('g.id as game_id', 'g.round_number', 'p.id as player_id', 'p.type', 'p.user_id', 'p.display_name')
				.where('g.tournament_id', tournamentId)
				.orderBy('g.round_number', 'asc')
				.orderBy('g.id', 'asc');

			// 2. 기존 게임들 삭제 (새로운 대진표를 위해)
			await trx('game_participants')
				.whereIn('game_id', tournamentGames.map(g => g.game_id))
				.del();

			await trx('games')
				.where('tournament_id', tournamentId)
				.del();

			// 3. 참가자 목록 추출
			const participants = tournamentGames
				.filter((game, index, self) =>
					self.findIndex(g => g.player_id === game.player_id) === index
				);

			if (participants.length !== 4) {
				throw new Error(`Tournament must have exactly 4 participants. Current: ${participants.length}`);
			}

			// 4. 토너먼트 상태를 'in-progress'로 변경
			await trx('tournaments')
				.where('id', tournamentId)
				.update({ status: 'in-progress' });

			// 5. 4강전 게임 생성 (2개)
			const semifinalGames: number[] = [];

			// 게임 1: 참가자 1 vs 참가자 2
			const [game1Id] = await trx('games').insert({
				type: 'tournament',
				tournament_id: tournamentId,
				round_number: 1,
				winner_id: null,
				status: 'waiting',
				started_at: null,
				ended_at: null
			});
			semifinalGames.push(game1Id);

			// 게임 1 참가자 등록
			await trx('game_participants').insert([
				{ game_id: game1Id, player_id: participants[0].player_id, score: 0 },
				{ game_id: game1Id, player_id: participants[1].player_id, score: 0 }
			]);

			// 게임 2: 참가자 3 vs 참가자 4
			const [game2Id] = await trx('games').insert({
				type: 'tournament',
				tournament_id: tournamentId,
				round_number: 1,
				winner_id: null,
				status: 'waiting',
				started_at: null,
				ended_at: null
			});
			semifinalGames.push(game2Id);

			// 게임 2 참가자 등록
			await trx('game_participants').insert([
				{ game_id: game2Id, player_id: participants[2].player_id, score: 0 },
				{ game_id: game2Id, player_id: participants[3].player_id, score: 0 }
			]);

			// 6. 결승전 게임 생성 (나중에 사용)
			const [finalGameId] = await trx('games').insert({
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

				// 2. 토너먼트 참가자 조회 (players 테이블에서, user_profiles 조인)
				const participants = await knex('games as g')
					.join('game_participants as gp', 'g.id', 'gp.game_id')
					.join('players as p', 'gp.player_id', 'p.id')
					.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
					.select(
						'p.id',
						'p.type',
						'p.user_id',
						'p.display_name',
						knex.raw('COALESCE(up.name, p.display_name) as name')
					)
					.where('g.tournament_id', tournamentId)
					.distinct('p.id');

				// 3. 토너먼트 게임들 조회
				const games = await knex('games')
					.where('tournament_id', tournamentId)
					.orderBy('round_number', 'asc')
					.orderBy('id', 'asc');

				// 4. 각 게임의 참가자 정보 조회 (user_profiles 조인)
				const gamesWithParticipants = await Promise.all(
					games.map(async (game) => {
						const gameParticipantsData = await knex('game_participants as gp')
							.join('players as p', 'gp.player_id', 'p.id')
							.leftJoin('user_profiles as up', 'p.user_id', 'up.user_id')
							.select(
								'p.id', 'p.type', 'p.user_id', 'p.display_name', 'gp.score',
								'up.name as user_name', 'up.avatar'
							)
							.where('gp.game_id', game.id);

						const gameParticipants = gameParticipantsData.map(p => {
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
								avatarUrl: avatarUrl // 아바타 URL 추가
							};
						});

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
				const participants = await knex('games as g')
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
				const matches = await knex('games as g')
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
				});

				// 탈락한 참가자 확인 (4강전에서 패배한 참가자들)
				const semifinalLosers = completedMatches
					.filter(m => m.round_number === 1)
					.flatMap(m => m.participants.filter(p => p.id !== m.winner_id))
					.map(p => p.id);

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
		 * 사용자의 토너먼트 기록 조회
		 */
		async getUserTournamentHistory(userId: number): Promise<any[]> {
			try {
				// 1. 사용자가 참가한 모든 토너먼트 조회
				const tournaments = await knex('tournaments as t')
					.join('games as g', 't.id', 'g.tournament_id')
					.join('game_participants as gp', 'g.id', 'gp.game_id')
					.join('players as p', 'gp.player_id', 'p.id')
					.select(
						't.id as tournament_id', 't.created_at', 't.winner_player_id',
						'g.id as game_id', 'g.round_number', 'g.winner_id',
						'p.id as player_id', 'p.display_name', 'p.user_id'
					)
					.where('p.user_id', userId)
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
					const allParticipants = await knex('games as g')
						.join('game_participants as gp', 'g.id', 'gp.game_id')
						.join('players as p', 'gp.player_id', 'p.id')
						.select('p.id', 'p.display_name', 'p.user_id')
						.where('g.tournament_id', tournamentId)
						.groupBy('p.id');
					const participantNames = allParticipants.map(p => p.display_name || `User${p.user_id}`);

					// 토너먼트의 모든 매치 조회 (라운드별)
					const allGames = await knex('games')
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
			try {
				const updateData: any = { status };

				if (status === 'ended' && winnerPlayerId) {
					updateData.winner_player_id = winnerPlayerId;
					updateData.ended_at = new Date().toISOString();
				}

				await knex('tournaments')
					.where('id', tournamentId)
					.update(updateData);

				console.log(`Tournament ${tournamentId} status updated to: ${status}`);
			} catch (err: any) {
				console.error('Error updating tournament status:', err.message);
				throw err;
			}
		},

		/**
		 * 모든 토너먼트 목록 조회
		 */
		async getAllTournaments(): Promise<Tournament[]> {
			try {
				const tournaments = await knex('tournaments')
					.orderBy('created_at', 'desc');

				return tournaments as Tournament[];
			} catch (err: any) {
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

				// 1. userId로 player_id 조회
				const player = await knex('players').where('user_id', userId).first('id');
				if (!player) return [];

				// 2. 내가 참가한 토너먼트 ID 목록 조회 (중복 제거)
				const tournamentIdsRows = await knex('games as g')
					.join('game_participants as gp', 'g.id', 'gp.game_id')
					.where('g.type', 'tournament')
					.where('gp.player_id', player.id)
					.distinct('g.tournament_id');

				const tournamentIds = tournamentIdsRows.map(r => r.tournament_id);

				// 3. 토너먼트별 참가자 정보와 게임 기록 조회
				const tournHistories = [];

				for (const tournamentId of tournamentIds) {
					// 토너먼트 기본 정보
					const tournamentInfo = await knex('tournaments')
						.where('id', tournamentId)
						.first('id', 'created_at', 'winner_player_id');
					if (!tournamentInfo) continue;

					// 참가자 목록 조회
					const participantsRows = await knex('game_participants as gp')
						.join('players as p', 'gp.player_id', 'p.id')
						.join('games as g', 'gp.game_id', 'g.id')
						.where('g.tournament_id', tournamentId)
						.distinct('p.id', 'p.type', 'p.user_id', 'p.display_name');

					// 1. user_id만 모아서
					const userIds = participantsRows
						.filter(p => p.type === 'user')
						.map(p => p.user_id);

					// 2. 한 번에 이름들을 가져옴
					const userProfiles = await knex('user_profiles')
						.whereIn('user_id', userIds)
						.select('user_id', 'name');

					// 3. user_id → name 맵으로 변환
					const userIdToName: Record<number, string> = {};
					userProfiles.forEach(profile => {
						userIdToName[profile.user_id] = profile.name;
					});

					// 4. participants 이름 변환
					const participants = participantsRows.map(p => {
						if (p.type === 'user') {
							return userIdToName[p.user_id] || 'Unknown User';
						}
						return p.display_name || 'Unknown';
					});

					// rounds 배열 생성 (게임별 1v1 상세)
					const games = await knex('games as g')
						.join('game_participants as me', 'g.id', 'me.game_id')
						.join('players as me_player', 'me.player_id', 'me_player.id')
						.join('game_participants as op', function () {
							this.on('g.id', '=', 'op.game_id').andOn('me.player_id', '!=', 'op.player_id');
						})
						.join('players as op_player', 'op.player_id', 'op_player.id')
						.select(
							'g.round_number',
							'g.ended_at',
							'g.winner_id',
							'me.score as my_score',
							'op.score as opponent_score',
							'op_player.id as opponent_id',
							'op_player.type as opponent_type',
							'op_player.user_id as opponent_user_id',
							'op_player.display_name as opponent_display_name',
							'me_player.id as my_player_id'
						)
						.where('g.tournament_id', tournamentId)
						.where('me_player.user_id', userId)
						.orderBy('g.round_number', 'asc');

					const rounds = games.map(game => {
						const opponentName = game.opponent_display_name || 'Unknown';
						return {
							round_number: game.round_number,
							endedAt: game.ended_at,
							opponent: {
								id: game.opponent_id,
								type: game.opponent_type,
								name: opponentName,
							},
							myScore: game.my_score,
							opponentScore: game.opponent_score,
							winnerId: game.winner_id,
							my_player_id: game.my_player_id,
						};
					});

			// final_rank 계산 (결승(round_number=2) 승리시 1, 결승 진출 후 패배시 2, 아니면 3)
			let final_rank = 3;
			const finalGame = rounds.find(r => r.round_number === 2);
			if (finalGame) {
				console.log('[DEBUG] Final game data:', {
					winnerId: finalGame.winnerId,
					my_player_id: finalGame.my_player_id,
					winnerId_type: typeof finalGame.winnerId,
					my_player_id_type: typeof finalGame.my_player_id,
					comparison_result: finalGame.winnerId === finalGame.my_player_id
				});
				
				// null 체크 후 안전한 비교
				if (finalGame.winnerId != null && finalGame.my_player_id != null) {
					// 안전한 비교를 위해 둘 다 숫자로 변환해서 비교
					const winnerId = parseInt(finalGame.winnerId.toString());
					const myPlayerId = parseInt(finalGame.my_player_id.toString());
					final_rank = winnerId === myPlayerId ? 1 : 2;
				} else {
					console.log('[DEBUG] Warning: winnerId or my_player_id is null, keeping default rank 3');
				}
			}
			console.log('[DEBUG] Calculated final_rank:', final_rank);

					// my_player_id는 반환할 필요 없으니 rounds에서 삭제
					const cleanRounds = rounds.map(({ my_player_id, ...rest }) => rest);

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
		// 		const matches = await knex('games as g')
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
		fastify.decorate('tournamentsRepository', repo);
	},
	{
		name: 'tournaments-repository',
		dependencies: ['knex']
	}
);
