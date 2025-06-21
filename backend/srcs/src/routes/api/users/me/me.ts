import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { UserProfileResponseSchema } from '../../../../schemas/users.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify

	fastify.get(
		'/',
		{
			schema: {
				response: {
					200: Type.Object({
						success: Type.Literal(true),
						msg: Type.String(),
						data: Type.Object({
							me: UserProfileResponseSchema
						})
					}),
					401: Type.Object({
						msg: Type.String()
					}),
					404: Type.Object({
						msg: Type.String()
					}),
					500: Type.Object({
						msg: Type.String()
					})
				},
				tags: ["Users"]
			},
			preHandler: [authenticate]
		}, 
		async (request, reply) : Promise<void> => {
			try {
				const profile = request.user;
				reply.send({
					success: true,
					msg: 'User Profile successfully retrieved.',
					data: {
						me: profile
					}
				});
				} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({ msg: 'An internal server error occurred while retrieving the user profile.' });
			}
	
		}
	)
}

export default plugin 