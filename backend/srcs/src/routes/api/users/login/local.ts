import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox';
import { CredentialsSchema } from '../../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { usersRepository, passwordManager, loginManager, customErrorHandler } = fastify;
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
				body: CredentialsSchema,
				response: {
					200: Type.Object({
						success: Type.Boolean(),
						msg: Type.String(),
					}),
					401: Type.Object({
						success: Type.Literal(false),
						msg: Type.String()
					}),
					500: Type.Object({
						success: Type.Literal(false),
						msg: Type.String()
					})
				},
				tags: ['Users']
			},
			errorHandler: customErrorHandler('닉네임 중복확인')
		},
		async function (request, reply): Promise<void> {
		try {
			const { email, password } = request.body as CredentialsSchema;
			const users = await usersRepository.getRowByColumnValue('email', email);
			const user = users[0];
			if (!user || user.provider != 'local') {
				return reply.status(401).send({ success: false, msg: '존재하지 않는 아이디입니다.' });
			}
			const isMatch = await passwordManager.comparePassword(password, user.password);
			if (!isMatch) {
				return reply.status(401).send({ success: false, msg: '비밀번호가 틀렸습니다.' });
			}
			await loginManager.login(user, request, reply, '');
		} catch (err) {
			request.server.log.error(err);
			return reply.status(500).send({
				success: false,
				msg: '로그인 처리 중 서버 내부 오류가 발생했습니다.'
			});
		}
		}
	);
};

export default plugin;
