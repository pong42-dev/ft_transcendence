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

declare module 'fastify' {
	interface FastifyInstance {
		gameRepository: ReturnType<typeof createGameRepository>;
	}
}

export function createGameRepository(fastify: FastifyInstance) {
	const knex = fastify.knex;

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
		 * 사용자 ID로 플레이어 조회 (user 타입인 경우)
		 */
		async getPlayerByUserId(userId: number): Promise<PlayerResponseDto | null> {
			const player = await knex('players')
				.where('type', 'user')
				.where('user_id', userId)
				.first() as DBPlayer;

			return player ? await this.mapDBPlayerToResponseDto(player) : null;
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

		/**
		 * 특정 유저의 1v1 게임 기록 목록 조회 (완료된 게임만)
		 * @param userId 조회할 유저의 ID
		 */
		async getUser1v1History(userId: number): Promise<any[]> {
			const knex = fastify.knex;

			// 1. 요청된 userId를 기반으로 player_id를 찾습니다.
			const playerSubQuery = knex('players').where('user_id', userId).first('id');

			// 2. 메인 쿼리를 작성합니다.
			const results = await knex('games as g')
				// 필요한 정보들을 SELECT 합니다.
				.select(
					'g.ended_at',
					'g.winner_id',
					// 내 스코어 (me.score)
					'me.score as my_score',
					// 상대방의 스코어 (opponent.score)
					'op.score as opponent_score',
					// 상대방 플레이어 정보
					'op_player.id as opponent_player_id',
					'op_player.type as opponent_player_type',
					'op_player.user_id as opponent_user_id',
					'op_player.display_name as opponent_display_name'
				)
				// 내 게임 참가 기록(me)을 JOIN 합니다.
				.join('game_participants as me', 'g.id', 'me.game_id')
				// 상대방 게임 참가 기록(opponent)을 JOIN 합니다.
				// 같은 게임 ID를 가지지만, 내 player_id와는 다른 기록을 찾습니다.
				.join('game_participants as op', function() {
					this.on('g.id', '=', 'op.game_id')
						.andOn('me.player_id', '!=', 'op.player_id');
				})
				// 상대방 플레이어 정보(opponent_player)를 JOIN 합니다.
				.join('players as op_player', 'op.player_id', 'op_player.id')
				// WHERE 조건 설정
				.where('g.status', 'finished') // 완료된 게임만 조회
				.where(function() { // 1v1 게임 타입만 조회
					this.where('g.type', 'local_1v1').orWhere('g.type', 'ai_1v1');
				})
				.where('me.player_id', playerSubQuery) // 내가 참여한 게임만 조회
				// 정렬
				.orderBy('g.ended_at', 'desc'); // 게임 종료 시각으로 내림차순 정렬

			// 3. 조회된 결과를 DTO 형태로 가공합니다.
			// 기존 `mapDBPlayerToResponseDto` 헬퍼 함수를 재활용하여 상대방 정보를 만듭니다.
			const history = [];
			for (const row of results) {
				const opponentInfo = await this.mapDBPlayerToResponseDto({
					id: row.opponent_player_id,
					type: row.opponent_player_type,
					user_id: row.opponent_user_id,
					display_name: row.opponent_display_name,
					created_at: '' // 이 필드는 DTO 변환에 사용되지 않음
				});

				history.push({
					endedAt: row.ended_at,
					opponent: opponentInfo,
					myScore: row.my_score,
					opponentScore: row.opponent_score,
					winnerId: row.winner_id
				});
			}

			return history;
		},

		/**
		 * DB Player를 Response DTO로 변환
		 */
		async mapDBPlayerToResponseDto(dbPlayer: DBPlayer): Promise<PlayerResponseDto> {
			let name: string;

			if (dbPlayer.type === 'user' && dbPlayer.user_id) {
				// 사용자 프로필에서 닉네임 조회
				const userProfile = await knex('user_profiles')
					.where('user_id', dbPlayer.user_id)
					.first();
				name = userProfile?.nickname || `User ${dbPlayer.user_id}`;
			} else {
				name = dbPlayer.display_name || 'Unknown';
			}

			return {
				id: dbPlayer.id,
				type: dbPlayer.type,
				name
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
			playerIds: number[]
		): Promise<number> {
			const trx = await knex.transaction();
			
			try {
				// 1. 게임 생성
				const [gameId] = await trx('games').insert({
					type: gameMode,
					tournament_id: null,
					round_number: 1,
					status: 'waiting',
					started_at: null,
					ended_at: null,
					winner_id: null
				});

				// 2. 플레이어들을 game_participants에 등록
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
		 * 게임 상태 업데이트
		 */
		async updateGameStatus(gameId: number, status: GameStatus): Promise<void> {
			const updateData: any = { status };
			
			if (status === 'playing') {
				updateData.started_at = knex.fn.now();
			} else if (status === 'finished' || status === 'canceled') {
				updateData.ended_at = knex.fn.now();
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
				ended_at: knex.fn.now()
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

		/**
		 * 게임 참가자 조회
		 */
		async getGameParticipants(gameId: number): Promise<PlayerResponseDto[]> {
			const participants = await knex('game_participants as gp')
				.join('players as p', 'gp.player_id', 'p.id')
				.select('p.*', 'gp.score')
				.where('gp.game_id', gameId) as (DBPlayer & { score: number })[];

			const result: PlayerResponseDto[] = [];
			for (const participant of participants) {
				const playerDto = await this.mapDBPlayerToResponseDto(participant);
				result.push(playerDto);
			}

			return result;
		}
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
