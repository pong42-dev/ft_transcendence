import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { UserProfile, Friend } from '../../../schemas/auth.js'

declare module 'fastify' {
interface FastifyInstance {
	friendsRepository: ReturnType<typeof createfriendsRepository>;
}
}

export function createfriendsRepository(fastify: FastifyInstance) {
	const knex = fastify.knex;
	const allowedColumns = ['id', 'user_id', 'friend_id', 'status', 'requested_at'];


	return {
		// 친구 추가
		async insertRow(user_id: number, friend_id: number, status: string) {
			try {
				await knex('friends')
				.insert({ 
					user_id, 
					friend_id, 
					status
				});
			} catch (err: any) {
				fastify.log.error('친구 추가 오류:', err.message);
				throw err;
			}
		},

		async isFollowing(user_id: number, friend_id: number): Promise<boolean> {
			try {
				const exists = await knex('friends')
					.where({ user_id, friend_id })
					.first();
				return !!exists;
			} catch (err: any) {
				fastify.log.error('친구 존재 여부 확인 오류:', err.message);
				throw err;
			}
		},
	
		async getRowsByColumnValue(
			column: string,
			value: string | number | boolean
		): Promise<Friend[]> {
			if (!allowedColumns.includes(column)) {
				console.log("허용되지 않은 컬럼명");
				throw new Error('허용되지 않은 컬럼명입니다.');
			}
			const result = await knex('friends')
				.select('*')
				.where(column, value);
			// console.log("result:", result);
			return result;
		},

		async deleteFriendship(user_id: number, friend_id: number): Promise<void> {
			try {
				const result = await knex('friends')
					.where({ user_id, friend_id })
					.del();
				if (result <= 0)
					fastify.log.info('삭제할 친구 관계가 없습니다.');
			} catch (err: any) {
				fastify.log.error('친구 관계 삭제 오류:', err.message);
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
