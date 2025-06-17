import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Knex } from 'knex';
import { UserToken } from '../../../schemas/auth.js';

declare module 'fastify' {
	interface FastifyInstance {
		userTokensRepository: ReturnType<typeof createUserTokensRepository>;
	}
}

export function createUserTokensRepository(fastify: FastifyInstance) {
	const knex: Knex = fastify.knex;
	const allowedColumns = ['user_id', 'server_refresh_token', 'server_expires_at', 'google_refresh_token'];

	return {
		async insertRow(user_id: number, server_refresh_token: string, server_expires_at: Date, google_refresh_token: string) {
			try {
				await knex('user_tokens')
				.insert({
					user_id,
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
				throw err;
			}
		},

		async deleteExpiredRows(): Promise<void> {
			try {
				const result = await knex('user_tokens')
					.where('server_expires_at', '<', new Date())
					.del();
				if (result === 0) {
					fastify.log.info('No expired rows found.');
				} else {
					fastify.log.info('Expired rows deleted:', result);
				}
			} catch (err: any) {
				fastify.log.error('Error deleting expired rows:', err.message);
				throw err;
			}
		},

		async deleteExpiredTokenForUser(userId: number): Promise<boolean> {
			try {
				const now = Date.now();
				const result = await knex('user_tokens')
					.where('user_id', userId)
					.andWhere('server_expires_at', '<', now)
					.del();
				if (result > 0) {
					fastify.log.info(`Expired tokens deleted for user ${userId}: ${result}`);
					return true;
				} else {
					fastify.log.info(`No expired tokens found for user ${userId}.`);
					return false;
				}
			} catch (err: any) {
				fastify.log.error(`Error deleting expired tokens for user ${userId}:`, err.message);
				throw err;
			}
		},

		async hasValidTokenForUser(userId: number): Promise<number> {
			try {
				const now = Date.now();
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
