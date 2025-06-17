import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		verify2FAToken: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	}
}

async function verify2FAToken(
request: FastifyRequest,
reply: FastifyReply
): Promise<void> {
	const { user2FARepository, speakeasy } = request.server;

	try {
		const userId = request.user.user_id;
		const { token } = request.body as { token: string };
		const row = await user2FARepository.getRowByColumnValue('user_id', userId);
		if (!row || !row.two_fa_secret) {
		return reply.status(401).send({ success: false, msg: '2FA is not enabled.' });
		}
		const verified = speakeasy.totp.verify({
		secret: row.two_fa_secret,
		encoding: 'base32',
		token,
		window: 1,
		});
		if (!verified) {
		return reply.status(401).send({ success: false, msg: 'Invalid 2FA token.' });
		}
		if (!row.is_enabled) {
			await user2FARepository.updateRowByColumn('user_id', userId, 'is_enabled', true);
		}
	} catch (err) {
		return reply.status(500).send({ msg: '2FA 인증 중 오류가 발생했습니다.' });
	}
}

export default fp(async (fastify: FastifyInstance) => {
	fastify.decorate('verify2FAToken', verify2FAToken);
	}, {
	name: 'verify-2fa-plugin',
	}
);