import fp from 'fastify-plugin';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
  interface FastifyInstance {
    generateUUID: () => string;
  }
}

export default fp(async (fastify) => {
  fastify.decorate('generateUUID', uuidv4);
});
