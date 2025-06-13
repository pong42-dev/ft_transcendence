import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { UserEmail } from '../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { usersRepository, isValidEmail } = fastify

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
						msg: Type.String()
					}),
				},
				tags: ["Users"]
			}
		},
		async function (request, reply) {
			try {
				const { email } = request.body as UserEmail;
				if (!isValidEmail(email)) {
					return reply.status(200).send({ success: false, msg: 'Invalid email format.' });
				}
				const emailExists = await usersRepository.checkDupRow('email', email)
				if (emailExists) {
					return reply.send({ success: false, msg: 'Email already exists.' })
				}
				return reply.send({ success: true, msg: 'Email is available.' })
			} catch (err) {
				fastify.log.error(err)
				return reply.status(500).send({ msg: 'An internal server error occurred during email duplication check.' })
			}
		}
	)
}

export default plugin
