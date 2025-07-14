import fp from 'fastify-plugin';
import sanitizeHtml from 'sanitize-html';
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    sanitizeHtml: typeof sanitizeHtml;
  }
}

const sanitizePlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate('sanitizeHtml', sanitizeHtml);
}, {
  name: 'sanitize-html-plugin',
});

export default sanitizePlugin;