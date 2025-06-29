import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { 
	UserTournamentHistoryListResponseDtoSchema
} from '../../../schemas/tournaments.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	// const { authenticate } = fastify  // TODO: 테스트 완료 후 활성화

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
			preHandler: [fastify.authenticate]
		},
		async (request, reply) => {
			try {
				// JWT 토큰에서 사용자 ID 추출
				const userId = request.user.id;

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

	// GET /api/tournaments/history/:userId - 사용자 토너먼트 기록 조회
	fastify.get(
		'/history/:userId',
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
			// TODO: 테스트 완료 후 인증 재활성화
			// preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { userId } = request.params as { userId: number };

				// 사용자 존재 여부 확인 (선택사항)
				// const user = await fastify.usersRepository.getUserById(userId);
				// if (!user) {
				// 	return reply.status(404).send({ 
				// 		message: 'User not found' 
				// 	});
				// }

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

	// GET /api/tournaments/history - 현재 로그인한 사용자의 토너먼트 기록 조회
	fastify.get(
		'/history',
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
			// TODO: 테스트 완료 후 인증 재활성화
			// preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				// TODO: 인증 미들웨어에서 사용자 ID 추출
				// const userId = request.user.id;
				const userId = 1; // 임시로 하드코딩 (테스트용)

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
}

export default plugin 