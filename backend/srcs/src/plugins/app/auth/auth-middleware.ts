import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply } from 'fastify';
import { TokenData } from '../../../schemas/auth.js';

declare module 'fastify' {
	interface FastifyInstance {
		authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	}
	interface FastifyRequest {
		user: {
			user_id: number
			name: string
		}
	}
}

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
	const { userProfilesRepository } = request.server;
	const authHeader = request.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return reply.status(401).send({ msg: 'Authorization header is missing or improperly formatted.' });
	}
	const token = authHeader.split(' ')[1];
	try {
		let decoded;
		try {
			decoded = await request.server.jwt.verify(token) as TokenData;
		} catch (err) {
			return reply.status(401).send({ msg: 'Invalid or expired token.' });
		}
		console.log("decoded:", decoded);
		const row = await userProfilesRepository.getRowByColumnValue("user_id", decoded.user_id);
		console.log("row:", row);
		if (row) {
			request.user = { user_id: row.user_id, name: row.name };
			console.log("user_id:", row.user_id, "name:", row.name);
			request.log.info("Completed authentication middleware");
			return;
		}
		return reply.status(401).send({ msg: 'Invalid or expired token.' });
	} catch (err) {
		request.log.error(err);
		return reply.status(500).send({ msg: 'An internal server error occurred.' });
	}
}

export default fp(async (fastify) => {
		fastify.decorate('authenticate', authenticate);
	},
	{
		name: 'auth-middleware',
	}
);
