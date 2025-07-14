import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { User } from '../../schemas/users/table/users.js'

declare module 'fastify' {
	interface FastifyInstance {
		usersRepository: ReturnType<typeof createUsersRepository>;
	}
}

export function createUsersRepository(fastify: FastifyInstance) {
	const knex = fastify.knex;
	const allowedColumns = ['id', 'email', 'password', 'provider', 'provider_id'];

	return {
		async insertRow(email: string, hashedPassword: string, provider: string, provider_id: string) {
			try {
				const result = await knex('users')
				.insert({
					email,
					password: hashedPassword,
					provider,
					provider_id
				})
				.returning('id');
				return result[0].id;
			} catch (err: any) {
				fastify.log.error('Error inserting user:', err.message);
				throw err;
			}
		},

		async checkDupRow(column: string, value: string): Promise<boolean> {
			try {
				const result = await knex('users')
				.where({ [column]: value })
				.first();
				return !!result;
			} catch (err: any) {
				fastify.log.error('Error checking duplicate user:', err.message);
				throw err;
			}
		},

		async getRowByColumnValue(
		column: string, 
		value: string | number 
		): Promise<User> {
			if (!allowedColumns.includes(column)) {
				throw new Error('Invalid column name.');
			}
			const result = await knex('users')
			.select('*')
			.where(column, value);
			return result[0];
		}
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = createUsersRepository(fastify);
		fastify.decorate('usersRepository', repo);
	},
	{
		name: 'users-repository',
		dependencies: ['knex']
	}
);
