import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { UserData } from '../../../schemas/auth.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { userProfilesRepository, userTokensRepository, googleOAuth2Manager, authenticate } = fastify;

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
				response: {
					200: Type.Object({
						success: Type.Boolean(),
						msg: Type.String(),
					}),
					500: Type.Object({
						success: Type.Boolean(),
						msg: Type.String(),
					}),
				},
				tags: ["Users"],
			},
			preHandler: [authenticate]
		},
		async function (request, reply) {
			try {
				if (request.cookies.refresh_token) {
					const { user_id } = request.user as UserData;
					console.log("user_id: ", user_id);
					const userToken = await userTokensRepository.getRowByColumnValue("user_id", user_id);
					if (userToken && userToken.google_refresh_token) {
						await googleOAuth2Manager.revokeGoogleToken(userToken.google_refresh_token);
					}
					await userTokensRepository.deleteRowByColumnValue("user_id", user_id);
					await userProfilesRepository.updateRowByColumn("user_id", user_id, "status", false);
					reply.clearCookie(this.config.COOKIE_NAME, { path: '/' });
				}
				return reply.send({ success: true, msg: "Successfully logged out." });
			} catch (err) {
				return reply.status(500).send({
					success: false,
					msg: "An internal server error occurred during logout.",
				});
			}
		}
	);
};

export default plugin;
