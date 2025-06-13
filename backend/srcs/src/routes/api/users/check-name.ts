import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { UserName } from '../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { userProfilesRepository, isValidName } = fastify
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
				tags: ["Users"]
			}
		},
		async function (request, reply) {
			try {
				const { name } = request.body as UserName;
				if (!isValidName(name)) {
					return reply.status(200).send({ success: false, msg: 'Invalid name format.' });
				}
				const nameExists = await userProfilesRepository.checkDupRow('name', name);
				if (nameExists) {
					return reply.send({ success: false, msg: 'Name already exists.' });
				}
				return reply.send({ success: true, msg: 'Name is available.' });
			} catch (err) {
				request.log.error(err)
				return reply.status(500).send({
					success: false,
					msg: 'An internal server error occurred during name duplication check.'
				});
			}
		}
	)
}

export default plugin
