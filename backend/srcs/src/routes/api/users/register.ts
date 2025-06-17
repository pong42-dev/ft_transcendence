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
						success: Type.Literal(false),
						msg: Type.String()
					}),
					201: Type.Object({
						msg: Type.String()
					}),
					500: Type.Object({
						msg: Type.String()
					}),
				},
				tags: ["Users"]
			}
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				console.log(1);
				const formData = await registerFormData(request);
				console.log(2);
				const validFormDataMsg = isValidRegisterFormData(formData);
				console.log(3);
				if (validFormDataMsg) {
					return reply.status(200).send({ 
						success: false,
						msg: validFormDataMsg 
					});
				}
				console.log(4);
				const { email, password, name } = formData;
				console.log(5);
				const emailExists = await usersRepository.checkDupRow('email', email)
				console.log(6);
				const nameExists = await userProfilesRepository.checkDupRow('name', name)
				console.log(7);
				if (emailExists) {
					return reply.status(200).send({
						success: false,
						msg: 'This email is already registered.' 
					});
				}
				if (nameExists) {
					return reply.status(200).send({
						success: false,
						msg: 'This name is already registered.' 
					});
				}
				const dirPath = config.UPLOAD_DIRNAME + '/' + config.UPLOAD_AVATAR_DIRNAME || 'uploads/avatars';
				const avatarPath = await saveFile(formData.files.avatar.file, dirPath);
				const hashedPassword = await passwordManager.hashPassword(password);
				const user_id = await usersRepository.insertRow(email, hashedPassword, 'local', '');
				await userProfilesRepository.insertRow(user_id, name, avatarPath, 'false');
				return reply.status(201).send({
					msg: 'Registration completed successfully.' 
				});
			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({
					msg: 'An internal server error occurred during registration.' 
				});
			}
		}
	)
}

export default plugin

