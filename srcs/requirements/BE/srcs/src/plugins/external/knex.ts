import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import knex, { Knex } from 'knex'

declare module 'fastify' {
	export interface FastifyInstance {
		knex: Knex;
	}
}

interface KnexPluginOptions {
	SQLITE_DB_PATH: string;
}

export const autoConfig = (fastify: FastifyInstance): Knex.Config => {
	return {
		client: 'sqlite3',
		connection: {
			filename: fastify.config.SQLITE_DB_PATH, // SQLite DB 파일 경로
		},
		useNullAsDefault: true, // SQLite에서 필수 옵션
		pool: { min: 2, max: 10 }, // 커넥션 풀 설정 (선택 사항)
	};
};

export default fp(async (fastify: FastifyInstance, opts: KnexPluginOptions) => {
	const knexInstance = knex(autoConfig(fastify));
	fastify.decorate('knex', knexInstance);
	// 서버 종료 시 Knex 연결 종료
	fastify.addHook('onClose', async (instance) => {
		await instance.knex.destroy();
	});
}, { name: 'knex' });
