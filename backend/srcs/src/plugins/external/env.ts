import env from '@fastify/env'

declare module 'fastify' {
export interface FastifyInstance {
		config: {
		// Server
		PORT: number;
		FASTIFY_CLOSE_GRACE_DELAY: number;
		LOG_LEVEL: string;
		// Database
		CAN_CREATE_DATABASE: boolean;
		CAN_DROP_DATABASE: boolean;
		CAN_SEED_DATABASE: boolean;
		SQLITE_DB_PATH: string;
		// Files
		PUBLIC_DIRNAME: string;
		USERS_DIRNAME: string;
		AVATAR_DIRNAME: string;
		// Cookie
		COOKIE_SECRET: string;
		COOKIE_NAME: string;
		COOKIE_SECURED: boolean;
		// Rate Limit
		RATE_LIMIT_DEV_MAX: number;
		RATE_LIMIT_DEV_WINDOW: string;
		RATE_LIMIT_PUBLIC_MAX: number;
		RATE_LIMIT_PUBLIC_WINDOW: string;
		RATE_LIMIT_AUTH_MAX: number;
		RATE_LIMIT_AUTH_WINDOW: string;
		RATE_LIMIT_USER_MAX: number;
		RATE_LIMIT_USER_WINDOW: string;
		RATE_LIMIT_SENSITIVE_MAX: number;
		RATE_LIMIT_SENSITIVE_WINDOW: string;
		RATE_LIMIT_APIKEY_MAX: number;
		RATE_LIMIT_APIKEY_WINDOW: string
		// Client
		BASE_URL: string;
		// Google OAuth
		GOOGLE_CLIENT_ID: string;
		GOOGLE_CLIENT_SECRET: string;
		GOOGLE_OAUTH_URL: string;
		GOOGLE_REDIRECT_URI: string;
		// JWT
		JWT_SECRET: string;
		ACCESS_TOKEN_EXPIRES_IN: string;
		REFRESH_TOKEN_EXPIRES_IN: string;
		REFRESH_COOKIE_NAME: string;
		REFRESH_COOKIE_MAX_AGE: number;
		};
	}
}

const schema = {
	type: 'object',
	required: [
		// Database
		// 'CAN_CREATE_DATABASE',
		// 'CAN_DROP_DATABASE',
		// 'CAN_SEED_DATABASE',
		'SQLITE_DB_PATH',
		// Files
		'PUBLIC_DIRNAME', 
		'USERS_DIRNAME', 
		'AVATAR_DIRNAME', 
		// Cookie
		'COOKIE_SECRET',
		'COOKIE_NAME',
		'COOKIE_SECURED',
		// Client
		'BASE_URL',
		// Google OAuth
		'GOOGLE_CLIENT_ID',
		'GOOGLE_CLIENT_SECRET',
		'GOOGLE_OAUTH_URL',
		'GOOGLE_REDIRECT_URI',
		// JWT
		'JWT_SECRET',
		'ACCESS_TOKEN_EXPIRES_IN',
		'REFRESH_TOKEN_EXPIRES_IN',
		'REFRESH_COOKIE_NAME',
		'REFRESH_COOKIE_MAX_AGE'
	],
	properties: {
    	// Server
		PORT: { type: 'number', default: 3000 },
		FASTIFY_CLOSE_GRACE_DELAY: { type: 'number', default: 500 },
		LOG_LEVEL: { type: 'string', default: 'info' },

		// Database
		CAN_CREATE_DATABASE: { type: 'boolean', default: false },
		CAN_DROP_DATABASE: { type: 'boolean', default: false },
		CAN_SEED_DATABASE: { type: 'boolean', default: false },
		SQLITE_DB_PATH: {
			type: 'string',
			default: 'database/database.sqlite'
		},

		// Files
		PUBLIC_DIRNAME: {
			type: 'string',
			minLength: 1,
			pattern: '^(?!.*\\.{2}).*$',
			default: 'public'
		},
		USERS_DIRNAME: { type: 'string', default: 'users' },
		AVATAR_DIRNAME: { type: 'string', default: 'avatar' },

		// Cookie
		COOKIE_SECRET: { type: 'string' },
		COOKIE_NAME: { type: 'string' },
		COOKIE_SECURED: { type: 'boolean', default: true },

		// Rate Limit
		// Development/Test Environment: relaxed limits for easier testing
		RATE_LIMIT_DEV_MAX: { type: 'number', default: 100 },
		RATE_LIMIT_DEV_WINDOW: { type: 'string', default: '1 minute' },
		// Public APIs (unauthenticated users): prevent abnormal traffic
		RATE_LIMIT_PUBLIC_MAX: { type: 'number', default: 20 },
		RATE_LIMIT_PUBLIC_WINDOW: { type: 'string', default: '1 minute' },
		// Auth-related APIs (login attempts, etc.): prevent brute-force attacks
		RATE_LIMIT_AUTH_MAX: { type: 'number', default: 5 },
		RATE_LIMIT_AUTH_WINDOW: { type: 'string', default: '5 minutes' },
		// Authenticated User APIs: allow sufficient requests per user
		RATE_LIMIT_USER_MAX: { type: 'number', default: 100 },
		RATE_LIMIT_USER_WINDOW: { type: 'string', default: '1 minute' },
		// Sensitive APIs (security-critical): block bots/scrapers/attackers
		RATE_LIMIT_SENSITIVE_MAX: { type: 'number', default: 3 },
		RATE_LIMIT_SENSITIVE_WINDOW: { type: 'string', default: '1 minute' },
		// Public APIs with API Key: limit usage, possibly for billing purposes
		RATE_LIMIT_APIKEY_MAX: { type: 'number', default: 1000 },
		RATE_LIMIT_APIKEY_WINDOW: { type: 'string', default: '1 hour' },

		// Client
		BASE_URL: { type: 'string' },
		
		// Google OAuth
		GOOGLE_CLIENT_ID: { type: 'string' },
		GOOGLE_CLIENT_SECRET: { type: 'string' },
		GOOGLE_OAUTH_URL: {
			type: 'string',
			default: 'https://accounts.google.com/o/oauth2/v2/auth'
		},
		GOOGLE_REDIRECT_URI: { type: 'string' },
		
		// JWT
		JWT_SECRET: { type: 'string' },
		ACCESS_TOKEN_EXPIRES_IN: { type: 'string',default: '20m' },
		REFRESH_TOKEN_EXPIRES_IN: { type: 'string', default: '7d' },
		REFRESH_COOKIE_NAME: { type: 'string', default: 'refresh_token' },
		REFRESH_COOKIE_MAX_AGE: { type: 'number', default: 60 * 60 * 24 * 7 },
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