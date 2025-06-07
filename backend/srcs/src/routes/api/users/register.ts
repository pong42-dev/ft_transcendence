import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { FastifyRequest, FastifyReply } from 'fastify'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { config, usersRepository, userProfilesRepository, passwordManager, registerFormData, isValidEmail} = fastify
	fastify.post(
		'/register',
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
						msg: Type.String()
					}),
					500: Type.Object({
						success: Type.Boolean(),
						msg: Type.String()
					}),
				},
				tags: ['Users']
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const dirPath = config.UPLOAD_DIRNAME + '/' + config.UPLOAD_AVATAR_DIRNAME || 'uploads/avatars';
			const formData = await registerFormData(request, dirPath);
			const { email, password, name, avatar } = formData;
			console.log ('formData:', formData);
			if (!isValidEmail(email)) {
				return reply.status(200).send({ success: false, msg: '이메일 형식이 잘못되었습니다.' });
			}
			const emailExists = await usersRepository.checkDupRow('email', email)
			if (emailExists) {
				return reply.status(200).send({ success: false, msg: '이미 존재하는 아이디입니다'});
			}
			const nameExists = await userProfilesRepository.checkDupRow('name', name)
			if (nameExists) {
				return reply.status(200).send({ success: false, msg: '이미 존재하는 닉네임입니다'});
			}
			const hashedPassword = await passwordManager.hashPassword(password);
			const user_id = await usersRepository.insertRow(email, hashedPassword, 'local', '');
			await userProfilesRepository.insertRow(user_id, name, avatar, 'false');
			return reply.send({ success: true, msg: '회원가입이 완료되었습니다.'});
			
		} catch (err) {
			request.log.error(err);
			return reply.status(500).send({ success: false, msg: '회원가입 처리 중 서버 내부 오류가 발생했습니다.' });
		}
		}
	)
}

export default plugin
