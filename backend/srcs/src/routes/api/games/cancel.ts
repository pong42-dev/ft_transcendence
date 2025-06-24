import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { CancelGameSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	// const { authenticate } = fastify  // TODO: 테스트 완료 후 활성화
	const gameManager = GameManager.getInstance()

	// POST /api/games/:gameId/cancel - 게임 취소
	fastify.post(
		'/:gameId/cancel',
		{
			schema: {
				params: Type.Object({
					gameId: Type.String()
				}),
				body: CancelGameSchema,
				response: {
					200: Type.Object({
						success: Type.Literal(true),
						msg: Type.String(),
						data: Type.Object({
							gameId: Type.String(),
							status: Type.String(),
							reason: Type.String(),
							redirectTo: Type.Optional(Type.String())
						})
					}),
					404: Type.Object({
						msg: Type.String()
					}),
					500: Type.Object({
						msg: Type.String()
					})
				},
				tags: ["Games"]		},
		// TODO: 테스트 완료 후 인증 재활성화
		// preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { gameId } = request.params
				const { reason } = request.body

				const session = gameManager.getSession(gameId)
				if (!session) {
					return reply.status(404).send({ msg: 'Game not found' })
				}

				// GameManager에 cancelGame 메서드가 있다고 가정
				// const success = gameManager.cancelGame(gameId, reason, playerId)
				
				// 임시로 게임 중단 처리
				session.stop()

				return reply.send({
					success: true,
					msg: 'Game cancelled successfully',
					data: {
						gameId,
						status: 'cancelled',
						reason,
						redirectTo: '/profile'
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
