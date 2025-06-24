import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { usersRepository, userProfilesRepository, user2FARepository, gamesRepository, authenticate } = fastify
	fastify.get(
		'/',
		{
			schema: {
				response: {
					200: Type.Object({
						success: Type.Literal(true),
						msg: Type.String(),
						data: Type.Object({
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
				/*
				profile...
				- avatar, 2fa, name, email
				- games, wins, win rate
				- 1v1 : game endedAt, guest name, winner name, rank(1,2)
				- tourn: tourn endedAt, guest1,2,3 name, winner name, rank(1,2,3)
				*/

				const userId = request.user.user_id;
				const userRow = await usersRepository.getRowByColumnValue('id', userId);
				const profileRow = await userProfilesRepository.getRowByColumnValue('user_id', userId);
				if (!profileRow) {
					return reply.status(404).send({ msg: 'User not found.' });
				}
				const twoFARow = await user2FARepository.getRowByColumnValue('user_id', userId);
				let is_enabled = false;
				if (twoFARow && twoFARow.is_enabled) {
					is_enabled = true;
				}
				const userInfo = {
					avatar : profileRow.avatar, 
					twoFA: is_enabled,
					name: profileRow.name,
					email: userRow.email // email도 보내줘야 하나? 
				}

				const games = await gamesRepository.getGameStats(userId);
				const wins = await gamesRepository.getTotalWins(userId);
				const winRate = games > 0 ? wins / games : 0;

				const gameStats = {
					games: games,
					wins: wins,
					winRate: winRate
				};

				const oneOnOneHistory = await gamesRepository.get1v1MatchHistory(userId, profileRow.name);
				const tournHistory = await gamesRepository.getTournMatchHistory(userId, profileRow.name);

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