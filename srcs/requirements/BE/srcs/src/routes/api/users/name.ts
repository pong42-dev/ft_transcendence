import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { FastifyRequest, FastifyReply } from 'fastify'
import { UserData } from '../../../../schemas/auth.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate, userProfilesRepository } = fastify

	fastify.put(
		'/name',
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
			preHandler: [authenticate]
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			console.log ("reuqest.user:", request.user);
			const { user_id } = request.user as UserData;
			const { name: newName } = request.body as UserData;
			const nameExists = await userProfilesRepository.checkDupRow('name', newName)
			if (nameExists) {
				return reply.status(200).send({
					success: false,
					msg: '이미 존재하는 닉네임입니다'
				});
			}
			await userProfilesRepository.updateRowByColumn("user_id", user_id, "name", newName);
			return reply.send({
				success: true,
				msg: '닉네임이 변경 되었습니다.'
			});
		} catch (err) {
			request.server.log.error(err);
			return reply.status(500).send({
				success: false,
				msg: '닉네임 변경 처리 중 서버 내부 오류가 발생했습니다.'
			});
		}
		}
	)
}

export default plugin
