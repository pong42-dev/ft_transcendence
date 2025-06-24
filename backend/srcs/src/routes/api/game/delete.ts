import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { GameResultSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify
	const gameManager = GameManager.getInstance()

	// DELETE /api/games/:gameId - 게임 삭제 (세션 정리)
	fastify.delete(
		'/games/:gameId',
		{
			schema: {
				params: Type.Object({
					gameId: Type.String()
				}),
				response: {
					200: Type.Object({
						success: Type.Literal(true),
						msg: Type.String(),
						data: Type.Object({
							gameId: Type.String(),
							finalResult: Type.Optional(GameResultSchema)
						})
					}),
					404: Type.Object({
						msg: Type.String()
					}),
					500: Type.Object({
						msg: Type.String()
					})
				},
				tags: ["Games"]
			},
			preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { gameId } = request.params

				const session = gameManager.getSession(gameId)
				if (!session) {
					return reply.status(404).send({ msg: 'Game not found' })
				}

				// 게임 결과 가져오기 (게임이 끝난 경우)
				let finalResult
				if (session.isGameStarted()) {
					try {
						finalResult = session.getGameResult()
					} catch {
						// 게임이 진행 중이거나 결과가 없는 경우
					}
				}

				const success = gameManager.removeGame(gameId)
				if (!success) {
					return reply.status(500).send({ msg: 'Failed to delete game' })
				}

				return reply.send({
					success: true,
					msg: 'Game deleted successfully',
					data: {
						gameId,
						finalResult
					}
				})
			} catch (error) {
				fastify.log.error(error)
				return reply.status(500).send({ msg: 'Internal server error' })
			}
		}
	)
}

export default plugin
