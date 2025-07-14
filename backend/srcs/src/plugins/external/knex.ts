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
			filename: fastify.config.SQLITE_DB_PATH, // SQLite database file path
		},
		useNullAsDefault: true, // Required option for SQLite
		// SQLite BUSY 오류 해결을 위한 설정
		acquireConnectionTimeout: 60000, // 60초
		pool: {
			min: 2,
			max: 5,
			acquireTimeoutMillis: 60000, // 60초
			createTimeoutMillis: 30000, // 30초
			destroyTimeoutMillis: 5000, // 5초
			idleTimeoutMillis: 30000, // 30초
			reapIntervalMillis: 1000, // 1초
			createRetryIntervalMillis: 200, // 200ms
		},
		// SQLite 특정 설정
		afterCreate: (conn: any, done: Function) => {
			// SQLite 설정을 순차적으로 적용
			conn.run('PRAGMA busy_timeout = 60000', (err1: any) => {
				if (err1) {
					console.error('Error setting SQLite busy timeout:', err1);
				}
				
				// WAL 모드 활성화 (동시성 향상)
				conn.run('PRAGMA journal_mode = WAL', (err2: any) => {
					if (err2) {
						console.error('Error setting SQLite WAL mode:', err2);
					}
					
					// 동시 읽기/쓰기 허용
					conn.run('PRAGMA synchronous = NORMAL', (err3: any) => {
						if (err3) {
							console.error('Error setting SQLite synchronous mode:', err3);
						}
						
						// 캐시 크기 증가
						conn.run('PRAGMA cache_size = 10000', (err4: any) => {
							if (err4) {
								console.error('Error setting SQLite cache size:', err4);
							}
							
							done(err1 || err2 || err3 || err4, conn);
						});
					});
				});
			});
		}
	};
};

export default fp(async (fastify: FastifyInstance, opts: KnexPluginOptions) => {
	const knexInstance = knex(autoConfig(fastify));
	fastify.decorate('knex', knexInstance);
	// Close the Knex connection when the server shuts down
	fastify.addHook('onClose', async (instance) => {
		await instance.knex.destroy();
	});
}, { name: 'knex' });