import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { FastifyRequest, FastifyReply } from 'fastify'
import { UserData } from '../../../../schemas/auth.js'
import fs from 'fs';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { 
		config, userProfilesRepository,
		formDataManager, fileManager,
		authenticate, isValidProfileFormData
	} = fastify;

	fastify.put(
		'/avatar',
		{
			config: {
				rateLimit: {
					max: 5,
					timeWindow: '1 minute'
				}
			},
			schema: {
				security: [{ bearerAuth: [] }],
				response: {
					200: Type.Object({
						success: Type.Boolean(),
						msg: Type.String()
					}),
					401: Type.Object({
						msg: Type.String()
					}),
					404: Type.Object({
						msg: Type.String()
					}),
					500: Type.Object({
						msg: Type.String()
					}),
				},
				tags: ["Users"]
			},
			preHandler: [authenticate]
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const formData = await formDataManager.registerFormData(request);
				const validFormDataMsg = isValidProfileFormData(formData);
				if (validFormDataMsg) {
					return reply.send({
						success: false,
						msg: validFormDataMsg 
					});
				}
				const dirPath = config.UPLOAD_DIRNAME + '/' + config.UPLOAD_USERS_DIRNAME + '/' +  config.UPLOAD_AVATAR_DIRNAME;
				const newAvatarPath = await fileManager.saveFile(formData.files.avatar.file, dirPath);
				console.log('formData:', formData);
				const { user_id } = request.user as UserData;
				const user = await userProfilesRepository.getRowByColumnValue("user_id", user_id);
				if (user.avatar)
					fileManager.deleteFile(user.avatar);
				await userProfilesRepository.updateRowByColumn("user_id", user_id, "avatar", newAvatarPath);
				return reply.send({
					success: true,
					msg: 'Avatar has been successfully updated.'
				});
			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({ msg: 'An internal server error occurred while updating the avatar.' });
			}
		}
	)

	fastify.get(
		'/avatar',
		{
			schema: {
			// params: Type.Object({
			// 	id: Type.String()
			// }),
			response: {
				200: {
				description: 'PNG image file',
				type: 'string',
				format: 'binary'
				},
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
		async (request, reply) => {
			try {
				const userId = request.user.user_id;
				const profileRow = await userProfilesRepository.getRowByColumnValue('user_id', userId);
				if (!profileRow) {
					return reply.status(404).send({ msg: 'User not found.' });
				}
				console.log("avatar: ", profileRow.avatar);
				const avatarPath = profileRow.avatar ?? 'uploads/avatar.webp';
				if (!fs.existsSync(avatarPath)) {
					return reply.status(404).send({ msg: 'Avatar image not found.' });
				}
				const mimeType = fileManager.getMimeType(avatarPath);

				return reply.type(mimeType).send(fs.createReadStream(avatarPath));
			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({ msg: 'An internal server error occurred while retrieving the avatar.' });
			}			
		}
	);
}




export default plugin
