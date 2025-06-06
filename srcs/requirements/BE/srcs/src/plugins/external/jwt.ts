import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance } from 'fastify';


export default fp(async (fastify: FastifyInstance) => {
	fastify.register(fastifyJwt, {
		secret: process.env.JWT_SECRET,
	});
}, {
	name: 'jwt-plugin',
});
