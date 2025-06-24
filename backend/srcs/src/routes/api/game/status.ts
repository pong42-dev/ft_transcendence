import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { GameStateSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify
	const gameManager = GameManager.getInstance()

	// GET /api/games/:gameId - 게임 상태 조회
	fastify.get(
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
							status: Type.String(),
							players: Type.Array(Type.Object({
								id: Type.String(),
								name: Type.String(),
								type: Type.String()
							})),
							playerCount: Type.Number(),
							gameState: Type.Optional(GameStateSchema)
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

				const players = session.getPlayers()
				const playerCount = session.getPlayerCount()
				const isStarted = session.isGameStarted()
				const gameState = isStarted ? session.getGameState() : undefined

				return reply.send({
					success: true,
					msg: 'Game retrieved successfully',
					data: {
						gameId,
						status: isStarted ? 'playing' : 'waiting',
						players: players.map(p => ({
							id: p.id,
							name: p.name,
							type: p.type
						})),
						playerCount,
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
