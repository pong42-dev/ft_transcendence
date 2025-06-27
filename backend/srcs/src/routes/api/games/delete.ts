import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	// const { authenticate } = fastify  // TODO: 테스트 완료 후 활성화
	const gameManager = GameManager.getInstance()
	
	// GameManager에 Repository 주입
	gameManager.setGameRepository(fastify.gameRepository)

	// DELETE /api/games/:gameId - 게임 삭제 (세션 정리)
	fastify.delete(
		'/:gameId',
		{
			schema: {
				params: Type.Object({
					gameId: Type.String()
				}),
				response: {
					200: Type.Object({
						message: Type.String(),
						gameId: Type.String()
					}),
					404: Type.Object({
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
				const { gameId } = request.params

				const session = gameManager.getSession(gameId)
				if (!session) {
					return reply.status(404).send({ message: 'Game not found' })
				}

				// 게임 세션 정리
				gameManager.removeGame(gameId)

				// DB에서도 게임 상태 업데이트 (선택적)
				if (fastify.gameRepository) {
					try {
						await fastify.gameRepository.updateGameStatus(parseInt(gameId), 'finished')
					} catch (dbError) {
						fastify.log.warn('Failed to update game status in DB:', dbError)
					}
				}

				return reply.send({
					message: 'Game deleted successfully',
					gameId
				})
			} catch (error: any) {
				fastify.log.error('Error deleting game:', error)
				return reply.status(500).send({ message: 'Internal server error' })
			}
		}
	)
}

export default plugin
