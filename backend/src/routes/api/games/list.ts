// src/routes/api/games/list.ts

import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
// 필요한 스키마들을 import 합니다.
// 예: import { GameHistoryResponseDtoSchema } from '../../../schemas/games.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify

	// GET /api/games - 내가 참여한 게임 목록 조회
	fastify.get(
		'/',
		{
			schema: {
				// 응답 스키마를 정의합니다. (예시)
				response: {
					200: Type.Array(Type.Object({
                        endedAt: Type.String({ format: 'date-time' }),
                        opponent: Type.Object({ /* ... opponent info ... */ }),
                        myScore: Type.Number(),
                        opponentScore: Type.Number(),
                        winnerId: Type.Number()
                    }))
				},
				tags: ["Games"]
			},
			preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const userId = request.user.user_id

				const gameHistory = await fastify.gameRepository.getUserAllGameHistory(userId);
                if (!gameHistory) {
                    return reply.status(404).send({ message: 'No game history found for this user' });
                }
				return reply.send(gameHistory);

			} catch (error: any) {
				fastify.log.error('Error fetching user game list:', error);
				return reply.status(500).send({ message: 'Internal server error' });
			}
		}
	)
}

export default plugin