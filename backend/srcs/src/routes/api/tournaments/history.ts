import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { 
	UserTournamentHistoryListResponseDtoSchema
} from '../../../schemas/tournaments.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify

	// GET /api/tournaments/user/history - 현재 로그인한 사용자의 토너먼트 기록 조회
	fastify.get(
		'/user/history',
		{
			schema: {
				response: {
					200: UserTournamentHistoryListResponseDtoSchema,
					401: Type.Object({
							message: Type.String()
						}),
					500: Type.Object({
							message: Type.String()
						})
				},
				tags: ["Tournaments"]
			},
			// preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				// JWT 토큰에서 사용자 ID 추출
				const userId = request.user.user_id;

				// 사용자 토너먼트 기록 조회
				const history = await fastify.tournamentsRepository.getUserTournamentHistory(userId);

				return reply.status(200).send(history);

			} catch (error: any) {
				fastify.log.error('Error fetching current user tournament history:', error);
				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)

	// GET /api/tournaments/history/user/:userId - 특정 사용자의 토너먼트 기록 조회 (관리자용)
	fastify.get(
		'/history/user/:userId',
		{
			schema: {
				params: Type.Object({
					userId: Type.Integer()
				}),
				response: {
					200: UserTournamentHistoryListResponseDtoSchema,
					404: Type.Object({
							message: Type.String()
						}),
					500: Type.Object({
							message: Type.String()
						})
				},
				tags: ["Tournaments"]
			},
			// preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { userId } = request.params as { userId: number };

				// 사용자 존재 여부 확인
				const user = await fastify.usersRepository.getRowByColumnValue('id', userId);
				if (!user) {
					return reply.status(404).send({ 
						message: 'User not found' 
					});
				}

				// 사용자 토너먼트 기록 조회
				const history = await fastify.tournamentsRepository.getUserTournamentHistory(userId);

				return reply.status(200).send(history);

			} catch (error: any) {
				fastify.log.error('Error fetching user tournament history:', error);
				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)
}

export default plugin 