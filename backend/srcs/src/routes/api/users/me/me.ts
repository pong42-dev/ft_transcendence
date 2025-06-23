import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { UserProfileResponseSchema } from '../../../../schemas/users.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { usersRepository, userProfilesRepository, authenticate } = fastify
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
				const userId = request.user.user_id;
				const profile = await userProfilesRepository.getUserProfileWithStats(userId);
				if (!profile) {
					return reply.status(404).send({ msg: 'User not found.' });
				}
				/*
					<유저 정보>
					- users
					email: 

					- user profiles 
					name:
					avatar:
					
					<game stats>
					- game 
					games:
					wins:
					win Rate:

					<match history game>
					- game
					종료시간: 
					유저: 
					게스트:
					승자: 

					<match history tourn>
					- tourn
					종료시간:
					유저:
					게스트1-3:
					win/lose: 

				*/
				reply.status(200).send({
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