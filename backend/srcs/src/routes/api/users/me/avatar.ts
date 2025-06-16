import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { FastifyRequest, FastifyReply } from 'fastify'
import { UserData } from '../../../../schemas/auth.js'
// import path from 'node:path'
// import fs from 'node:fs'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { 
		config, userProfilesRepository,
		registerFormData, saveFile, fileManager,
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
				response: {
					200: Type.Object({
						success: Type.Boolean(),
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
				const formData = await registerFormData(request);
				const validFormDataMsg = isValidProfileFormData(formData);
				if (validFormDataMsg) {
					return reply.status(200).send({
						success: false,
						msg: validFormDataMsg 
					});
				}
				const dirPath = config.UPLOAD_DIRNAME + '/' + config.UPLOAD_AVATAR_DIRNAME || 'uploads/avatars';
				const newAvatarPath = await saveFile(formData.files.avatar, dirPath);
				console.log('formData:', formData);
				const { user_id } = request.user as UserData;
				const user = await userProfilesRepository.getRowByColumnValue("user_id", user_id);
				if (user.avatar)
					fileManager.deleteFile(user.avatar);
				await userProfilesRepository.updateRowByColumn("user_id", user_id, "avatar", newAvatarPath);
				return reply.status(200).send({
					success: true,
					msg: 'Avatar has been successfully updated.'
				});
			} catch (err) {
				fastify.log.error(err);
				return reply.status(500).send({ msg: 'An internal server error occurred while updating the avatar.' });
			}
		}
	)

	// // GET /api/users/avatar/:file_path
	// fastify.get(
	// 	'/avatar/*',
	// 	{
	// 	  schema: {
	// 		response: {
	// 		  200: { type: 'string', description: '이미지 파일' },
	// 		  404: Type.Object({ message: Type.String() })
	// 		},
	// 		tags: ["Users"]
	// 	  }
	// 	},
	// 	async (request, reply) => {
	// 		const rawPath = (request.params as any)['*'] as string

	// 		console.log('@@@@@@@@@@@@@@@' + rawPath)
	// 		try {
	// 			if (!fs.existsSync(rawPath)) {
	// 			return reply.status(404).send({ message: '파일을 찾을 수 없습니다.' })
	// 			}
	// 			return reply.type(getMimeType(rawPath)).send(fs.createReadStream(rawPath))
	// 		} catch (err) {
	// 			request.server.log.error(err)
	// 			return reply.status(500).send({ message: '파일 처리 중 오류가 발생했습니다.' })
	// 		}
	// 	}
	// )
}

// 간단한 MIME 타입 추론 함수 (필요 시 더 정교하게 개선 가능)
// function getMimeType(filePath: string): string {
// 	const ext = path.extname(filePath).toLowerCase()
// 	switch (ext) {
// 		case '.png': return 'image/png'
// 		case '.jpg':
// 		case '.jpeg': return 'image/jpeg'
// 		case '.gif': return 'image/gif'
// 		case '.webp': return 'image/webp'
// 		default: return 'application/octet-stream'
// 	}
// }

export default plugin
