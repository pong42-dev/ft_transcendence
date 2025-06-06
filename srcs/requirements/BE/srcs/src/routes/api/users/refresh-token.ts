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
				tags: ['Users']
			},
			errorHandler: (error, request, reply) => {
				request.log.error(error)
				reply.status(401).send({
					success: false,
					msg: '유효하지 않거나 만료된 토큰입니다. 다시 로그인해 주세요.'
				})
			}
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { userTokensRepository, passwordManager } = fastify
			const { refresh_token } = request.cookies
			// console.log('refresh_token', refresh_token);
			const unauthorized = () =>
				reply.status(401).send({
					success: false,
					msg: '유효하지 않거나 만료된 토큰입니다. 다시 로그인해 주세요.'
				})
			try {
				if (!refresh_token) {
					return unauthorized()
					return ;
				}
				const decoded = await fastify.jwt.verify(refresh_token) as TokenData
				if (!decoded || !decoded.user_id) {
					return unauthorized()
				}
				// console.log("decoded:", decoded);
				const rows = await userTokensRepository.getRowByColumnValue('user_id', decoded.user_id)
				const hashedRefreshToken = rows[0]?.server_refresh_token
				// console.log("hashedRefreshToken:", hashedRefreshToken);
				if (
					!hashedRefreshToken ||
					!passwordManager.comparePassword(refresh_token, hashedRefreshToken)
				) {
					return unauthorized()
				}
				const newAccessToken = fastify.jwt.sign({ user_id: decoded.user_id })
				return reply.send({
					success: true,
					accessToken: newAccessToken
				})
			} catch (err) {
				request.log.error('토큰 재발급 중 오류:', err)
				return unauthorized()
			}
		}
	)
}

export default plugin