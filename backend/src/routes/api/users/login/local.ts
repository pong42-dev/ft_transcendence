import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox';
import { Credentials } from '../../../../schemas/users/login/local.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
const { config,
		usersRepository, 
		loginManager, passwordManager, twoFAManager,
		isValidLoginCredentials } = fastify;

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
		200: Type.Union([
			Type.Object({
			success: Type.Literal(true),
			requires2FA: Type.Optional(Type.Boolean()),
			msg: Type.String(),
			data: Type.Optional(Type.Object({
				token: Type.String()
			})),
			}),
			Type.Object({
			success: Type.Literal(false),
			msg: Type.String(),
			})
		]),
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
		const validCredentialsMsg = isValidLoginCredentials(request.body as Credentials);
		if (validCredentialsMsg) {
		return reply.send({ 
			success: false,
			msg: validCredentialsMsg
		});
		}

		const sanitizedEmail = fastify.sanitizeHtml((request.body as Credentials).email);
		const password = (request.body as Credentials).password;

		const user = await usersRepository.getRowByColumnValue('email', sanitizedEmail);
		if (!user || user.provider != 'local') {
		return reply.status(401).send({ msg: 'Email or password is incorrect.' });
		}
		const isMatch = await passwordManager.comparePassword(password, user.password);
		if (!isMatch) {
		return reply.status(401).send({ msg: 'Email or password is incorrect.' });
		}

		// const isNotLoggedIn = await fastify.tokenManager.isNotLoggedIn(user.id);
		// if (!isNotLoggedIn) {
		// 	reply.status(409).send({
		// 		msg: 'This account is already in use. Please log out and try again.'
		// 	})
		// } 
		const tmpToken = await twoFAManager.generateTmpTokenFor2FA(request, reply, user.id);
		if (tmpToken) {
		return reply.send({
			success: true,
			requires2FA: true,
			msg: 'Two-factor authentication is required.',
			data: { token: tmpToken }
		});
		}
		await loginManager.login(fastify, user.id, reply, '');
	} catch (err) {
		fastify.log.error(err);
		return reply.status(500).send({ msg: 'An internal server error occurred during login.' });
	}
	}
);
};

export default plugin;
