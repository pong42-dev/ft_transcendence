import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { UserData } from '../../../schemas/auth.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { userProfilesRepository, userTokensRepository, tmpTokenRepository,
		googleOAuth2Manager, authenticate, passwordManager } = fastify;

	fastify.post(
		'/logout',
		{
			config: {
				rateLimit: {
					max: 5,
					timeWindow: '1 minute'
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
				const userToken = await userTokensRepository.getRowByColumnValue("user_id", user_id);
				console.log(userToken?.server_refresh_token);
				console.log(request?.cookies);
				const refreshToken = request.cookies.refresh_token;
				if (refreshToken) {
					const isMatch = await passwordManager.comparePassword(refreshToken, userToken.server_refresh_token);
					if (isMatch) {
						console.log("user_id: ", user_id);
						if (userToken && userToken.google_refresh_token) {
							await googleOAuth2Manager.revokeGoogleToken(userToken.google_refresh_token);
						}
						await userTokensRepository.deleteRowByColumnValue("user_id", user_id);
						await tmpTokenRepository.deleteRowByColumnValue("user_id", user_id);
						reply.clearCookie('refresh_token', { path: '/' });
						await userProfilesRepository.updateRowByColumn("user_id", user_id, "status", false);
						return reply.send({ 
							success: true,
							msg: "Successfully logged out." 
						});
					}
				}
				return reply.status(404).send({ 
					msg: "user not found" 
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
