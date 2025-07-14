import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { GameResponseDtoSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify  // TODO: 테스트 완료 후 활성화
	const gameManager = GameManager.getInstance()

	// GET /api/games/:gameId - 게임 상태 조회
	fastify.get(
		'/:gameId',
		{
			schema: {
				params: Type.Object({
					gameId: Type.String()
				}),
				response: {
					200: GameResponseDtoSchema,
					404: Type.Object({
						message: Type.String()
					}),
					500: Type.Object({
						message: Type.String()
					})
				},
				tags: ["Games"]		},
		// TODO: 테스트 완료 후 인증 재활성화  
		preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { gameId } = request.params

				// 먼저 활성 세션에서 조회 시도
				const session = gameManager.getSession(gameId)
				if (session) {
					// 활성 세션이 있으면 세션에서 정보 조회
					const players = session.getPlayers()
					const status = session.getStatus()
					const gameType = session.getGameMode()

					const response = {
						gameId,
						status,
						type: gameType,
						players
					}
					return reply.send(response)
				}

				// 활성 세션이 없으면 DB에서 직접 조회
				const dbGameId = parseInt(gameId)
				if (isNaN(dbGameId)) {
					return reply.status(404).send({ message: 'Game not found' })
				}

				const gameRepository = (fastify as any).gameRepository
				if (!gameRepository) {
					return reply.status(500).send({ message: 'Game repository not available' })
				}

				const gameData = await gameRepository.getGameById(dbGameId)
				if (!gameData) {
					return reply.status(404).send({ message: 'Game not found' })
				}

				// DB에서 조회한 게임 정보로 응답 생성
				const response = {
					gameId,
					status: gameData.status,
					type: gameData.mode,
					players: gameData.players
				}

				return reply.send(response)
			} catch (error: any) {
				fastify.log.error('Error getting game status:', error)
				return reply.status(500).send({ message: 'Internal server error' })
			}
		}
	)
}

export default plugin
