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
	const ACCESS_TOKEN_EXPIRES_IN = '20m';
	// const REFRESH_TOKEN_EXPIRES_IN = '60m';
	// const ACCESS_TOKEN_EXPIRES_IN = '10m';
	const REFRESH_TOKEN_EXPIRES_IN = '7d';
	const REFRESH_COOKIE_NAME = 'refresh_token';
	// const ACCESS_COOKIE_NAME = 'access_token';
	const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
	// const ACCESS_COOKIE_MAX_AGE = 60 * 5;

	return {
		async generateToken(
		userData: TokenData,
		expiresIn: string,
		type: 'access' | 'refresh'
		): Promise<string> {
			const { jwt, log } = fastify;
			try {
				const token = jwt.sign(userData, { expiresIn });
				return token;
			} catch (err: any) {
				log.error(`Error generating ${type} token: ${err.message}`);
				throw new Error(`Failed to generate ${type} token.`);
			}
		},

		async generateRefreshToken(userData: TokenData): Promise<CookieReturn> {
			const refreshToken = await this.generateToken(userData, REFRESH_TOKEN_EXPIRES_IN, 'refresh');
			return this.createRefreshTokenCookie(refreshToken);
		},

		// async generateAccessToken(userData: TokenData): Promise<CookieReturn> {
		// 	const accessToken = await this.generateToken(userData, ACCESS_TOKEN_EXPIRES_IN, 'access');
		// 	return this.createAccessTokenCookie(accessToken);
		// },

		async generateAccessToken(userData: TokenData): Promise<string> {
			return this.generateToken(userData, ACCESS_TOKEN_EXPIRES_IN, 'access');
		},

		createCookie(name: string, token: string, maxAge: number): CookieReturn {
			const { config } = fastify;
			const expiresAt = new Date();
			console.log("expiresAt: ", expiresAt);
			expiresAt.setTime(expiresAt.getTime() + maxAge * 1000);
			console.log("new expiresAt: ", expiresAt);
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
				REFRESH_COOKIE_NAME,
				token,
				REFRESH_COOKIE_MAX_AGE
			);
		},

		// createAccessTokenCookie(token: string): CookieReturn {
		// 	return this.createCookie(
		// 		ACCESS_COOKIE_NAME,
		// 		token,
		// 		ACCESS_COOKIE_MAX_AGE
		// 	);
		// },

		async verifyRefreshToken(refreshToken: string): Promise<TokenData | null> {
			const { jwt } = fastify;
			try {
				const decoded = await jwt.verify(refreshToken) as TokenData;
				return decoded;
			} catch (error) {
				console.error('JWT verification failed:', error);
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
			await userTokensRepository.deleteExpiredTokenForUser(userId);
			const hasToken = await userTokensRepository.hasValidTokenForUser(userId);
			if (hasToken) {
				return false;
			}
			return true;
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
