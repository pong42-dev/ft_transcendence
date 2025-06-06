import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { UserData } from '../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { usersRepository, isValidEmail, customErrorHandler } = fastify

	fastify.post(
		'/check-email',
		{
			config: {
				rateLimit: {
				max: 5,
				timeWindow: '1 minute'
				}
			},
			schema: {
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
			errorHandler: customErrorHandler('이메일 중복확인')
		},
		async function (request, reply) {
		try {
			const { email } = request.body as UserData;
			if (!isValidEmail(email)) {
				return reply.status(200).send({ success: false, msg: '이메일 형식이 잘못되었습니다.' });
			}
			const emailExists = await usersRepository.checkDupRow('email', email)
			if (emailExists) {
				return reply.send({
					success: false,
					msg: '이미 존재하는 이메일 입니다.'
				})
			}
			return reply.send({
			success: true,
			msg: '사용가능한 이메일 입니다.'
			})
		} catch (err) {
			fastify.log.error(err)
			return reply.status(500).send({
			success: false,
			msg: '중복검사 처리 중 서버 내부 오류가 발생했습니다.'
			})
		}
		}
	)
}

export default plugin
