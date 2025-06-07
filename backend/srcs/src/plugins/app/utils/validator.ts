import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		isValidEmail: (email: string) => boolean;
	}
}

function validateEmailFormat(email: string): boolean {
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	return emailRegex.test(email);
}

export default fp(
	async function (fastify: FastifyInstance) {
		fastify.decorate('isValidEmail', validateEmailFormat);
	},
	{
		name: 'validator',
	}
);
