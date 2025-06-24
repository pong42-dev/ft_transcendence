import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { GameManager } from '../../../game/GameManager.js'
import { CreateGameSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	// const { authenticate } = fastify  // TODO: 테스트 완료 후 활성화
	const gameManager = GameManager.getInstance()

	// POST /api/games - 게임 생성
	fastify.post(
		'/',
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
			// TODO: 테스트 완료 후 인증 재활성화
			// preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { player1, player2, gameMode = '1v1' } = request.body

				// 게임 모드별 플레이어 수 검증
				if (gameMode === '1v1' && !player2) {
					return reply.status(400).send({ msg: '1v1 mode requires 2 players' })
				}
				
				if (gameMode === 'vs_ai' && player2) {
					return reply.status(400).send({ msg: 'vs_ai mode should have only 1 player (AI will be added automatically)' })
				}
				
				if (gameMode === 'tournament') {
					return reply.status(400).send({ msg: 'Tournament mode is not implemented yet' })
				}

				// 플레이어 설정 (프론트엔드 방식에 맞게)
				let actualPlayer1 = player1
				let actualPlayer2 = player2
				
				if (gameMode === 'vs_ai') {
					// VS AI 모드: AI(left/player1) vs User(right/player2)
					actualPlayer1 = {
						id: 'ai_player',
						name: 'AI',
						type: 'ai' as const
					}
					actualPlayer2 = player1 // 실제 사용자가 player2가 됨
				}

				// GameManager를 통해 게임 생성
				const gameId = gameManager.createGame(actualPlayer1, actualPlayer2, gameMode)
				
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
				
				// 스키마 검증 오류 처리
				if (error instanceof Error) {
					if (error.message.includes('validation') || error.message.includes('required')) {
						return reply.status(400).send({ msg: 'Invalid input data: ' + error.message })
					}
				}
				
				return reply.status(500).send({ msg: 'Internal server error' })
			}
		}
	)
}

export default plugin
