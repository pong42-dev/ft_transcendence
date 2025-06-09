import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { FastifyRequest, FastifyReply } from 'fastify'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { 
		config, 
		usersRepository, userProfilesRepository, 
		passwordManager, 
		registerFormData, saveFile, isValidRegisterFormData,
	} = fastify
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
				const formData = await registerFormData(request);
				if (! await isValidRegisterFormData(formData)){
					return reply.status(200).send({ success: false, msg: 'Invalid registration format.' });
				}
				const { email, password, name } = formData;
				const emailExists = await usersRepository.checkDupRow('email', email)
				const nameExists = await userProfilesRepository.checkDupRow('name', name)
				if (emailExists || nameExists) {
					return reply.status(200).send({ success: false, msg: 'This email or name is already registered.'});
				}
				const dirPath = config.UPLOAD_DIRNAME + '/' + config.UPLOAD_AVATAR_DIRNAME || 'uploads/avatars';
				const avatarPath = await saveFile(formData.files.avatar, dirPath);
				console.log ('formData:', formData);
				const hashedPassword = await passwordManager.hashPassword(password);
				const user_id = await usersRepository.insertRow(email, hashedPassword, 'local', '');
				await userProfilesRepository.insertRow(user_id, name, avatarPath, 'false');
				return reply.send({ success: true, msg: 'Registration completed successfully.'});
			} catch (err) {
				request.log.error(err);
				return reply.status(500).send({ success: false, msg: 'An internal server error occurred during registration.' });
			}
		}
	)
}

export default plugin
