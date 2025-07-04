import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { CreateGameRequestDtoSchema, GameResponseDtoSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify
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
			preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				// 토큰에서 user_id 추출
				const userId = request.user.user_id;
				const { type, opponents = [], aiSettings } = request.body

				// 게임 모드별 유효성 검증
				if (type === 'local_1v1') {
					// local_1v1: 게스트 1명이 필요
					if (opponents.length !== 1) {
						return reply.status(400).send({ 
							message: 'local_1v1 mode requires exactly 1 opponent (guest player)' 
						});
					}
				} else if (type === 'ai_1v1') {
					// ai_1v1: 상대방 불필요 (AI가 자동 추가)
					if (opponents.length !== 0) {
						return reply.status(400).send({ 
							message: 'ai_1v1 mode does not require opponents (AI is added automatically)' 
						});
					}
				} else if (type === 'tournament') {
					return reply.status(400).send({ 
						message: 'Tournament mode is not implemented yet' 
					});
				}

				// 플레이어 생성
				const players = [];
				
				// 현재 유저 플레이어 추가
				try {
					const userPlayer = await fastify.gameRepository.getOrCreateUserPlayer(userId);
					players.push(userPlayer);
				} catch (error: any) {
					fastify.log.error('Error getting/creating user player:', error);
					return reply.status(500).send({ 
						message: `Failed to process user player: ${error.message}` 
					});
				}

				// 게임 모드별 상대방 플레이어 추가
				if (type === 'ai_1v1') {
					// AI 플레이어 추가 (맨 앞에 추가하여 left 포지션)
					try {
						const aiPlayer = await fastify.gameRepository.getOrCreateAIPlayer();
						players.unshift(aiPlayer); // 배열 맨 앞에 추가
					} catch (error: any) {
						fastify.log.error('Error creating AI player:', error);
						return reply.status(500).send({ 
							message: `Failed to create AI player: ${error.message}` 
						});
					}
				} else if (type === 'local_1v1') {
					// 게스트 플레이어 추가
					try {
						const guestDisplayName = opponents[0];
						const guestPlayer = await fastify.gameRepository.createGuestPlayer(guestDisplayName);
						players.push(guestPlayer);
					} catch (error: any) {
						fastify.log.error('Error creating guest player:', error);
						return reply.status(500).send({ 
							message: `Failed to create guest player: ${error.message}` 
						});
					}
				}

				fastify.log.info('[CREATE API] About to create game with players:', players.map(p => ({ id: p.id, type: p.type, name: p.name })));

				// 게임 생성 (AI 설정이 있으면 전달)
				const gameId = await gameManager.createGame(
					type, 
					players, 
					undefined, // customCallbacks
					aiSettings ? {
						difficulty: aiSettings.difficulty
					} : undefined
				);
				
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
