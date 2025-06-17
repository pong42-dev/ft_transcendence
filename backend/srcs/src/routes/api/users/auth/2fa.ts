import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { user2FARepository, usersRepository, authenticate, verify2FAToken, speakeasy, qrcode } = fastify

	fastify.post(
		'/2fa/enable',
		{
			schema: {
			response: {
				200: Type.Object({
				success: Type.Literal(true),
				msg: Type.String(),
				data: Type.Object({
					qrCodeUrl: Type.String()
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
			tags: ['Users']
			},
			preHandler: [authenticate]
		},
		async (request, reply): Promise<void> => {
			try {
				const userId = request.user.user_id;
				const user = await usersRepository.getRowByColumnValue("id", Number(userId));
				if (!user) {
					return reply.status(404).send({ msg: 'User not found.' });
				}
				const userEmail = user.email;
				const secret = speakeasy.generateSecret({
					name: `MyApp (${userEmail})`
				});
				if (!secret || !secret.otpauth_url)
					throw new Error('');
				const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
				// Store secret.base32 in DB
				try {
					await user2FARepository.deleteRowByColumnValue('user_id', userId);
				} catch (err) {
					request.log.warn(err, "Failed to delete 2FA, but continuing");
				}
				await user2FARepository.insertRow(userId, secret.base32);
				return reply.status(200).send({
					success: true,
					msg: 'QR code for 2FA setup has been generated.',
					data: {
						qrCodeUrl
					}
				});
			} catch (err) {
				return reply.status(500).send({ msg: 'An internal server error occurred during 2FA setup.' });
			}
		}
	);

	fastify.post(
		"/2fa",
		{
			schema: {
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
				500: Type.Object({
				msg: Type.String()
				})
			},
			tags: ["Users"]
			},
			preHandler: [authenticate, verify2FAToken]
		},
		async (request, reply): Promise<void> => {
			return reply.status(200).send({
				success: true,
				msg: "valid token"
			});
		}
	);

	fastify.post(
		"/2fa/disable",
		{
			schema: {
			response: {
				200: Type.Object({
				success: Type.Literal(true),
				msg: Type.String()
				}),
				500: Type.Object({
				msg: Type.String()
				})
			},
			tags: ["Users"]
			},
			preHandler: [authenticate, verify2FAToken]
		},
		async (request, reply): Promise<void> => {
			try {
				const userId = request.user.user_id;
				await user2FARepository.deleteRowByColumnValue('user_id', userId);
				return reply.send({
					success: true,
					msg: "2FA has been disabled successfully."
				});
			} catch (err) {
				return reply.status(500).send({ msg: 'An internal server error occurred during 2FA setup.', });
			}
		}
	);

}

export default plugin
