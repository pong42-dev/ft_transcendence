import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { GameResponseDtoSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	// const { authenticate } = fastify  // TODO: 테스트 완료 후 활성화
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
		// preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { gameId } = request.params

				const session = gameManager.getSession(gameId)
				if (!session) {
					return reply.status(404).send({ message: 'Game not found' })
				}

				// GameSession에서 필요한 정보 조회
				const players = session.getPlayers()
				const status = session.getStatus()
				const gameType = session.getGameMode()

				// GameResponseDto 형식으로 응답
				const response = {
					gameId,
					status,
					type: gameType,
					players
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
