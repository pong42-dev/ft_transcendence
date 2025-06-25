import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { UserProfileResponseSchema } from '../../../../schemas/users.js'
import { IdSchema } from '../../../../schemas/common.js'
import { Profiles, UserData, UserFriendSchema } from '../../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { userProfilesRepository, friendsRepository, authenticate } = fastify
	
	// GET /api/users/me/friends
	fastify.get(
		'/friends',
		{
			schema: {
				security: [{ bearerAuth: [] }],
				response: {
					200: Type.Object({
						success: Type.Literal(true),
						msg: Type.String(),
						data: Type.Object({
							friends: Profiles
						})
					}),
					401: Type.Object({
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
		async (request, reply): Promise<void> => {
			try {
				const { user_id: userId } = request.user as UserData;
				const friendList = await friendsRepository.getRowsByColumnValue("user_id", userId);
				const friendsProfile = [];
				for (const friendRow of friendList) {
					const friendId = friendRow.friend_id;
					const friendProfile = await userProfilesRepository.getRowByColumnValue("user_id", friendId);
					if (friendProfile) {
						friendsProfile.push(friendProfile);
					}
				}
				reply.send({
					success: true,
					msg: 'Friend list successfully retrieved.',
					data: {
						friends: friendsProfile
					}
				});
			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({ msg: 'An internal server error occurred while retrieving friend list.' });
			}
		}
	);

	// POST /api/users/me/friends
	fastify.post(
		'/friends',
		{
			schema: {
				security: [{ bearerAuth: [] }],
				body: Type.Object({
					friend_name: Type.String()
				}),
				response: {
					200: Type.Object({
						success: Type.Literal(true),
						msg: Type.String()
					}),	
					401: Type.Object({
						msg: Type.String()
					}),
					409: Type.Object({
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
		async (request, reply): Promise<void> => {
			try {
				const { user_id: userId } = request.user as UserData;
				const { friend_name: friendName } = request.body;
				const row = await userProfilesRepository.getRowByColumnValue("name", friendName);
				const friendId = row?.user_id;
				if (!friendId)
					return reply.status(409).send({ msg: 'User does not exist.' });
				const isFollowing = await friendsRepository.isFollowing(Number(userId), Number(friendId));
				if (isFollowing)
					return reply.status(409).send({ msg: 'You are already following this user.' });
				await friendsRepository.insertRow(userId, friendId, 'following');
				return reply.send({ 
					success: true,
					msg: 'Successfully followed the user.' 
				});
			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({ msg: 'An internal server error occurred while following the user.' });
			}
		}
	);

	// GET /api/users/me/friends/:id
	fastify.get(
		'/friends/:id',
		{
			schema: {
				security: [{ bearerAuth: [] }],
				params: Type.Object({ id: IdSchema }),
				response: {
					200: Type.Object({
						success: Type.Literal(true),
						msg: Type.String(),
						data: Type.Object({
							userInfo: UserFriendSchema
						})
					}),
					401: Type.Object({
						msg: Type.String()
					}),
					404: Type.Object({
						msg: Type.String()
					}),
					409: Type.Object({
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
		async (request, reply): Promise<void> => {
			try {
				const userId = request.user.user_id;
				const friendId = request.params.id;
				if (!friendId || userId === friendId)
					return reply.status(409).send({ msg: 'Invalid friend ID.' });
				const isFollowing = await friendsRepository.isFollowing(Number(userId), Number(friendId));
				if (!isFollowing)
					return reply.status(409).send({ msg: 'You are not following this user.' });

				const profileRow = await userProfilesRepository.getRowByColumnValue('user_id', friendId);
				if (!profileRow) {
					return reply.status(404).send({ msg: 'User not found.' });
				}
				console.log('profileRow.avatar:', profileRow.avatar);
				const avatarPath = profileRow.avatar ?? `${config.PUBLIC_DIRNAME}/default-avatar.png`;
				console.log(avatarPath);
				// const avatarUrl = `http://localhost:3000/api/users/me/avatar/${userId}`;
				const avatarUrl = `http://localhost:3000/${avatarPath}`;
				const userInfo = {
					name: profileRow.name,
					avatar : avatarUrl, 
				}
				console.log("userInfo", userInfo);
				// const games = await gamesRepository.getGameStats(userId);
				// const wins = await gamesRepository.getTotalWins(userId);
				// const winRate = games > 0 ? wins / games : 0;

				// const gameStats = {
				// 	games: games,
				// 	wins: wins,
				// 	winRate: winRate
				// };

				// const oneOnOneHistory = await gamesRepository.get1v1MatchHistory(userId, profileRow.name);
				// const tournHistory = await gamesRepository.getTournMatchHistory(userId, profileRow.name);

				reply.status(200).send({
					success: true,
					msg: 'User Profile successfully retrieved.',
					data: {
						userInfo: userInfo,
						// gameStats: gameStats,
						// oneOnOneHistory: oneOnOneHistory,
						// tournHistory: tournHistory
					}
				});

			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({ msg: 'An internal server error occurred while retrieving the user profile.' });
			}
		}
	);

	// DELETE /api/users/me/friends/:id
	fastify.delete(
		'/friends/:id',
		{
			schema: {
				security: [{ bearerAuth: [] }],
				params: Type.Object({ id: IdSchema }),
				response: {
					200: Type.Object({
						success: Type.Literal(true),
						msg: Type.String()
					}),	
					401: Type.Object({
						msg: Type.String()
					}),
					409: Type.Object({
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
		async (request, reply): Promise<void> => {
			try {
				const { user_id: userId } = request.user as UserData;
				const friendId = request.params.id;
				if (!friendId || userId === friendId)
					return reply.status(409).send({ msg: 'Invalid friend ID.' });
				const isFollowing = await friendsRepository.isFollowing(Number(userId), Number(friendId));
				if (!isFollowing)
					return reply.status(409).send({ msg: 'You are not following this user.' });
				await friendsRepository.deleteFriendship(userId, friendId);
				return reply.send({ 
					success: true,
					msg: 'Successfully unfollowed the user.' 
				});
			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({ msg: 'An internal server error occurred while unfollowing the user.' });
			}
		}
	);
}

export default plugin
