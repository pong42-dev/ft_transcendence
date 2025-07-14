import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { InitUser2FASchema } from '../../../../schemas/users/auth/twofa.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { config, 
			user2FARepository, 
			authenticate, loginManager, twoFAManager } = fastify

	fastify.post(
		'/2fa/enable/init',
		{
			config: {
				rateLimit: {
					max: config.RATE_LIMIT_SENSITIVE_MAX,
					timeWindow: config.RATE_LIMIT_SENSITIVE_WINDOW
				}
			},
			schema: {
			security: [{ bearerAuth: [] }],
			response: {
				200: Type.Object({
				success: Type.Literal(true),
				msg: Type.String(),
				data: InitUser2FASchema
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
			tags: ['Users']
			},
			preHandler: [authenticate]
		},
		async (request, reply): Promise<void> => {
			try {
				const data = await twoFAManager.init2FA(request, reply);
				return reply.send({
					success: true,
					msg: 'QR code for 2FA setup has been generated.',
					data: {
						qrCodeUrl: data.qrCodeUrl,
						secret: data.secret,
						token: data.token
					}
				});
			} catch (err) {
				return reply.status(500).send({ msg: 'An internal server error occurred during 2FA setup.' });
			}
		}
	);

	fastify.post(
		"/2fa/enable",
		{
			config: {
				rateLimit: {
					max: config.RATE_LIMIT_SENSITIVE_MAX,
					timeWindow: config.RATE_LIMIT_SENSITIVE_WINDOW
				}
			},
			schema: {
			security: [{ bearerAuth: [] }],
			body: Type.Object({
				token: Type.String(),
				tmpToken: Type.String()
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
				409: Type.Object({
				msg: Type.String()
				}),
				500: Type.Object({
				msg: Type.String()
				})
			},
			tags: ["Users"]
			},
			preHandler: [authenticate, twoFAManager.verify2FAToken2]
		},
		async (request, reply): Promise<void> => {
			try {
				const userId = request.user.user_id;
				const user2FARow = await user2FARepository.getRowByColumnValue('user_id', userId);
				if (!user2FARow || (user2FARow && !user2FARow.is_enabled)) {
					reply.status(409).send({
						msg: "This account already has 2FA enabled. Please disable it before setting up again."
					})
				}
				await user2FARepository.updateRowByColumn('user_id', userId, 'is_enabled', true);
				return reply.send({
					success: true,
					msg: '2FA has been enabled successfully.'
				});
			} catch (err) {
				return reply.status(500).send({ msg: 'An internal server error occurred during 2FA setup.' });
			}
		}
	);


	fastify.post(
		"/2fa/disable",
		{
			config: {
				rateLimit: {
					max: config.RATE_LIMIT_SENSITIVE_MAX,
					timeWindow: config.RATE_LIMIT_SENSITIVE_WINDOW
				}
			},
			schema: {
			security: [{ bearerAuth: [] }],
			body: Type.Object({
				token: Type.String()
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
				409: Type.Object({
				msg: Type.String()
				}),
				500: Type.Object({
				msg: Type.String()
				})
			},
			tags: ["Users"]
			},
			preHandler: [authenticate, twoFAManager.verify2FATokenWithoutTmpToken]
		},
		async (request, reply): Promise<void> => {
			try {
				const userId = request.user.user_id;
				const user2FARow = await user2FARepository.getRowByColumnValue('user_id', userId);
				if (!user2FARow || (user2FARow && !user2FARow.is_enabled)) {
					reply.status(409).send({
						msg: "This account already has 2FA disabled. Please enable it before setting up again."
					})
				}
				await user2FARepository.deleteRowByColumnValue('user_id', userId);
				return reply.send({
					success: true,
					msg: '2FA has been disabled successfully.'
				});
			} catch (err) {
				return reply.status(500).send({ msg: 'An internal server error occurred during 2FA setup.', });
			}
		}
	);

	fastify.post(
		"/2fa",
		{
			config: {
				rateLimit: {
					max: config.RATE_LIMIT_SENSITIVE_MAX,
					timeWindow: config.RATE_LIMIT_SENSITIVE_WINDOW
				}
			},
			schema: {
			body: Type.Object({
				token: Type.String(),
				tmpToken: Type.String()
			}),
			response: {
				200: Type.Object({
				success: Type.Literal(true),
				msg: Type.String(),
				data: Type.Object({
					token: Type.String()
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
			preHandler: [twoFAManager.verify2FAToken]
		},
		async (request, reply): Promise<void> => {
			const { user_id:userId } = request.user;
			await loginManager.login(userId, reply, '');
		}
	);

}

export default plugin
