import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { FastifyRequest, FastifyReply } from 'fastify'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { config, 
			usersRepository, userProfilesRepository, 
			passwordManager, 
			isValidRegisterFormData,
			formDataManager, fileManager } = fastify

	fastify.post(
		'/register',
		{
			config: {
				rateLimit: {
					max: config.RATE_LIMIT_AUTH_MAX,
					timeWindow: config.RATE_LIMIT_AUTH_WINDOW
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
				const formData = await formDataManager.registerFormData(request);
				const validFormDataMsg = isValidRegisterFormData(formData);
				if (validFormDataMsg) {
					return reply.send({ 
						success: false,
						msg: validFormDataMsg 
					});
				}
				const { email, password, name } = formData;
				const emailExists = await usersRepository.checkDupRow('email', email)
				const nameExists = await userProfilesRepository.checkDupRow('name', name)
				if (emailExists) {
					return reply.send({
						success: false,
						msg: 'This email is already registered.' 
					});
				}
				if (nameExists) {
					return reply.send({
						success: false,
						msg: 'This name is already registered.' 
					});
				}
				const dirPath = config.PUBLIC_DIRNAME + '/' + config.USERS_DIRNAME + '/' + config.AVATAR_DIRNAME;
				console.log("dirPath:", dirPath);
				let avatarPath: string | undefined;
				console.log(formData.files.avatar);
				if (formData.files && formData.files.avatar) {
					console.log("here1");
					avatarPath = await fileManager.saveFile(formData.files.avatar.file, dirPath);
				} else {
					console.log("here2");
					avatarPath = undefined
				}
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

