import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { FastifyRequest, FastifyReply } from 'fastify'
import { UserData } from '../../../../schemas/users/common.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { config,
			userProfilesRepository,
			authenticate } = fastify

	fastify.patch(
		'/name',
		{
			config: {
				rateLimit: {
					max: config.RATE_LIMIT_USER_MAX,
					timeWindow: config.RATE_LIMIT_USER_WINDOW
				}
			},
			schema: {
				security: [{ bearerAuth: [] }],
				body: Type.Object({
					name: Type.String(),
				}),
				response: {
					200: Type.Object({
						success: Type.Boolean(),
						msg: Type.String()
					}),
					401: Type.Object({
						msg: Type.String()
					}),
					404: Type.Object({
						msg: Type.String()
					}),
					500: Type.Object({
						msg: Type.String()
					}),
				},
				tags: ["Users"]
			},
			preHandler: [authenticate]
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			console.log ("request.user:", request.user);
			const { user_id } = request.user as UserData;
			const { name: newName } = request.body as UserData;
			const nameExists = await userProfilesRepository.checkDupRow('name', newName)
			if (nameExists) {
				return reply.send({
					success: false,
					msg: 'This name is already registered'
				});
			}
			await userProfilesRepository.updateRowByColumn("user_id", user_id, "name", newName);
			return reply.send({
				success: true,
				msg: 'Name has been updated.'
			});
		} catch (err) {
			fastify.log.error(err);
			return reply.status(500).send({
				msg: 'An internal server error occurred while processing the nickname update.'
			});
		}
		}
	)
}

export default plugin
