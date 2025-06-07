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
				fastify.log.info(`사용자 삽입 ${user_id}: ${server_refresh_token}`);
			} catch (err: any) {
				fastify.log.error('사용자 삽입 오류:', err.message);
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
				fastify.log.error('중복 사용자 체크 오류:', err.message);
				throw err;
			}
		},

		async getRowByColumnValue(column: string, value: number | string | Date): Promise<UserToken[]> {
			if (!allowedColumns.includes(column)) {
				throw new Error('허용되지 않은 컬럼명입니다.');
			}
			const result = await knex('user_tokens')
			.select('*')
			.where(column, value);
			return result;
		},

		async deleteRowByColumnValue(column: string, value: number | string | Date): Promise<void> {
			if (!allowedColumns.includes(column)) {
				throw new Error('허용되지 않은 컬럼명입니다.');
			}
			try {
				const result = await knex('user_tokens')
				.where(column, value)
				.del();
				if (result > 0) {
					fastify.log.info('행 삭제 성공:', result);
				}
			} catch (err: any) {
				fastify.log.error('행 삭제 오류:', err.message);
				throw err;
			}
		},

		async deleteExpiredRows(): Promise<void> {
			try {
				const result = await knex('user_tokens')
					.where('server_expires_at', '<', new Date())
					.del();
				if (result === 0) {
					fastify.log.info('만료된 행이 없습니다.');
				} else {
					fastify.log.info('만료된 행 삭제 완료:', result);
				}
			} catch (err: any) {
				fastify.log.error('만료된 행 삭제 오류:', err.message);
				throw err;
			}
		},

		async deleteExpiredTokenForUser(userId: number): Promise<boolean> {
			try {
				const now = Date.now();
				// const timestamp = now.getTime(); // 또는 now.valueOf()
				// console.log(timestamp); // 예: 1747060230409
				// console.log("now: ", now);
				const result = await knex('user_tokens')
					.where('user_id', userId)
					.andWhere('server_expires_at', '<', now)
					.del();
				if (result > 0) {
					fastify.log.info(`사용자 ${userId}의 만료된 토큰 삭제 완료: ${result}개`);
					return true;
				} else {
					fastify.log.info(`사용자 ${userId}의 만료된 토큰이 없습니다.`);
					return false;
				}
			} catch (err: any) {
				fastify.log.error(`사용자 ${userId}의 만료된 토큰 삭제 오류:`, err.message);
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
				fastify.log.info(`사용자 ${userId}의 유효한 토큰 개수: ${validTokenCount}`);
				return validTokenCount;
			} catch (err: any) {
				fastify.log.error(`사용자 ${userId}의 유효한 토큰 확인 오류:`, err.message);
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
