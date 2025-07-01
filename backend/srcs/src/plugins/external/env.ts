import env from '@fastify/env'

declare module 'fastify' {
export interface FastifyInstance {
		config: {
		SQLITE_DB_PATH: string;
		COOKIE_SECRET: string;
		COOKIE_NAME: string;
		COOKIE_SECURED: boolean;
		// Rate Limit 변수들 추가
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
		RATE_LIMIT_APIKEY_WINDOW: string;


		// ASSETS_DIRNAME: string;
		PUBLIC_DIRNAME: string;
		USERS_DIRNAME: string;
		AVATAR_DIRNAME: string;
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
	required: [
		'SQLITE_DB_PATH',
		'COOKIE_SECRET',
		'COOKIE_NAME',
		'COOKIE_SECURED',
		'PUBLIC_DIRNAME', 
		'USERS_DIRNAME', 
		'AVATAR_DIRNAME', 
		'JWT_SECRET',
		'GOOGLE_CLIENT_ID',
		'GOOGLE_CLIENT_SECRET',
		'GOOGLE_OAUTH_URL',
		'GOOGLE_REDIRECT_URI',
		'CLIENT_ORIGIN'
	],
	properties: {
		// Database
		SQLITE_DB_PATH: {
			type: 'string',
			default: 'database/database.sqlite'
		},

		// Security
		COOKIE_SECRET: { type: 'string' },
		COOKIE_NAME: { type: 'string' },
		COOKIE_SECURED: { type: 'boolean', default: true },

		// Rate Limit 설정 (6가지 상황별)
		// // 개발/테스트 환경: 편하게 테스트하기 위해 제한을 느슨하게
		// RATE_LIMIT_DEV_MAX: { type: 'number', default: 100 },
		// RATE_LIMIT_DEV_WINDOW: { type: 'string', default: '1 minute' },
		// // 일반 사용자 대상 API (비 로그인 상태): 비정상적인 트래픽 차단 목적
		// RATE_LIMIT_PUBLIC_MAX: { type: 'number', default: 20 },
		// RATE_LIMIT_PUBLIC_WINDOW: { type: 'string', default: '1 minute' },
		// // 인증 또는 로그인 시도 API: brute-force 방지
		// RATE_LIMIT_AUTH_MAX: { type: 'number', default: 5 },
		// RATE_LIMIT_AUTH_WINDOW: { type: 'string', default: '5 minutes' },
		// // 로그인된 사용자용 API: 사용자당 충분한 요청 허용
		// RATE_LIMIT_USER_MAX: { type: 'number', default: 100 },
		// RATE_LIMIT_USER_WINDOW: { type: 'string', default: '1 minute' },
		// // 공격 방어가 중요한 민감 API: 챗봇/스크래퍼/공격자 차단
		// RATE_LIMIT_SENSITIVE_MAX: { type: 'number', default: 3 },
		// RATE_LIMIT_SENSITIVE_WINDOW: { type: 'string', default: '1 minute' },
		// // 퍼블릭 API with API Key: 사용량 제한 목적, 과금 기준 사용 가능
		// RATE_LIMIT_APIKEY_MAX: { type: 'number', default: 1000 },
		// RATE_LIMIT_APIKEY_WINDOW: { type: 'string', default: '1 hour' },

		// 개발/테스트 환경: 편하게 테스트하기 위해 제한을 느슨하게
		RATE_LIMIT_DEV_MAX: { type: 'number', default: 100 },
		RATE_LIMIT_DEV_WINDOW: { type: 'string', default: '1 minute' },
		// 일반 사용자 대상 API (비 로그인 상태): 비정상적인 트래픽 차단 목적
		RATE_LIMIT_PUBLIC_MAX: { type: 'number', default: 100 },
		RATE_LIMIT_PUBLIC_WINDOW: { type: 'string', default: '1 minute' },
		// 인증 또는 로그인 시도 API: brute-force 방지
		RATE_LIMIT_AUTH_MAX: { type: 'number', default: 100 },
		RATE_LIMIT_AUTH_WINDOW: { type: 'string', default: '1 minutes' },
		// 로그인된 사용자용 API: 사용자당 충분한 요청 허용
		RATE_LIMIT_USER_MAX: { type: 'number', default: 100 },
		RATE_LIMIT_USER_WINDOW: { type: 'string', default: '1 minute' },
		// 공격 방어가 중요한 민감 API: 챗봇/스크래퍼/공격자 차단
		RATE_LIMIT_SENSITIVE_MAX: { type: 'number', default: 100 },
		RATE_LIMIT_SENSITIVE_WINDOW: { type: 'string', default: '1 minute' },
		// 퍼블릭 API with API Key: 사용량 제한 목적, 과금 기준 사용 가능
		RATE_LIMIT_APIKEY_MAX: { type: 'number', default: 100 },
		RATE_LIMIT_APIKEY_WINDOW: { type: 'string', default: '1 minute' },

		// Files
		PUBLIC_DIRNAME: {
			type: 'string',
			minLength: 1,
			pattern: '^(?!.*\\.{2}).*$',
			default: 'public'
		},
		USERS_DIRNAME: { type: 'string', default: 'users' },
		AVATAR_DIRNAME: { type: 'string', default: 'avatar' },

		// Client Configuration
		CLIENT_ORIGIN: { type: 'string', default: 'http://localhost:8080' },

		// JWT Configuration
		JWT_SECRET: { type: 'string' },

		// Google OAuth
		GOOGLE_CLIENT_ID: { type: 'string' },
		GOOGLE_CLIENT_SECRET: { type: 'string' },
		GOOGLE_OAUTH_URL: {
			type: 'string',
			default: 'https://accounts.google.com/o/oauth2/v2/auth'
		},
		GOOGLE_REDIRECT_URI: { type: 'string' }
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