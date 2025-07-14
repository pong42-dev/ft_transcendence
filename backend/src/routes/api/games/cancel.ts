import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { GameResponseDtoSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify  // TODO: 테스트 완료 후 활성화
	const gameManager = GameManager.getInstance()
	
	// GameManager에 Repository 주입
	gameManager.setGameRepository(fastify.gameRepository)

	// POST /api/games/:gameId/cancel - 게임 취소
	fastify.post(
		'/:gameId/cancel',
		{
			schema: {
				params: Type.Object({
					gameId: Type.String()
				}),
				body: Type.Object({
					reason: Type.Optional(Type.Union([
						Type.Literal('user_exit'),
						Type.Literal('page_unload'),
						Type.Literal('network_error'),
						Type.Literal('manual_cancel')
					]))
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
				tags: ["Games"]
			},
			// TODO: 테스트 완료 후 인증 재활성화
			preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { gameId } = request.params
				// const { reason = 'manual_cancel' } = request.body // 나중에 로깅용으로 사용

				const session = gameManager.getSession(gameId)
				if (!session) {
					return reply.status(404).send({ message: 'Game not found' })
				}

				// 게임 취소 처리 (reason은 로깅용으로만 사용)
				await session.stop('error') // 'error'는 'canceled' 상태로 DB 업데이트

				// 최종 상태 조회
				const players = session.getPlayers()
				const gameType = session.getGameMode()

				const response = {
					gameId,
					status: 'canceled' as const,
					type: gameType,
					players
				}

				return reply.send(response)
			} catch (error: any) {
				fastify.log.error('Error canceling game:', error)
				return reply.status(500).send({ message: 'Internal server error' })
			}
		}
	)
}

export default plugin
