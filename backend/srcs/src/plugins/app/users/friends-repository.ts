import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Friend } from '../../schemas/users/table/friends.js';

declare module 'fastify' {
	interface FastifyInstance {
		friendsRepository: ReturnType<typeof createfriendsRepository>;
	}
}

export function createfriendsRepository(fastify: FastifyInstance) {
	const knex = fastify.knex;
	const allowedColumns = ['id', 'user_id', 'friend_id', 'status', 'requested_at'];

	return {
		// Add friend
		async insertRow(user_id: number, friend_id: number, status: string) {
			try {
				await knex('friends').insert({
					user_id,
					friend_id,
					status
				});
			} catch (err: any) {
				fastify.log.error('Error adding friend:', err.message);
				throw err;
			}
		},

		// Check if already friends
		async isFollowing(user_id: number, friend_id: number): Promise<boolean> {
			try {
				const exists = await knex('friends')
					.where({ user_id, friend_id })
					.first();
				return !!exists;
			} catch (err: any) {
				fastify.log.error('Error checking friendship:', err.message);
				throw err;
			}
		},

		// Get rows by column
		async getRowsByColumnValue(
			column: string,
			value: string | number | boolean
		): Promise<Friend[]> {
			if (!allowedColumns.includes(column)) {
				throw new Error('Invalid column name.');
			}
			try {
				const result = await knex('friends')
					.select('*')
					.where(column, value);
				return result;
			} catch (err: any) {
				fastify.log.error('Error retrieving friends:', err.message);
				throw err;
			}
		},

		// Delete friendship
		async deleteFriendship(user_id: number, friend_id: number): Promise<void> {
			try {
				const result = await knex('friends')
					.where({ user_id, friend_id })
					.del();
				if (result <= 0) {
					fastify.log.info('No friendship found to delete.');
				}
			} catch (err: any) {
				fastify.log.error('Error deleting friendship:', err.message);
				throw err;
			}
		}
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = createfriendsRepository(fastify);
		fastify.decorate('friendsRepository', repo);
	},
	{
		name: 'friends-repository',
		dependencies: ['knex']
	}
);
