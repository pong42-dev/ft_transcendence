import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { UserProfileResponseSchema } from '../../../../schemas/users.js'
import { IdSchema } from '../../../../schemas/common.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { userProfilesRepository, authenticate } = fastify
	fastify.get(
		'/me',
		{
			schema: {
				response: {
					200: UserProfileResponseSchema,			
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
			const userId = request.user.user_id;
			const profile = await userProfilesRepository.getUserProfileWithStats(userId)
			if (!profile) {
				return reply.status(404).send({ msg: 'User not found.' });
			}
			return profile
		}
	)

	// GET /api/users/profile/:id
	fastify.get(
		'/:id',
		{
		preHandler: [fastify.authenticate],
		schema: {
			params: Type.Object({ id: IdSchema }),
			response: {
				200: UserProfileResponseSchema,			
				404: Type.Object({
					msg: Type.String()
				}),
				500: Type.Object({
					msg: Type.String()
				})
			},
			tags: ["Users"]
		}
		},
		async (request, reply) : Promise<void> => {
			const userId = request.params.id
			const profile = await userProfilesRepository.getUserProfileWithStats(userId)
			if (!profile) {
				return reply.status(404).send({ msg: 'User not found.' });
			}
			return profile
		}
	)
}

export default plugin 