import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { UserNameSchema } from '../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { userProfilesRepository, customErrorHandler } = fastify
	fastify.post(
		'/check-name',
		{
			config: {
				rateLimit: {
				max: 5,
				timeWindow: '1 minute'
				}
			},
			schema: {
				body: UserNameSchema,
				response: {
					200: Type.Object({
						success: Type.Boolean(),
						msg: Type.String()
					}),
					500: Type.Object({
						success: Type.Boolean(),
						msg: Type.String()
					}),
				},
				tags: ['Users']
			},
			errorHandler: customErrorHandler('닉네임 중복확인')
		},
		async function (request, reply) {
			try {
				const { name } = request.body as UserNameSchema;
				const nameExists = await userProfilesRepository.checkDupRow('name', name);
				if (nameExists) {
					return reply.send({
					success: false,
					msg: '이미 존재하는 닉네임 입니다.'
					})
				}
				return reply.send({
				success: true,
				msg: '사용가능한 닉네임 입니다.'
				})
			} catch (err) {
				request.log.error(err)
				return reply.status(500).send({
				success: false,
				msg: '중복검사 처리 중 서버 내부 오류가 발생했습니다.'
				})
			}
		}
	)
}

export default plugin
