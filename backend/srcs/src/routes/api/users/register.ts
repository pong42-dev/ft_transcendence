import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { FastifyRequest, FastifyReply } from 'fastify'
import fs from 'fs';
import path from 'path';
import type { MultipartFile } from '@fastify/multipart';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { 
		config, 
		usersRepository, userProfilesRepository, 
		passwordManager, 
		formDataManager, fileManager, isValidRegisterFormData,
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
				// const avatarPath = await fileManager.saveFile(formData.files.avatar.file, dirPath);
				const defaultAvatarPath = path.join(config.ASSETS_DIRNAME, './default-avatar.png');
				let avatarPath: string;
				if (formData.files && formData.files.avatar) {
					avatarPath = await fileManager.saveFile(formData.files.avatar.file, dirPath);
				} else {
					const defaultBuffer = fs.readFileSync(defaultAvatarPath);
					// MultipartFile처럼 보이도록 mock 객체 생성
					const fakeMultipartFile = {
						filename: 'default-avatar.png',
						toBuffer: async () => defaultBuffer,
					};
					avatarPath = await fileManager.saveFile(fakeMultipartFile as MultipartFile, dirPath);
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

