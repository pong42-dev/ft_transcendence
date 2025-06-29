import fp from 'fastify-plugin'
import { createTournamentsRepository } from './tournaments-repository.js'
import { createMatchesRepository } from './matches-repository.js'

declare module 'fastify' {
	interface FastifyInstance {
		tournamentsRepository: ReturnType<typeof createTournamentsRepository>;
		matchesRepository: ReturnType<typeof createMatchesRepository>;
	}
}

export default fp(async (fastify) => {
	// 토너먼트 리포지토리 등록
	fastify.decorate('tournamentsRepository', createTournamentsRepository(fastify))
	
	// 매치 리포지토리 등록
	fastify.decorate('matchesRepository', createMatchesRepository(fastify))
}) 