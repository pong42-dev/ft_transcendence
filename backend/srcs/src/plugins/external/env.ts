import env from '@fastify/env'

declare module 'fastify' {
export interface FastifyInstance {
		config: {
		SQLITE_DB_PATH: string;
		COOKIE_SECRET: string;
		COOKIE_NAME: string;
		COOKIE_SECURED: boolean;
		RATE_LIMIT_MAX: number;
		UPLOAD_DIRNAME: string;
		UPLOAD_AVATAR_DIRNAME: string;
		JWT_SECRET: string;
		GOOGLE_CLIENT_ID: string;
		GOOGLE_CLIENT_SECRET: string;
		GOOGLE_OAUTH_URL: string;
		GOOGLE_REDIRECT_URI: string;
		CLIENT_ORIGIN: string;
		};
	}
}

const schema = {
	type: 'object',
	// 반드시 .env에 있어야 하는 key들
	required: [
		'SQLITE_DB_PATH',
		'COOKIE_SECRET',
		'COOKIE_NAME',
		'COOKIE_SECURED',
		'UPLOAD_DIRNAME', 
		'UPLOAD_AVATAR_DIRNAME', 
		'JWT_SECRET',
		'GOOGLE_CLIENT_ID',
		'GOOGLE_CLIENT_SECRET',
		'GOOGLE_OAUTH_URL',
		'GOOGLE_REDIRECT_URI',
		'CLIENT_ORIGIN'
	],
	// 가능한 환경 변수(key)의 목록과 그 타입, 제약 조건
	properties: {
		// Database
		SQLITE_DB_PATH: {
			type: 'string',
			default: 'database/database.sqlite'
		},

		// Security
		COOKIE_SECRET: {
			type: 'string',
		},
		COOKIE_NAME: {
			type: 'string',
		},
		COOKIE_SECURED: {
			type: 'boolean',
			default: true
		},
		RATE_LIMIT_MAX: {
			type: 'number',
			default: 100 // Put it to 4 in your .env file for tests
		},

		// Files
		UPLOAD_DIRNAME: {
			type: 'string',
			minLength: 1,
			pattern: '^(?!.*\\.{2}).*$',
			default: 'uploads/users/avatar'
		},
		UPLOAD_AVATAR_DIRNAME: {
			type: 'string',
			default: 'avatar'
		},

		// Client Configuration
		CLIENT_ORIGIN: {
			type: 'string',
			default: 'http://localhost:8080'
		},

		// JWT Configuration
		JWT_SECRET: {
			type: 'string',
		},

		// Google OAuth
		GOOGLE_CLIENT_ID: {
			type: 'string',
		},
		GOOGLE_CLIENT_SECRET: {
			type: 'string',
		},
		GOOGLE_OAUTH_URL: {
			type: 'string',
			default: 'https://accounts.google.com/o/oauth2/v2/auth'
		},
		GOOGLE_REDIRECT_URI: {
			type: 'string',
		}
	}
}

export const autoConfig = {
	// Decorate Fastify instance with `config` key
	// Optional, default: 'config'
	confKey: 'config',

	// Schema to validate
	schema,

	// Needed to read .env in root folder
	dotenv: true,
	// or, pass config options available on dotenv module
	// dotenv: {
	//   path: `${import.meta.dirname}/.env`,
	//   debug: true
	// }

	// Source for the configuration data
	// Optional, default: process.env
	data: process.env
}


/**
 * This plugin helps to check environment variables.
 *
 * @see {@link https://github.com/fastify/fastify-env}
 */
export default env
