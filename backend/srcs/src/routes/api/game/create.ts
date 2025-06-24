import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { CreateGameSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify
	const gameManager = GameManager.getInstance()

	// POST /api/games - 게임 생성
	fastify.post(
		'/games',
		{
			schema: {
				body: CreateGameSchema,
				response: {
					201: Type.Object({
						success: Type.Literal(true),
						msg: Type.String(),
						data: Type.Object({
							gameId: Type.String(),
							status: Type.String(),
							playerCount: Type.Number(),
							canStart: Type.Boolean()
						})
					}),
					400: Type.Object({
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
				const { player1, player2, gameMode = '1v1' } = request.body

				// GameManager를 통해 게임 생성
				const gameId = gameManager.createGame(player1, player2, gameMode)
				
				if (!gameId) {
					return reply.status(500).send({ msg: 'Failed to create game' })
				}

				const session = gameManager.getSession(gameId)
				const playerCount = session ? session.getPlayerCount() : 0

				return reply.status(201).send({
					success: true,
					msg: 'Game created successfully',
					data: {
						gameId,
						status: 'created',
						playerCount,
						canStart: playerCount === 2
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
