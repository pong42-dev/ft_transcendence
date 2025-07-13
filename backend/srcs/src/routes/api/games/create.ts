import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { CreateGameRequestDtoSchema, GameResponseDtoSchema } from '../../../schemas/games.js'


/**
 * 게임 생성 요청의 body 데이터를 검증합니다.
 * @param body - request.body
 * @param fastify - fastify 인스턴스 (isValidName 같은 validator 접근용)
 * @returns {{valid: boolean, message: string | null}}
 */


function validateCreateGameRequest(
	body: CreateGameRequestDto,
	fastify: FastifyInstance
): { valid: boolean; message: string | null } {
	const { type, opponents = [] } = body

	switch (type) {
		case 'local_1v1':
			if (opponents.length !== 1) {
				return { valid: false, message: 'local_1v1 mode requires exactly one opponent (guest player).' }
			}
			const guestDisplayName = opponents[0]
			if (!fastify.isValidName(guestDisplayName)) {
				return {
					valid: false,
					message: 'Invalid guest player name. Name must be 2–16 characters, using letters, numbers, or Korean characters.'
				}
			}
			break

		case 'ai_1v1':
			if (opponents.length !== 0) {
				return { valid: false, message: 'ai_1v1 mode does not require opponents (AI is added automatically).' }
			}
			break

		case 'tournament':
			return { valid: false, message: 'Tournament mode is not implemented yet.' }
	}

	// 모든 검증을 통과한 경우
	return { valid: true, message: null }
}


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
				const validationResult = validateCreateGameRequest(request.body, fastify)
				if (!validationResult.valid) {
					return reply.status(400).send({ message: validationResult.message })
				}

				const userId = request.user.user_id
				const { type, opponents = [], aiSettings } = request.body

				const players = []

				// 현재 유저 플레이어 추가
				try {
					const userPlayer = await fastify.gameRepository.getOrCreateUserPlayer(userId)
					players.push(userPlayer)
				} catch (error: any) {
					fastify.log.error('Error getting/creating user player:', error)
					return reply.status(500).send({ message: `Failed to process user player: ${error.message}` })
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
					undefined, // tournamentId
					undefined, // customCallbacks
					aiSettings
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
