import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { UserData } from '../../../../schemas/users/common.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { config,
			userProfilesRepository, userTokensRepository, tmpTokenRepository,
			googleOAuth2Manager, authenticate, passwordManager } = fastify;

	fastify.post(
		'/logout',
		{
			config: {
				rateLimit: {
					max: config.RATE_LIMIT_USER_MAX,
					timeWindow: config.RATE_LIMIT_USER_WINDOW
				}
			},
			schema: {
				security: [{ bearerAuth: [] }],
				headers: Type.Object({
					authorization: Type.String(),
					cookies: Type.String({
						description: 'refresh_token=abc123;'
					}),
				}),
				response: {
					200: Type.Object({
						success: Type.Literal(true),
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
				tags: ["Users"],
			},
			preHandler: [authenticate]
		},
		async function (request, reply) {
			try {
				const { user_id } = request.user as UserData;
				const refreshToken = request.cookies.refresh_token;
				if (!refreshToken) {
					return reply.status(401).send({ msg: "Invalid or expired token." });
				}
				const userToken = await userTokensRepository.getRowByColumnValue("user_id", user_id);
				if (!userToken) {
					return reply.status(404).send({ msg: "User not found." });
				}
				const isMatch = await passwordManager.comparePassword(refreshToken, userToken.server_refresh_token);
				if (!isMatch) {
					return reply.status(401).send({ msg: "Invalid or expired token." });
				}
				if (userToken.google_refresh_token) {
					await googleOAuth2Manager.revokeGoogleToken(userToken.google_refresh_token);
				}
				await userTokensRepository.deleteRowByColumnValue("user_id", user_id);
				await tmpTokenRepository.deleteRowByColumnValue("user_id", user_id);
				reply.clearCookie('refresh_token', { path: '/' });
				await userProfilesRepository.updateRowByColumn("user_id", user_id, "status", false);
				return reply.send({
					success: true,
					msg: "Successfully logged out.",
				});
			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({
					msg: "An internal server error occurred during logout.",
				});
			}
		}
	);
};

export default plugin;
