import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { UserProfileResponseSchema } from '../../../../schemas/profile.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { config, 
			usersRepository, userProfilesRepository, user2FARepository, gameRepository, tournamentsRepository, 
			authenticate } = fastify

	fastify.get(
		'/',
		{
			config: {
				rateLimit: {
					max: config.RATE_LIMIT_USER_MAX,
					timeWindow: config.RATE_LIMIT_USER_WINDOW
				}
			},
			schema: {
				response: {
					200: Type.Object({
						success: Type.Literal(true),
						msg: Type.String(),
						data: UserProfileResponseSchema
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
				const userRow = await usersRepository.getRowByColumnValue('id', userId);
				const profileRow = await userProfilesRepository.getRowByColumnValue('user_id', userId);
				if (!profileRow) {
					return reply.status(404).send({ msg: 'User not found.' });
				}
				console.log('profileRow.avatar:', profileRow.avatar);
				const avatarPath = profileRow.avatar ?? `${config.PUBLIC_DIRNAME}/default-avatar.png`;
				console.log(avatarPath);
				// const avatarUrl = `http://localhost:3000/api/users/me/avatar/${userId}`;
				const avatarUrl = `http://localhost:3000/${avatarPath}`;
				const twoFARow = await user2FARepository.getRowByColumnValue('user_id', userId);
				let is_enabled = false;
				if (twoFARow && twoFARow.is_enabled) {
					is_enabled = true;
				}
				const userInfo = {
					email: userRow.email,
					name: profileRow.name,
					avatar : avatarUrl, 
					twoFA: is_enabled,
					provider: userRow.provider
				}
				console.log("userInfo", userInfo);
				const gameStats = await gameRepository.getUserGameStats(userId);
				const oneOnOneHistory = await gameRepository.getUser1v1History(userId);
				console.log("oneOnOneHistory: ", oneOnOneHistory);
				const tournHistory = await tournamentsRepository.getTournamentHistoryForProfile(userId);
				console.log("tournHistory: ", tournHistory);
				// console.log(JSON.stringify(tournHistory[0].rounds, null, 2));

				reply.status(200).send({
					success: true,
					msg: 'User Profile successfully retrieved.',
					data: {
						userInfo: userInfo,
						gameStats: gameStats,
						oneOnOneHistory: oneOnOneHistory,
						tournHistory: tournHistory
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
