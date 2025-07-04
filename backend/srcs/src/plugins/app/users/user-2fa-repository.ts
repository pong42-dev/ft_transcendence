import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Knex } from 'knex';
import { User2FA } from '../../schemas/users/table/user-2fa.js';

declare module 'fastify' {
	interface FastifyInstance {
		user2FARepository: ReturnType<typeof createuser2FARepository>;
	}
}

export function createuser2FARepository(fastify: FastifyInstance) {
	const knex: Knex = fastify.knex;
	const allowedColumns = ['user_id', 'two_fa_secret', 'is_enabled', 'created_at'];

	return {
		async insertRow(user_id: number, two_fa_secret: string) {
			try {
				await knex('user_2fa')
					.insert({
						user_id,
						two_fa_secret,
					});
				fastify.log.info(`Inserted user 2FA secret for user_id ${user_id}: ${two_fa_secret}`);
			} catch (err: any) {
				fastify.log.error('Error inserting user 2FA secret:', err.message);
				throw err;
			}
		},

		async getRowByColumnValue(column: string, value: number | string | Date): Promise<User2FA | undefined > {
			if (!allowedColumns.includes(column)) {
				return ;
				// throw new Error('Invalid column name.');
			}
			const result = await knex('user_2fa')
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
				await knex('user_2fa')
					.where(column, value)
					.update({ [updateColumn]: updateValue });
			} catch (err: any) {
				fastify.log.error('Error updating user 2FA:', err.message);
				throw err;
			}
		},

		async deleteRowByColumnValue(column: string, value: number | string | Date): Promise<void> {
			if (!allowedColumns.includes(column)) {
				throw new Error('Invalid column name.');
			}
			try {
				const result = await knex('user_2fa')
					.where(column, value)
					.del();
				if (result > 0) {
					fastify.log.info('Row deletion succeeded:', result);
				}
			} catch (err: any) {
				fastify.log.error('Error deleting row:', err.message);
				throw err;
			}
		}
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = createuser2FARepository(fastify);
		fastify.decorate('user2FARepository', repo);
	},
	{
		name: 'user-2fa-repository',
		dependencies: ['knex'],
	}
);
