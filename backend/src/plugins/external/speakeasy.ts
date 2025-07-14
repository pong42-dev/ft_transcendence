import fp from 'fastify-plugin'
import * as speakeasy from 'speakeasy'

export default fp(async (fastify) => {
  fastify.decorate('speakeasy', speakeasy)
})
