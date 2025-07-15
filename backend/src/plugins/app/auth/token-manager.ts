import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { TokenData } from '../../../schemas/users/refresh-token.js';
import { CookieSerializeOptions } from '@fastify/cookie';

declare module 'fastify' {
	interface FastifyInstance {
	tokenManager: ReturnType<typeof manageTokens>;
	}
}

interface CookieReturn {
name: string;
value: string;
options: CookieSerializeOptions;
expiresAt: Date;
}

export function manageTokens(fastify: FastifyInstance) {
	const { config, log } = fastify;

	return {
		async generateToken(
		userData: TokenData,
		expiresIn: string,
		type: 'access' | 'refresh'
		): Promise<string> {
			const { jwt } = fastify;
			try {
				const token = jwt.sign(userData, { expiresIn });
				return token;
			} catch (err: any) {
				log.error(`Error generating ${type} token: ${err.message}`);
				throw new Error(`Failed to generate ${type} token.`);
			}
		},

		async generateRefreshToken(userData: TokenData): Promise<CookieReturn> {
			const refreshToken = await this.generateToken(userData, config.REFRESH_TOKEN_EXPIRES_IN, 'refresh');
			return this.createRefreshTokenCookie(refreshToken);
		},

		async generateAccessToken(userData: TokenData): Promise<string> {
			return this.generateToken(userData, config.ACCESS_TOKEN_EXPIRES_IN, 'access');
		},

		createCookie(name: string, token: string, maxAge: number): CookieReturn {
			const { config } = fastify;
			const expiresAt = new Date();
			log.info(`Creating cookie`);
			log.debug(`${name} with token: ${token}`);
			log.debug(`createAt: ${expiresAt.toISOString()}`);
			expiresAt.setTime(expiresAt.getTime() + maxAge * 1000);
			log.debug(`expiresAt: ${expiresAt.toISOString()}`);
			return {
				name,
				value: token,
				options: {
					httpOnly: true,
					secure: config.COOKIE_SECURED,
					sameSite: 'lax',
					path: '/',
					maxAge: maxAge,
				},
				expiresAt: expiresAt,
			};
		},

		createRefreshTokenCookie(token: string): CookieReturn {
			return this.createCookie(
				config.REFRESH_COOKIE_NAME,
				token,
				config.REFRESH_COOKIE_MAX_AGE
			);
		},

		async verifyRefreshToken(refreshToken: string): Promise<TokenData | null> {
			const { jwt } = fastify;
			try {
				const decoded = await jwt.verify(refreshToken) as TokenData;
				return decoded;
			} catch (error) {
				log.error(`JWT verification failed:`, error);
				return null;
			}
		},

		async compareRefreshToken(
			userId: number, 
			refreshToken: string, 
			): Promise<boolean> {
			const { userTokensRepository, passwordManager } = fastify;
			try {
				const row = await userTokensRepository.getRowByColumnValue("user_id", userId);
				if (!row) {
					return false;
				}
				const isMatch = await passwordManager.comparePassword(refreshToken, row.server_refresh_token);
				if (isMatch) {
					return true;
				} else {
					return false;
				}
			} catch (error) {
				throw new Error(`Error comparing refresh token: ${error}`);
			}
		},

		async isNotLoggedIn(
			userId: number
		): Promise<boolean> {
			const { userTokensRepository } = fastify;
			const hasToken = await userTokensRepository.hasValidTokenForUser(userId);
			if (hasToken) {
				return false;
			}
			return true;
		},

		async cleanExpiredToken(): Promise<void> {
			const { userTokensRepository } = fastify;
			await userTokensRepository.deleteRowsBeforeExpiry();
		}
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const tokenManager = manageTokens(fastify);
		fastify.decorate('tokenManager', tokenManager);
	},
	{
		name: 'token-manager',
		dependencies: ['@fastify/jwt', '@fastify/cookie'],
	}
);
