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
		pool: { min: 2, max: 10 }, // Connection pool configuration (optional)
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