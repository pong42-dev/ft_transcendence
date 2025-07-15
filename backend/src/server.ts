import Fastify from 'fastify'
import fp from 'fastify-plugin'

import closeWithGrace from 'close-with-grace'
import { 
  gracefulTournamentCleanup as gracefulCleanup, 
  emergencyTournamentCleanup as emergencyCleanup 
} from './utils/tournament-cleanup';

import serviceApp from './app.js'

function getLoggerOptions () {
  if (process.stdout.isTTY) {
    return {
      level: process.env.LOG_LEVEL ?? 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    }
  }

  return { level: process.env.LOG_LEVEL ?? 'silent' }
}

const app = Fastify({
  logger: getLoggerOptions(),
  ajv: {
    customOptions: {
      coerceTypes: 'array',
      removeAdditional: 'all'
    }
  },
  bodyLimit: 20 * 1024 * 1024
})

/**
 * 프로세스 신호 핸들러를 설정하는 함수
 */
function setupProcessSignalHandlers() {
  // 프로세스 종료 신호 처리
  process.on('SIGTERM', () => emergencyCleanup(app as any, 'SIGTERM'));
  process.on('SIGINT', () => emergencyCleanup(app as any, 'SIGINT'));
  process.on('SIGQUIT', () => emergencyCleanup(app as any, 'SIGQUIT'));
}

async function init () {
  app.register(fp(serviceApp))

  // 프로세스 신호 핸들러 설정
  setupProcessSignalHandlers();

  closeWithGrace(
	{ delay: Number(process.env.FASTIFY_CLOSE_GRACE_DELAY ?? 500) },
	async ({ err }) => {
	  if (err != null) {
		app.log.error(err)
	  }

	  // 서버 종료 시 토너먼트 정리
	  await gracefulCleanup(app as any);
  
	  await app.close()
	}
  )

  await app.ready()

  try {
	await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
} catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

init()
