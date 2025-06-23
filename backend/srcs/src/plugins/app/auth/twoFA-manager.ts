import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InitUser2FA, UserData, UserProfile } from '../../../schemas/auth.js';

declare module 'fastify' {
	interface FastifyInstance {
		twoFAManager: {
			init2FA: (request: FastifyRequest, reply: FastifyReply) => Promise<InitUser2FA>;
			verify2FAToken: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
			verify2FATokenWithoutTmpToken: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
			require2FA: (request: FastifyRequest, reply: FastifyReply, userId: number) => Promise<string>;
			cleanExpired2FA(): Promise<void>;
		}
	}
	interface FastifyRequest {
		user: UserData;
	}
}

export function manageTwoFA(fastify: FastifyInstance) {
	return {
		async init2FA(request: FastifyRequest, reply: FastifyReply): Promise<InitUser2FA> {
			const { user2FARepository, usersRepository, twoFAManager, speakeasy, qrcode } = fastify
			const userId = request.user.user_id;
			const user2FARow = await user2FARepository.getRowByColumnValue('user_id', userId);
			if (user2FARow && user2FARow.is_enabled) {
				reply.status(409).send({
					"msg": "This account already has 2FA enabled. Please disable it before setting up again."
				})
			}
			const user = await usersRepository.getRowByColumnValue("id", userId);
			if (!user) {
				return reply.status(404).send({ msg: 'User not found.' });
			}
			const userEmail = user.email;
			const secret = speakeasy.generateSecret({
				name: `MyApp (${userEmail})`
			});
			if (!secret || !secret.otpauth_url)
				throw new Error('');
			const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
			await user2FARepository.deleteRowByColumnValue('user_id', userId);
			console.log(userId);
			console.log(secret.base32);
			await user2FARepository.insertRow(userId, secret.base32);
			const tmpToken = await twoFAManager.require2FA(request, reply, userId);
			console.log(tmpToken);
			return {
				qrCodeUrl,
				secret: secret.base32,
				token: tmpToken
			};
		},

		async verify2FAToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
			const { user2FARepository, tmpTokenRepository, speakeasy } = request.server;
			try {
				const { token, tmpToken } = request.body as { token:string, tmpToken: string };
				const tokenRow = await tmpTokenRepository.getRowByColumnValue("token", tmpToken);
				console.log(token);
				console.log(tmpToken);
				console.log(tokenRow?.token);
				if (!tokenRow || (tokenRow && tmpToken !== tokenRow.token)) {
					return reply.status(401).send({ msg: 'Invalid tmp token.' });
				}
				const userId = tokenRow.user_id;
				request.user = { user_id: userId as number, name: ''};
				const row = await user2FARepository.getRowByColumnValue('user_id', userId);
				if (!row || !row.two_fa_secret) {
					return reply.status(401).send({ msg: '2FA is not enabled.' });
				}
				const verified = speakeasy.totp.verify({
					secret: row.two_fa_secret,
					encoding: 'base32',
					token,
					window: 1,
				});
				if (!verified) {
					return reply.status(401).send({msg: 'Invalid 2FA token.' });
				}
				await tmpTokenRepository.deleteRowByColumnValue('token', tmpToken);
				if (!row.is_enabled) {
					await user2FARepository.updateRowByColumn('user_id', userId, 'is_enabled', true);
				}
			} catch (err) {
				return reply.status(500).send({ msg: 'An internal server error occurred during 2FA authentication.' });
			}
		},

		async verify2FATokenWithoutTmpToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
			const { user2FARepository, speakeasy } = request.server;
			try {
				const userId = request.user.user_id;
				const row = await user2FARepository.getRowByColumnValue('user_id', userId);
				if (!row || !row.two_fa_secret) {
					return reply.status(401).send({ msg: '2FA is not enabled.' });
				}
				const { token } = request.body as { token:string };
				const verified = speakeasy.totp.verify({
					secret: row.two_fa_secret,
					encoding: 'base32',
					token,
					window: 1,
				});
				if (!verified) {
					return reply.status(401).send({msg: 'Invalid 2FA token.' });
				}
			} catch (err) {
				return reply.status(500).send({ msg: 'An internal server error occurred during 2FA authentication.' });
			}
		},

		async require2FA(request: FastifyRequest, reply: FastifyReply, userId: number): Promise<string> {
			const { user2FARepository, tmpTokenRepository, generateUUID } = request.server;
			const user2FA = await user2FARepository.getRowByColumnValue('user_id', userId);
			console.log('user2FA: ', user2FA);
			if (user2FA) {
				const token = generateUUID();
				const createdAt = new Date();
				const expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000); // 5m
				await tmpTokenRepository.insertRow(token, userId, '2fa', expiresAt);
				console.log("tmpTokn:", token );
				return token;
			}
			return '';
		},

		async cleanExpired2FA(): Promise<void> {
			const { tmpTokenRepository } = fastify;
			try {
				await tmpTokenRepository.deleteRowsBeforeExpiry();
				console.log('Expired tmp tokens cleaned up.');
			} catch (err) {
				console.error('Failed to clean expired tmp tokens:', err);
			}
		}
	}
}

export default fp(async (fastify: FastifyInstance) => {
	const twoFAManager = manageTwoFA(fastify);
	fastify.decorate('twoFAManager', twoFAManager);
	}, {
	name: 'twoFA-manager',
	}
);