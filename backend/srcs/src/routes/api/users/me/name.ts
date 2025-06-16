import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { FastifyRequest, FastifyReply } from 'fastify'
import { UserData } from '../../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate, userProfilesRepository } = fastify

	fastify.patch(
		'/name',
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
				return reply.status(200).send({
					success: false,
					msg: 'This name is already registered'
				});
			}
			await userProfilesRepository.updateRowByColumn("user_id", user_id, "name", newName);
			return reply.status(200).send({
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
