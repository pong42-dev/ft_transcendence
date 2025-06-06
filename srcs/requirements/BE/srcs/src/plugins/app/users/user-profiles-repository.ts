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
		// 사용자 프로필 삽입
		async insertRow(user_id: string, name: string, avatar: string, status: string) {
			try {
				await knex('user_profiles')
				.insert({ 
					user_id, 
					name, 
					avatar, 
					status
				});
			} catch (err: any) {
				fastify.log.error('사용자 프로필 삽입 오류:', err.message);
				throw err;
			}
		},

		// 중복 확인
		async checkDupRow(column: string, value: string): Promise<boolean> {
			try {
				const result = await knex('user_profiles')
				.where({ [column]: value })
				.first();
				return !!result;
			} catch (err: any) {
				fastify.log.error('중복 사용자 프로필 체크 오류:', err.message);
				throw err;
			}
		},

		// 컬럼 값으로 사용자 프로필 조회
		async getRowByColumnValue(
			column: string,
			value: string | number | boolean
		): Promise<UserProfile[]> {
			if (!allowedColumns.includes(column)) {
				console.log("허용되지 않은 컬럼명");
				throw new Error('허용되지 않은 컬럼명입니다.');
			}
			const result = await knex('user_profiles')
				.select('*')
				.where(column, value);
			console.log("result:", result);
			return result;
		},


		// 사용자 프로필 업데이트
		async updateRowByColumn(
			column: string,
			value: string | number | boolean,
			updateColumn: string,
			updateValue: string | number | boolean
			) {
			if (!allowedColumns.includes(column) || !allowedColumns.includes(updateColumn)) {
				throw new Error('허용되지 않은 컬럼명입니다.');
			}
			try {
				await knex('user_profiles')
				.where(column, value)
				.update({ [updateColumn]: updateValue });
			} catch (err: any) {
				fastify.log.error('사용자 프로필 업데이트 오류:', err.message);
				throw err;
			}
		},

		async getUserProfileWithStats(userId: number) {
			// 1. 유저 프로필 정보 조회
			const profile = await knex('user_profiles')
				.where('user_id', userId)
				.first('name', 'avatar')

			if (!profile) return null

			// 2. 1v1 게임 전적 조회
			const stats = await knex('games as g')
				.join('game_score as gs', 'g.id', 'gs.game_id')
				.where('g.type', '1v1')
				.where('g.status', 'finished')
				.where('gs.user_id', userId)
				.select(
					knex.raw('COUNT(CASE WHEN g.winner_id = ? THEN 1 END) as win', [userId]),
					knex.raw('COUNT(CASE WHEN g.winner_id != ? AND g.winner_id IS NOT NULL THEN 1 END) as loss', [userId])
				)
				.first()

			return {
				name: profile.name,
				avatar: profile.avatar,
				win: stats?.win || 0,
				loss: stats?.loss || 0
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
