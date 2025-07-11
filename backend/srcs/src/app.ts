import path from 'path'
import fastifyAutoload from '@fastify/autoload'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import fastifyStatic from '@fastify/static';
import { cleanupIncompleteTournaments as cleanupTournaments } from './utils/tournament-cleanup';

// import chatWsPlugin from './wss/chat/index.js'
// import gameWsPlugin from './wss/game/index.js'
// import notificationWsPlugin from './wss/notification/index.js'

export const options = {
  ajv: {
    customOptions: {
      coerceTypes: 'array',
      removeAdditional: 'all'
    }
  }
}

export default async function serviceApp (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  delete opts.skipOverride

  await fastify.register(fastifyAutoload, {
    dir: path.join(import.meta.dirname, 'plugins/external'),
    options: { ...opts }
  })

  fastify.register(fastifyAutoload, {
    dir: path.join(import.meta.dirname, 'plugins/app'),
    options: { ...opts }
  })

  fastify.register(fastifyAutoload, {
    dir: path.join(import.meta.dirname, 'routes'),
    autoHooks: true,
    cascadeHooks: true,
    options: { ...opts }
  })

  fastify.register(fastifyStatic, {
    root: path.join(import.meta.dirname, '../public'),  // 실제 public 폴더 위치
    prefix: '/public/',                        // URL 접두사 (/public/...)
  });

  // await fastify.register(chatWsPlugin)
  // await fastify.register(gameWsPlugin)
  // await fastify.register(notificationWsPlugin)

  fastify.setErrorHandler((err, request, reply) => {
    fastify.log.error(
      {
        err,
        request: {
          method: request.method,
          url: request.url,
          query: request.query,
          params: request.params
        }
      },
      'Unhandled error occurred'
    )

    reply.code(err.statusCode ?? 500)

    let message = 'Internal Server Error'
    if (err.statusCode && err.statusCode < 500) {
      message = err.message
    }

    return { message }
  })

  fastify.setNotFoundHandler(
    {
      preHandler: fastify.rateLimit({
        max: 3,
        timeWindow: 500
      })
    },
    (request, reply) => {
      request.log.warn(
        {
          request: {
            method: request.method,
            url: request.url,
            query: request.query,
            params: request.params
          }
        },
        'Resource not found'
      )

      reply.code(404)

      return { message: 'Not Found' }
    })

  fastify.ready().then(async () => {
    console.log('=== [ Loaded Environment Variables ] ===');

    // Server
    console.log('PORT:', fastify.config.PORT);
    console.log('FASTIFY_CLOSE_GRACE_DELAY:', fastify.config.FASTIFY_CLOSE_GRACE_DELAY);
    console.log('LOG_LEVEL:', fastify.config.LOG_LEVEL);

    // Database
    console.log('CAN_CREATE_DATABASE:', fastify.config.CAN_CREATE_DATABASE);
    console.log('CAN_DROP_DATABASE:', fastify.config.CAN_DROP_DATABASE);
    console.log('CAN_SEED_DATABASE:', fastify.config.CAN_SEED_DATABASE);
    console.log('SQLITE_DB_PATH:', fastify.config.SQLITE_DB_PATH);

    // Files
    console.log('PUBLIC_DIRNAME:', fastify.config.PUBLIC_DIRNAME);
    console.log('USERS_DIRNAME:', fastify.config.USERS_DIRNAME);
    console.log('AVATAR_DIRNAME:', fastify.config.AVATAR_DIRNAME);

    // Cookie
    console.log('COOKIE_SECRET:', fastify.config.COOKIE_SECRET);
    console.log('COOKIE_NAME:', fastify.config.COOKIE_NAME);
    console.log('COOKIE_SECURED:', fastify.config.COOKIE_SECURED);

    // Rate Limits
    console.log('RATE_LIMIT_DEV_MAX:', fastify.config.RATE_LIMIT_DEV_MAX);
    console.log('RATE_LIMIT_DEV_WINDOW:', fastify.config.RATE_LIMIT_DEV_WINDOW);
    console.log('RATE_LIMIT_PUBLIC_MAX:', fastify.config.RATE_LIMIT_PUBLIC_MAX);
    console.log('RATE_LIMIT_PUBLIC_WINDOW:', fastify.config.RATE_LIMIT_PUBLIC_WINDOW);
    console.log('RATE_LIMIT_AUTH_MAX:', fastify.config.RATE_LIMIT_AUTH_MAX);
    console.log('RATE_LIMIT_AUTH_WINDOW:', fastify.config.RATE_LIMIT_AUTH_WINDOW);
    console.log('RATE_LIMIT_USER_MAX:', fastify.config.RATE_LIMIT_USER_MAX);
    console.log('RATE_LIMIT_USER_WINDOW:', fastify.config.RATE_LIMIT_USER_WINDOW);
    console.log('RATE_LIMIT_SENSITIVE_MAX:', fastify.config.RATE_LIMIT_SENSITIVE_MAX);
    console.log('RATE_LIMIT_SENSITIVE_WINDOW:', fastify.config.RATE_LIMIT_SENSITIVE_WINDOW);
    console.log('RATE_LIMIT_APIKEY_MAX:', fastify.config.RATE_LIMIT_APIKEY_MAX);
    console.log('RATE_LIMIT_APIKEY_WINDOW:', fastify.config.RATE_LIMIT_APIKEY_WINDOW);

    // Client
    console.log('CLIENT_ORIGIN:', fastify.config.CLIENT_ORIGIN);

    // Google OAuth
    console.log('GOOGLE_CLIENT_ID:', fastify.config.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET:', fastify.config.GOOGLE_CLIENT_SECRET);
    console.log('GOOGLE_OAUTH_URL:', fastify.config.GOOGLE_OAUTH_URL);
    console.log('GOOGLE_REDIRECT_URI:', fastify.config.GOOGLE_REDIRECT_URI);

    // JWT
    console.log('JWT_SECRET:', fastify.config.JWT_SECRET);
    console.log('ACCESS_TOKEN_EXPIRES_IN:', fastify.config.ACCESS_TOKEN_EXPIRES_IN);
    console.log('REFRESH_TOKEN_EXPIRES_IN:', fastify.config.REFRESH_TOKEN_EXPIRES_IN);
    console.log('REFRESH_COOKIE_NAME:', fastify.config.REFRESH_COOKIE_NAME);
    console.log('REFRESH_COOKIE_MAX_AGE:', fastify.config.REFRESH_COOKIE_MAX_AGE);

    console.log('=== [ End of Config Dump ] ===');

    // 서버 시작 시 진행 중인 토너먼트들을 정리
    try {
      await cleanupTournaments(fastify);
    } catch (error) {
      console.error('Error cleaning up incomplete tournaments:', error);
    }
  });
}