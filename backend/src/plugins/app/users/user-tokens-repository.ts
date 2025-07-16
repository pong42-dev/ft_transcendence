import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Knex } from 'knex';
import { UserToken } from '../../schemas/users/table/user-tokens.js';

declare module 'fastify' {
	interface FastifyInstance {
		userTokensRepository: ReturnType<typeof createUserTokensRepository>;
	}
}

export function createUserTokensRepository(fastify: FastifyInstance) {
	const knex: Knex = fastify.knex;
	const allowedColumns = ['user_id', 'token_version', 'server_refresh_token', 'server_expires_at', 'google_refresh_token'];

	return {
		async insertRow(user_id: number, token_version:string, server_refresh_token: string, server_expires_at: Date, google_refresh_token: string) {
			try {
				await knex('user_tokens')
				.insert({
					user_id,
					token_version,
					server_refresh_token,
					server_expires_at,
					google_refresh_token,
				});
				fastify.log.info(`Inserted user ${user_id}: ${server_refresh_token}`);
			} catch (err: any) {
				fastify.log.error('Error inserting user:', err.message);
				throw err;
			}
		},

		async checkDupRow(column: string, value: number | string | Date): Promise<boolean> {
			try {
				const result = await knex('user_tokens')
				.where({ [column]: value })
				.first();
				return !!result;
			} catch (err: any) {
				fastify.log.error('Error checking duplicate user:', err.message);
				throw err;
			}
		},

		async getRowByColumnValue(column: string, value: number | string | Date): Promise<UserToken> {
			if (!allowedColumns.includes(column)) {
				throw new Error('Invalid column name.');
			}
			const result = await knex('user_tokens')
			.select('*')
			.where(column, value);
			return result[0];
		},

		async deleteRowByColumnValue(column: string, value: number | string | Date): Promise<void> {
			if (!allowedColumns.includes(column)) {
				throw new Error('Invalid column name.');
			}
			try {
				const result = await knex('user_tokens')
				.where(column, value)
				.del();
				if (result > 0) {
					fastify.log.info('Row deletion successful:', result);
				}
			} catch (err: any) {
				fastify.log.error('Error deleting row:', err.message);
				// throw err;
			}
		},

		// async deleteExpiredTokenForUser(userId: number): Promise<boolean> {
		// 	try {
		// 		// const now = Date.now();
		// 		const now = new Date();
		// 		const result = await knex('user_tokens')
		// 			.where('user_id', userId)
		// 			.andWhere('server_expires_at', '<', now)
		// 			.del();
		// 		if (result > 0) {
		// 			fastify.log.info(`Expired tokens deleted for user ${userId}: ${result}`);
		// 			return true;
		// 		} else {
		// 			fastify.log.info(`No expired tokens found for user ${userId}.`);
		// 			return false;
		// 		}
		// 	} catch (err: any) {
		// 		fastify.log.error(`Error deleting expired tokens for user ${userId}:`, err.message);
		// 		throw err;
		// 	}
		// },

		async hasValidTokenForUser(userId: number): Promise<number> {
			try {
				const now = new Date();
				const result = await knex('user_tokens')
					.where('user_id', userId)
					.andWhere('server_expires_at', '>=', now)
					.count<{ count: string }>('user_id as count')
					.first();
				const validTokenCount = Number(result?.count ?? 0);
				fastify.log.info(`Valid token count for user ${userId}: ${validTokenCount}`);
				return validTokenCount;
			} catch (err: any) {
				fastify.log.error(`Error checking valid tokens for user ${userId}:`, err.message);
				throw err;
			}
		},

		async deleteRowsBeforeExpiry(): Promise<void> {
			try {				
				const now = new Date();
				const row = await knex('user_tokens')
					.select('user_id', 'server_expires_at')
					.where('server_expires_at', '<', now)
					.first();
				await knex('user_tokens')
					.where('server_expires_at', '<', now) 
					.del();
				if (row) {
					const expiresAtISO = new Date(row.server_expires_at).toISOString();
					fastify.log.info('Expired user tokens cleaned up.');
					fastify.log.info(
						`user_id: ${row.user_id}, server_expires_at: ${expiresAtISO} (${row.server_expires_at}), now: ${now.toISOString()}`
					);
				} else {
					fastify.log.info('No expired user tokens found.');
				}
			} catch (err: any) {
				fastify.log.error('Error deleting expired refresh tokens:', err.message);
				throw err;
			}
		}
		
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = createUserTokensRepository(fastify);
		fastify.decorate('userTokensRepository', repo);
	},
	{
		name: 'user-tokens-repository',
		dependencies: ['knex'],
	}
);
