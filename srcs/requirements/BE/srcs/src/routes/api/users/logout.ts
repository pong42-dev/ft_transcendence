import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { userProfilesRepository, userTokensRepository, tokenManager, googleOAuth2Manager} = fastify;

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
					// 400: Type.Object({
					// 	success: Type.Boolean(),
					// 	msg: Type.String(),
					// }),
					500: Type.Object({
						success: Type.Boolean(),
						msg: Type.String(),
					}),
				},
				tags: ['Users'],
			},
		},
		async function (request, reply) {
			try {
				if (request.cookies.refreshToken) {
					const decoded = await tokenManager.verifyRefreshToken(
						request.cookies.refreshToken
					);
					if (decoded) {
						const userTokens = await userTokensRepository.getRowByColumnValue('user_id', decoded.user_id);
						const userToken = userTokens[0];
						if (userToken && userToken.google_refresh_token) {
							await googleOAuth2Manager.revokeGoogleToken(userToken.google_refresh_token);
						}
						// console.log ("user_id:", decoded.user_id);
						await userTokensRepository.deleteRowByColumnValue('user_id', decoded.user_id);
						await userProfilesRepository.updateRowByColumn('user_id', decoded.user_id, 'status', false);
					}
					reply.clearCookie(this.config.COOKIE_NAME, { path: '/' });
				}
				return reply.send({
					success: true,
					msg: '로그아웃이 완료되었습니다.',
				});
			} catch (err) {
				return reply.status(500).send({
					success: false,
					msg: '로그아웃 처리 중 서버 내부 오류가 발생했습니다.',
				});
			}
		}
	);
};

export default plugin;
