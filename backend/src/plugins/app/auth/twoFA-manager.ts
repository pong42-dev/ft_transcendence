import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InitUser2FA } from '../../schemas/users/table/user-2fa.js';
import { UserData } from '../../schemas/users/common.js';

declare module 'fastify' {
	interface FastifyInstance {
		twoFAManager: {
			init2FA: (request: FastifyRequest, reply: FastifyReply) => Promise<InitUser2FA>;
			verify2FAToken: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
			verify2FAToken2: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
			verify2FATokenWithoutTmpToken: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
			generateTmpTokenFor2FA: (request: FastifyRequest, reply: FastifyReply, userId: number, forSetup?: boolean) => Promise<string>;
			generateHashedTmpTokenFor2FA: (request: FastifyRequest, reply: FastifyReply, userId: number, forSetup?: boolean) => Promise<string>;
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
			const tmpToken = await twoFAManager.generateHashedTmpTokenFor2FA(request, reply, userId, true);
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
				const userId = tokenRow?.user_id;
				fastify.log.info(`Verifying 2FA token for user ${userId}`);
				fastify.log.debug(`Token: ${token}`);
				fastify.log.debug(`tmpToken: ${tmpToken}`);
				if (!tokenRow || (tokenRow && tmpToken !== tokenRow.token)){
					return reply.status(401).send({ msg: 'Invalid tmp token.' });
				}
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

		async verify2FAToken2(request: FastifyRequest, reply: FastifyReply): Promise<void> {
			const { user2FARepository, tmpTokenRepository, speakeasy, passwordManager } = request.server;
			try {
				const { token, tmpToken } = request.body as { token:string, tmpToken: string };
				const userId = request.user.user_id;
				const tokenRow = await tmpTokenRepository.getRowByColumnValue("user_id", userId);
				fastify.log.info(`Verifying 2FA token for user ${userId}`);
				fastify.log.debug(`Token: ${token}`);
				fastify.log.debug(`tmpToken: ${tmpToken}`);
				fastify.log.debug(`hashed tmpToken: ${tokenRow?.token}`);
				if (!tokenRow || !passwordManager.comparePassword(tmpToken, tokenRow.token)) {
					return reply.status(401).send({ msg: 'Invalid tmp token.' });
				}
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

		async generateTmpTokenFor2FA(request: FastifyRequest, reply: FastifyReply, userId: number, forSetup?: boolean): Promise<string> {
			const { config, user2FARepository, tmpTokenRepository, generateUUID } = request.server;
			const user2FA = await user2FARepository.getRowByColumnValue('user_id', userId);
			fastify.log.debug(`User 2FA status for user ${userId}:`, user2FA);
			if (user2FA && (forSetup || user2FA.is_enabled)) {
				const token = generateUUID();
				const createdAt = new Date();
				const expiresAt = new Date(createdAt.getTime() + config.TMP_TOKEN_EXPIRES_IN_S * 1000);
				await tmpTokenRepository.insertRow(token, userId, '2fa', expiresAt);
				fastify.log.info(`Generated tmp token for user ${userId}`);
				fastify.log.debug(`Token: ${token}`);
				fastify.log.debug(`Created At: ${createdAt}, Expires At: ${expiresAt}`);
				return token;
			}
			return '';
		},

		async generateHashedTmpTokenFor2FA(request: FastifyRequest, reply: FastifyReply, userId: number, forSetup?: boolean): Promise<string> {
			const { user2FARepository, tmpTokenRepository, generateUUID, passwordManager } = request.server;
			const user2FA = await user2FARepository.getRowByColumnValue('user_id', userId);

			if (user2FA && (forSetup || user2FA.is_enabled)) {
				const token = generateUUID();
				const hashedToken = await passwordManager.hashPassword(token);
				const createdAt = new Date();
				const expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000); // 5m
				await tmpTokenRepository.insertRow(hashedToken, userId, '2fa', expiresAt);
				fastify.log.info(`Generated tmp token for user ${userId}`);
				fastify.log.debug(`Token: ${token}`);
				fastify.log.debug(`Hashed token: ${hashedToken}`);
				fastify.log.debug(`Created At: ${createdAt}, Expires At: ${expiresAt}`);
				return token;
			}
			return '';
		},

		async cleanExpired2FA(): Promise<void> {
			const { tmpTokenRepository } = fastify;
			await tmpTokenRepository.deleteRowsBeforeExpiry();
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