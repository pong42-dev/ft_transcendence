import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { UserProfile } from '../../../schemas/auth.js'

declare module 'fastify' {
	interface FastifyInstance {
		userProfilesRepository: ReturnType<typeof createUserProfilesRepository>;
	}
}

export function createUserProfilesRepository(fastify: FastifyInstance) {
	const knex = fastify.knex;
	const allowedColumns = ['user_id', 'name', 'avatar', 'status'];

	return {
		// Insert user profile
		async insertRow(user_id: number, name: string, avatar: string, status: string) {
			try {
				await knex('user_profiles')
				.insert({ 
					user_id, 
					name, 
					avatar, 
					status
				});
			} catch (err: any) {
				fastify.log.error('Error inserting user profile:', err.message);
				throw err;
			}
		},

		// Check duplicate
		async checkDupRow(column: string, value: string | number | boolean): Promise<boolean> {
			try {
				const result = await knex('user_profiles')
				.where({ [column]: value })
				.first();
				return !!result;
			} catch (err: any) {
				fastify.log.error('Error checking duplicate user profile:', err.message);
				throw err;
			}
		},

		// Get user profile by column value
		async getRowByColumnValue(
			column: string,
			value: string | number | boolean
		): Promise<UserProfile> {
			if (!allowedColumns.includes(column)) {
				console.log("Invalid column name");
				throw new Error('Invalid column name.');
			}
			const result = await knex('user_profiles')
				.select('*')
				.where(column, value);
			return result[0];
		},

		// Update user profile by column
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
				await knex('user_profiles')
				.where(column, value)
				.update({ [updateColumn]: updateValue });
			} catch (err: any) {
				fastify.log.error('Error updating user profile:', err.message);
				throw err;
			}
		},

		async getUserProfileWithStats(userId: number) {
			// 1. Retrieve user profile info
			const profile = await knex('user_profiles')
				.where('user_id', userId)
				.first('name', 'avatar')

			if (!profile)
				return null

			// 2. Retrieve 1v1 game stats (commented out)
			// const stats = await knex('games as g')
			// 	.join('game_score as gs', 'g.id', 'gs.game_id')
			// 	.where('g.type', '1v1')
			// 	.where('g.status', 'finished')
			// 	.where('gs.user_id', userId)
			// 	.select(
			// 		knex.raw('COUNT(CASE WHEN g.winner_id = ? THEN 1 END) as win', [userId]),
			// 		knex.raw('COUNT(CASE WHEN g.winner_id != ? AND g.winner_id IS NOT NULL THEN 1 END) as loss', [userId])
			// 	)
			// 	.first()

			return {
				name: profile.name,
				avatar: profile.avatar,
				// win: stats?.win || 0,
				// loss: stats?.loss || 0
			}
		}
	};
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = createUserProfilesRepository(fastify);
		fastify.decorate('userProfilesRepository', repo);
	},
	{
		name: 'user-profiles-repository',
		dependencies: ['knex']
	}
);
