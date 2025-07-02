import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { CreateGameRequestDtoSchema, GameResponseDtoSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	// const { authenticate } = fastify  // TODO: 테스트 완료 후 활성화
	const gameManager = GameManager.getInstance()
	
	// GameManager에 Repository 주입
	gameManager.setGameRepository(fastify.gameRepository)

	// POST /api/games - 게임 생성
	fastify.post(
		'/',
		{
			schema: {
				body: CreateGameRequestDtoSchema,
				response: {
					201: GameResponseDtoSchema,
					400: Type.Object({
						message: Type.String()
					}),
					500: Type.Object({
						message: Type.String()
					})
				},
				tags: ["Games"]
			},
			// TODO: 테스트 완료 후 인증 재활성화
			// preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { type, players: playerInfos } = request.body

				// 게임 모드별 플레이어 정보 유효성 검증
				if (type === 'local_1v1') {
					// local_1v1: 반드시 유저 1명 + 게스트 1명
					if (playerInfos.length !== 2) {
						return reply.status(400).send({ 
							message: 'local_1v1 mode requires exactly 2 players (1 user + 1 guest)' 
						});
					}
					
					const userPlayers = playerInfos.filter(p => p.type === 'user');
					const guestPlayers = playerInfos.filter(p => p.type === 'guest');
					const aiPlayers = playerInfos.filter(p => p.type === 'ai');
					
					if (userPlayers.length !== 1 || guestPlayers.length !== 1 || aiPlayers.length !== 0) {
						return reply.status(400).send({ 
							message: 'local_1v1 mode requires exactly 1 user and 1 guest player' 
						});
					}
				} else if (type === 'ai_1v1') {
					// ai_1v1: 반드시 유저 1명만 (AI는 자동 추가)
					if (playerInfos.length !== 1) {
						return reply.status(400).send({ 
							message: 'ai_1v1 mode requires exactly 1 user player' 
						});
					}
					
					const userPlayers = playerInfos.filter(p => p.type === 'user');
					const guestPlayers = playerInfos.filter(p => p.type === 'guest');
					const aiPlayers = playerInfos.filter(p => p.type === 'ai');
					
					if (userPlayers.length !== 1 || guestPlayers.length !== 0 || aiPlayers.length !== 0) {
						return reply.status(400).send({ 
							message: 'ai_1v1 mode requires exactly 1 user player (no guest or ai players allowed)' 
						});
					}
				}

				// 플레이어 정보로부터 실제 플레이어 생성/조회
				const players = [];
				// AI 게임인 경우 AI 플레이어 추가
				if (type === 'ai_1v1') {
					const aiPlayer = await fastify.gameRepository.getOrCreateAIPlayer();
					players.push(aiPlayer);
				}
				for (const playerInfo of playerInfos) {
					try {
						let player;
						
						if (playerInfo.type === 'user') {
							if (!playerInfo.userId) {
								return reply.status(400).send({ 
									message: 'userId is required for user type player' 
								});
							}
							// 유저 플레이어: 기존 플레이어 조회 또는 생성
							player = await fastify.gameRepository.getOrCreateUserPlayer(playerInfo.userId);
						} else if (playerInfo.type === 'guest') {
							if (!playerInfo.displayName) {
								return reply.status(400).send({ 
									message: 'displayName is required for guest type player' 
								});
							}
							// 게스트 플레이어: 항상 새로 생성
							player = await fastify.gameRepository.createGuestPlayer(playerInfo.displayName);
						} else {
							return reply.status(400).send({ 
								message: `Invalid player type: ${playerInfo.type}` 
							});
						}
						
						players.push(player);
					} catch (error: any) {
						fastify.log.error('Error creating/getting player:', error);
						return reply.status(500).send({ 
							message: `Failed to process player: ${error.message}` 
						});
					}
				}


				if (type === 'tournament') {
					return reply.status(400).send({ 
						message: 'Tournament mode is not implemented yet' 
					});
				}

				fastify.log.info('[CREATE API] About to create game with players:', players.map(p => ({ id: p.id, type: p.type, name: p.name })));

				// 게임 생성
				const gameId = await gameManager.createGame(type, players);
				
				if (!gameId) {
					return reply.status(500).send({ 
						message: 'Failed to create game' 
					});
				}

				// 응답 생성
				const response = {
					gameId,
					status: 'waiting' as const,
					type,
					players
				};

				return reply.status(201).send(response);

			} catch (error: any) {
				fastify.log.error('Error creating game:', error);
				if (error?.message?.includes('Invalid') || error?.message?.includes('required')) {
					return reply.status(400).send({ 
						message: 'Invalid input data: ' + error.message 
					});
				}

				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)
}

export default plugin
