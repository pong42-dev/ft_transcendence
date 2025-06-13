import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { UserProfileResponseSchema } from '../../../../schemas/users.js'
import { IdSchema } from '../../../../schemas/common.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { userProfilesRepository } = fastify

  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        response: {
          200: Type.Object({
            id: Type.Number() 
          }),          
        },
        tags: ["Users"]
      }
    }, 
    async (request, reply) => {
      const id = request.user.user_id;
				return reply.status(200).send({id: id});
    }
  )

  // GET /api/users/profile/:id
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: Type.Object({ id: IdSchema }),
        response: {
          200: UserProfileResponseSchema,
          404: Type.Object({ message: Type.String() })
        },
        tags: ["Users"]
      }
    },
    async (request, reply) => {
      const userId = request.params.id
      const profile = await userProfilesRepository.getUserProfileWithStats(userId)
      if (!profile) {
        reply.code(404)
        return { message: 'User not found' }
      }

      return profile
    }
  )
}

export default plugin 