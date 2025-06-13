import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
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
		return reply.status(401).send({
			success: false,
			msg: 'Authorization 헤더가 없거나 형식이 올바르지 않습니다.',
		});
	}
	const token = authHeader.split(' ')[1];
	try {
		const decoded = await request.server.jwt.verify(token) as TokenData;
		console.log("decode2:", decoded);
		const row = await userProfilesRepository.getRowByColumnValue("user_id", decoded.user_id);
		console.log("row: ", row);
		if (row) {
			request.user = { "user_id": row.user_id, "name": row.name };
			console.log("user_id", row.user_id, "name", row.name);
			request.log.info("MIDDELWARE COMPLETE");	
			return ;
		}
		return reply.status(401).send({
			success: false,
			msg: '유효하지 않거나 만료된 액세스 토큰입니다.',
		});
	} catch (err) {
		request.log.error('JWT 검증 실패:', err);
		return reply.status(401).send({
			success: false,
			msg: '유효하지 않거나 만료된 액세스 토큰입니다.',
		});
	}
}

export default fp(async (fastify) => {
		fastify.decorate('authenticate', authenticate);
	},
	{
		name: 'auth-middleware',
	}
);
