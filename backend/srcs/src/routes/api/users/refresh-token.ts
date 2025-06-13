import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { FastifyRequest, FastifyReply } from 'fastify'
import { TokenData } from '../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	
	fastify.post(
		'/refresh-token',
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
						accessToken: Type.Optional(Type.String())
					}),
					401: Type.Object({
						success: Type.Boolean(),
						msg: Type.String()
					})
				},
				tags: ["Users"]
			}
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { userTokensRepository, passwordManager } = fastify
			const { refresh_token: refreshToken } = request.cookies
			// console.log('refreshToken:', refreshToken);
			try {
				if (!refreshToken) {
					return reply.status(401).send({ success: false, msg: 'Invalid or expired token.'});
				}
				const decoded = await fastify.jwt.verify(refreshToken) as TokenData
				if (!decoded || !decoded.user_id) {
					return reply.status(401).send({ success: false, msg: 'Invalid or expired token.'});
				}
				// console.log("decoded:", decoded);
				const row = await userTokensRepository.getRowByColumnValue('user_id', decoded.user_id)
				const hashedRefreshToken = row?.server_refresh_token
				// console.log("hashedRefreshToken:", hashedRefreshToken);
				if (!hashedRefreshToken || !passwordManager.comparePassword(refreshToken, hashedRefreshToken)) {
					return reply.status(401).send({ success: false, msg: 'Invalid or expired token.'});
				}
				const newAccessToken = fastify.jwt.sign({ user_id: decoded.user_id })
				return reply.send({ success: true, accessToken: newAccessToken })
			} catch (err) {
				request.server.log.error(err);
				return reply.status(500).send({
					success: false,
					msg: 'An internal server error occurred while refreshing the token.'
				});
			}
		}
	)
}

export default plugin