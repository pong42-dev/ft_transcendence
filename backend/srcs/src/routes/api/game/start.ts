import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { GameStateSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify
	const gameManager = GameManager.getInstance()

	// POST /api/games/:gameId/start - 게임 시작
	fastify.post(
		'/games/:gameId/start',
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
							status: Type.String(),
							gameState: GameStateSchema
						})
					}),
					400: Type.Object({
						msg: Type.String()
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

				if (session.getPlayerCount() !== 2) {
					return reply.status(400).send({ msg: 'Game requires exactly 2 players to start' })
				}

				if (session.isGameStarted()) {
					return reply.status(400).send({ msg: 'Game already started' })
				}

				const success = gameManager.startGame(gameId)
				if (!success) {
					return reply.status(500).send({ msg: 'Failed to start game' })
				}

				const gameState = session.getGameState()

				return reply.send({
					success: true,
					msg: 'Game started successfully',
					data: {
						gameId,
						status: 'playing',
						gameState
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
