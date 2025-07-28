import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import {
	DBGame,
	DBPlayer,
	GameMode,
	GameStatus,
	CreatePlayerRequestDto,
	PlayerResponseDto
} from '../../../schemas/games.js';
import { UserGameStats } from '../../../schemas/profile.js'

declare module 'fastify' {
	interface FastifyInstance {
		gameRepository: ReturnType<typeof createGameRepository>;
	}
}

export function createGameRepository(fastify: FastifyInstance) {
	const knex = fastify.knex;
	const BASE_URL = fastify.config.BASE_URL;

	return {
		// =================================================================
		// Player Operations
		// =================================================================

		/**
		 * 플레이어 생성
		 */
		async createPlayer(playerData: CreatePlayerRequestDto): Promise<PlayerResponseDto> {
			const { type, userId, displayName } = playerData;

			// 데이터 유효성 검증
			if (type === 'user' && !userId) {
				throw new Error('User type player must have userId');
			}
			if ((type === 'guest' || type === 'ai') && !displayName) {
				throw new Error('Guest and AI type players must have displayName');
			}

			const [playerId] = await knex('players').insert({
				type,
				user_id: userId || null,
				display_name: displayName || null
			});

			return await this.getPlayerById(playerId);
		},

		/**
		 * 플레이어 조회 (ID로)
		 */
		async getPlayerById(playerId: number): Promise<PlayerResponseDto> {
			const player = await knex('players').where('id', playerId).first() as DBPlayer;

			if (!player) {
				throw new Error(`Player not found: ${playerId}`);
			}

			return await this.mapDBPlayerToResponseDto(player);
		},

		/**
		 * AI 플레이어 조회 또는 생성
		 */
		async getOrCreateAIPlayer(): Promise<PlayerResponseDto> {
			let aiPlayer = await knex('players')
				.where('type', 'ai')
				.first() as DBPlayer;

			if (!aiPlayer) {
				// AI 플레이어가 없으면 생성
				const [aiPlayerId] = await knex('players').insert({
					type: 'ai',
					user_id: null,
					display_name: 'AI'
				});
				aiPlayer = await knex('players').where('id', aiPlayerId).first() as DBPlayer;
			}

			return await this.mapDBPlayerToResponseDto(aiPlayer);
		},

		/**
		 * 유저 플레이어 조회 또는 생성
		 */
		async getOrCreateUserPlayer(userId: number): Promise<PlayerResponseDto> {
			// 기존 유저 플레이어 조회
			let userPlayer = await knex('players')
				.where({ type: 'user', user_id: userId })
				.first() as DBPlayer;

			if (!userPlayer) {
				// 유저 정보 조회
				const user = await knex('users')
					.where('id', userId)
					.first();

				if (!user) {
					throw new Error(`User not found: ${userId}`);
				}

				// 새 유저 플레이어 생성
				const [playerIdArray] = await knex('players').insert({
					type: 'user',
					user_id: userId,
					display_name: null
				});

				const playerId = Array.isArray(playerIdArray) ? playerIdArray[0] : playerIdArray;
				userPlayer = await knex('players').where('id', playerId).first() as DBPlayer;
			}

			return await this.mapDBPlayerToResponseDto(userPlayer);
		},

		/**
		 * 게스트 플레이어 생성 (항상 새로 생성)
		 */
		async createGuestPlayer(displayName: string): Promise<PlayerResponseDto> {
			const [playerIdArray] = await knex('players').insert({
				type: 'guest',
				user_id: null,
				display_name: displayName
			});

			const playerId = Array.isArray(playerIdArray) ? playerIdArray[0] : playerIdArray;
			const guestPlayer = await knex('players').where('id', playerId).first() as DBPlayer;

			return await this.mapDBPlayerToResponseDto(guestPlayer);
		},

		async getUserGameCount(userId: number): Promise<number> {
			// local_1v1, ai_1v1, tournament 모든 경기 수
			const totalCountQuery = knex('games')
				.count('* as count')
				.join('game_participants', 'games.id', 'game_participants.game_id')
				.join('players', 'game_participants.player_id', 'players.id')
				.andWhere('players.user_id', userId)
				.andWhere('games.status', 'finished')
				.first();

			const totalResult = await totalCountQuery;
			return Number(totalResult?.count) || 0;
		},


		async getUserWinCount(userId: number) {
			// local_1v1, ai_1v1, tournament 모든 경기 승리 수
			const totalWinResult = await knex('games')
				.count('* as count')
				.join('players', 'games.winner_id', 'players.id')
				.andWhere('games.status', 'finished')
				.andWhere('players.user_id', userId)
				.first();

			return Number(totalWinResult?.count) || 0;
		},


		async getUserGameStats(userId: number): Promise<UserGameStats> {
			const [totalGames, totalWins] = await Promise.all([
				this.getUserGameCount(userId),
				this.getUserWinCount(userId),
			]);
			const winRate =
				totalGames > 0 ? parseFloat(((totalWins / totalGames) * 100).toFixed(1)) : 0;
			return {
				totalGames,
				totalWins,
				winRate,
			};
		},

		/**
		 * 특정 유저의 1v1 게임 기록 목록 조회 (완료된 게임만)
		 * @param userId 조회할 유저의 ID
		 */
		async getUser1v1History(userId: number): Promise<any[]> {
			const knex = fastify.knex;
			const BASE_URL = fastify.config.BASE_URL;

			// 1. 요청된 userId를 기반으로 player_id를 찾는 서브쿼리
			const playerSubQuery = knex('players').where('user_id', userId).first('id');

			// 2. 단일 쿼리로 게임 기록과 상대방 프로필 정보까지 모두 조회
			const results = await knex('games as g')
				.select(
					'g.ended_at',
					'g.winner_id',
					'me.score as my_score',
					'op.score as opponent_score',
					'op_player.id as opponent_player_id',
					'op_player.type as opponent_player_type',
					knex.raw('COALESCE(op_user_profile.name, op_player.display_name) as opponent_name'),
					'op_user_profile.avatar as opponent_avatar'
				)
				.join('game_participants as me', 'g.id', 'me.game_id')
				.join('game_participants as op', function () {
					this.on('g.id', '=', 'op.game_id')
						.andOn('me.player_id', '!=', 'op.player_id');
				})
				.join('players as op_player', 'op.player_id', 'op_player.id')
				.leftJoin('user_profiles as op_user_profile', 'op_player.user_id', '=', 'op_user_profile.user_id')
				.where('g.status', 'finished')
				.where(function () { // 1v1 게임 타입만 조회
					this.where('g.type', 'local_1v1').orWhere('g.type', 'ai_1v1');
				})
				.where('me.player_id', playerSubQuery)
				.orderBy('g.ended_at', 'desc');

			// 3. 조회된 결과를 DTO 형태로 가공
			const history = results.map(row => {
				const opponentAvatarUrl = row.opponent_avatar
					? `${BASE_URL}/${row.opponent_avatar}`
					: `${BASE_URL}/${fastify.config.PUBLIC_DIRNAME}/default-avatar.png`;

				return {
					endedAt: row.ended_at,
					opponent: {
						id: row.opponent_player_id,
						type: row.opponent_player_type,
						name: row.opponent_name,
						avatarUrl: opponentAvatarUrl
					},
					myScore: row.my_score,
					opponentScore: row.opponent_score,
					winnerId: row.winner_id,
				};
			});

			return history;
		},

		/**
		 * DB Player를 Response DTO로 변환
		 */
		async mapDBPlayerToResponseDto(dbPlayer: DBPlayer): Promise<PlayerResponseDto> {
			let name: string;
			let avatarUrl: string | undefined;

			if (dbPlayer.type === 'user' && dbPlayer.user_id) {
				// 사용자 프로필에서 닉네임과 아바타 조회
				const userProfile = await knex('user_profiles')
					.where('user_id', dbPlayer.user_id)
					.first();
				name = userProfile?.name || `User ${dbPlayer.user_id}`;

				if (userProfile?.avatar) {
					avatarUrl = `${BASE_URL}/${userProfile.avatar}`;
				} else {
					avatarUrl = `${BASE_URL}/${fastify.config.PUBLIC_DIRNAME}/default-avatar.png`;
				}
			} else {
				name = dbPlayer.display_name || 'Unknown';
				// AI나 게스트는 기본 아바타 사용
				avatarUrl = `${BASE_URL}/${fastify.config.PUBLIC_DIRNAME}/default-avatar.png`;
			}

			return {
				id: dbPlayer.id,
				type: dbPlayer.type,
				name,
				avatarUrl
			};
		},

		// =================================================================
		// Game Operations
		// =================================================================

		/**
		 * 게임 생성 (플레이어들과 함께)
		 */
		async createGameWithPlayers(
			gameMode: GameMode,
			playerIds: number[],
			tournamentId?: number
		): Promise<number> {
			const trx = await knex.transaction();

			try {
				let round = 1; // 기본 라운드
				if (tournamentId) {
					const gameCountResult = await trx('games')
						.where('tournament_id', tournamentId)
						.count('* as gameCount')
						.first();

					const gameCount = Number(gameCountResult?.gameCount) || 0;

					// 게임 카운트가 2 미만이면 준결승(라운드 1), 2이면 결승(라운드 2)
					if (gameCount < 2) {
						round = 1;
					} else {
						round = 2;
					}
				}

				// 1. 게임 생성
				const [gameId] = await trx('games').insert({
					type: gameMode,
					tournament_id: tournamentId ?? null,
					round_number: round,
					status: 'waiting',
					started_at: null,
					ended_at: null,
					winner_id: null
				});

				// 2. 참가자 추가
				if (playerIds.length > 0) {
					const participantData = playerIds.map(playerId => ({
						game_id: gameId,
						player_id: playerId,
						score: 0
					}));

					await trx('game_participants').insert(participantData);
				}

				await trx.commit();
				return gameId;
			} catch (error) {
				await trx.rollback();
				throw error;
			}
		},

		/**
		 * 특정 토너먼트에 속한 모든 게임의 상태를 'canceled'로 변경
		 * (과거에 진행된 게임 포함)
		 */
		async cancelAllGamesForTournament(tournamentId: number): Promise<void> {
			try {
				const updatedCount = await knex('games')
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
		 * 게임 상태 업데이트
		 */
		async updateGameStatus(gameId: number, status: GameStatus): Promise<void> {
			const updateData: any = { status };

			if (status === 'playing') {
				updateData.started_at = new Date().toISOString();
			} else if (status === 'finished' || status === 'canceled') {
				updateData.ended_at = new Date().toISOString();
			}

			await knex('games').where('id', gameId).update(updateData);
		},

		/**
		 * 게임 승자 설정
		 */
		async setGameWinner(gameId: number, winnerId: number): Promise<void> {
			await knex('games').where('id', gameId).update({
				winner_id: winnerId,
				status: 'finished',
				ended_at: new Date().toISOString()
			});
		},

		/**
		 * 플레이어 점수 업데이트
		 */
		async updatePlayerScore(gameId: number, playerId: number, score: number): Promise<void> {
			await knex('game_participants')
				.where('game_id', gameId)
				.where('player_id', playerId)
				.update({ score });
		},

		/**
		 * 게임 정보 조회
		 */
		async getGameById(gameId: number): Promise<DBGame | null> {
			const game = await knex('games').where('id', gameId).first() as DBGame;
			return game || null;
		},
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = createGameRepository(fastify);
		fastify.decorate('gameRepository', repo);
	},
	{
		name: 'game-repository',
		dependencies: ['knex'],
	}
);
