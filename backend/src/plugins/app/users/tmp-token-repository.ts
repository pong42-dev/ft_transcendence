import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Knex } from 'knex';
import { TmpToken } from '../../schemas/users/table/tmp-tokens.js';

declare module 'fastify' {
	interface FastifyInstance {
		tmpTokenRepository: ReturnType<typeof createTmpTokenRepository>;
	}
}

export function createTmpTokenRepository(fastify: FastifyInstance) {
	const { log, knex } = fastify;
	const allowedColumns = ['token', 'user_id', 'type', 'created_at', 'expires_at'];

	return {
		async insertRow(token: string, user_id: number, type: string, expires_at: Date) {
			try {
				await knex('tmp_tokens')
					.insert({
						token,
						user_id,
						type,
						expires_at
					});
			} catch (err: any) {
				log.error('Error inserting tmp token:', err.message);
				throw err;
			}
		},

		async getRowByColumnValue(column: string, value: number | string | Date): Promise<TmpToken | undefined > {
			if (!allowedColumns.includes(column)) {
				return ;
				// throw new Error('Invalid column name.');
			}
			const result = await knex('tmp_tokens')
				.select('*')
				.where(column, value);
			return result[0];
		},

		async updateRowByColumn(
			column: string,
			value: string | number | boolean,
			updateColumn: string,
			updateValue: string | number | boolean
		) {
			if (!allowedColumns.includes(column) || !allowedColumns.includes(updateColumn)) {
				throw new Error('Invalid column name.');
			}
			try {
				await knex('tmp_tokens')
					.where(column, value)
					.update({ [updateColumn]: updateValue });
			} catch (err: any) {
				log.error('Error updating tmp token:', err.message);
				throw err;
			}
		},

		async deleteRowByColumnValue(column: string, value: number | string | Date): Promise<void> {
			if (!allowedColumns.includes(column)) {
				throw new Error('Invalid column name.');
			}
			try {
				const result = await knex('tmp_tokens')
					.where(column, value)
					.del();
				if (result > 0) {
					log.info('Row deletion succeeded:', result);
				}
			} catch (err: any) {
				log.error('Error deleting row:', err.message);
				throw err;
			}
		},

		async deleteRowsBeforeExpiry(): Promise<void> {
			try {				
				const now = new Date();
				const row = await knex('tmp_tokens')
					.select('user_id', 'expires_at')
					.where('expires_at', '<', now)
					.first();
				await knex('tmp_tokens')
					.where('expires_at', '<', now)
					.del();
				if (row) {
					const expiresAtISO = new Date(row.expires_at).toISOString();
					log.info('Expired tmp tokens cleaned up.');
					log.info(
						`user_id: ${row.user_id}, expires_at: ${expiresAtISO} (${row.expires_at}), now: ${now.toISOString()}`
					);
				} else {
					log.info('No expired tmp tokens found.');
				}
			} catch (err: any) {
				log.error('Error deleting expired tmp tokens:', err.message);
				throw err;
			}
		}
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = createTmpTokenRepository(fastify);
		fastify.decorate('tmpTokenRepository', repo);
	},
	{
		name: 'tmp-token-repository',
		dependencies: ['knex'],
	}
);
