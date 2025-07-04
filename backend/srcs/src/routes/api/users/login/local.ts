import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox';
import { Credentials } from '../../../../schemas/users/login/local.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { config,
			usersRepository, 
			loginManager, passwordManager, twoFAManager } = fastify;

	fastify.post(
		'/local',
		{
			config: {
				rateLimit: {
					max: config.RATE_LIMIT_AUTH_MAX,
					timeWindow: config.RATE_LIMIT_AUTH_WINDOW
				}
			},
			schema: {
				body: Type.Object({
					email: Type.String(),
					password: Type.String()
				}),
				response: {
					200: Type.Object({
						success: Type.Literal(true),
						requires2FA: Type.Optional(Type.Boolean()),
						msg: Type.String(),
						data: Type.Optional(Type.Object({
							token: Type.String()
						})),
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
			}
		},
		async function (request, reply): Promise<void> {
			try {
				console.log(request.body);
				const { email, password } = request.body as Credentials;
				const user = await usersRepository.getRowByColumnValue('email', email);
				if (!user || user.provider != 'local') {
					return reply.status(401).send({ msg: 'Email or password is incorrect.' });
				}
				const isMatch = await passwordManager.comparePassword(password, user.password);
				if (!isMatch) {
					return reply.status(401).send({ msg: 'Email or password is incorrect.' });
				}
				const tmpToken = await twoFAManager.require2FA(request, reply, user.id);
				if (tmpToken) {
					return reply.send({
					success: true,
					requires2FA: true,
					msg: 'Two-factor authentication is required.',
					data: { token: tmpToken }
					});
				}
				await loginManager.login(user.id, reply, '');
			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({ msg: 'An internal server error occurred during login.' });
			}
		}
	);
};

export default plugin;
