import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox';
import { Credentials } from '../../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { usersRepository, passwordManager, loginManager } = fastify;
	fastify.post(
		'/local',
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
						msg: Type.String(),
						data: Type.Object({
							accessToken: Type.String()
						})
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
				const { email, password } = request.body as Credentials;
				const user = await usersRepository.getRowByColumnValue('email', email);
				if (!user || user.provider != 'local') {
					return reply.status(401).send({ msg: 'Email or password is incorrect.' });
				}
				const isMatch = await passwordManager.comparePassword(password, user.password);
				if (!isMatch) {
					return reply.status(401).send({ msg: 'Email or password is incorrect.' });
				}
				console.log ("local user:", user);
				await loginManager.login(user.id, reply, '');
			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({ msg: 'An internal server error occurred during login.' });
			}
		}
	);
};

export default plugin;
