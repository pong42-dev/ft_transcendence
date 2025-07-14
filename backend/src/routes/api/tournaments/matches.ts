import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { 
	TournamentProgressResponseDtoSchema
} from '../../../schemas/tournaments.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	const { authenticate } = fastify

	// GET /api/tournaments/:tournamentId/progress - 토너먼트 진행 상황 조회
	fastify.get(
		'/:tournamentId/progress',
		{
			schema: {
				params: Type.Object({
					tournamentId: Type.Integer()
				}),
				response: {
					200: TournamentProgressResponseDtoSchema,
					404: Type.Object({
							message: Type.String()
						}),
					500: Type.Object({
							message: Type.String()
						})
				},
				tags: ["Tournaments"]
			},
			preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { tournamentId } = request.params as { tournamentId: number };

				// 토너먼트 존재 여부 확인
				const tournament = await fastify.tournamentsRepository.getTournament(tournamentId);
				if (!tournament) {
					return reply.status(404).send({ 
						message: 'Tournament not found' 
					});
				}

				// 토너먼트 진행 상황 조회
				const progress = await fastify.tournamentsRepository.getTournamentProgress(tournamentId);

				if (!progress) {
					return reply.status(404).send({ 
						message: 'Tournament progress not found' 
					});
				}

				return reply.status(200).send(progress);

			} catch (error: any) {
				fastify.log.error('Error fetching tournament progress:', error);
				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)

	// POST /api/tournaments/:tournamentId/matches/:matchId/start - 매치 시작
	fastify.post(
		'/:tournamentId/matches/:matchId/start',
		{
			schema: {
				params: Type.Object({
					tournamentId: Type.Integer(),
					matchId: Type.Integer()
				}),
				response: {
					200: Type.Object({
						message: Type.String(),
						gameId: Type.String()
					}),
					404: Type.Object({
						message: Type.String()
					}),
					409: Type.Object({
						message: Type.String()
					}),
					500: Type.Object({
						message: Type.String()
					})
				},
				tags: ["Tournaments"]
			},
			preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { tournamentId, matchId } = request.params as { tournamentId: number; matchId: number };

				// 토너먼트 존재 여부 확인
				const tournament = await fastify.tournamentsRepository.getTournament(tournamentId);
				if (!tournament) {
					return reply.status(404).send({ 
						message: 'Tournament not found' 
					});
				}

				// 매치 존재 여부 및 상태 확인
				const match = await fastify.matchesRepository.getMatchById(matchId);
				if (!match) {
					return reply.status(404).send({ 
						message: 'Match not found' 
					});
				}

				if (match.status !== 'waiting') {
					return reply.status(409).send({ 
						message: 'Match is not in waiting status' 
					});
				}

				// 매치 시작 (게임 상태를 'playing'으로 변경)
				await fastify.matchesRepository.updateMatchStatus(matchId, 'playing');

				// 게임 세션 ID 생성 (실제 게임 시작을 위해)
				const gameId = `tournament-${tournamentId}-match-${matchId}`;

				return reply.status(200).send({
					message: 'Match started successfully',
					gameId
				});

			} catch (error: any) {
				fastify.log.error('Error starting match:', error);
				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)

	// POST /api/tournaments/:tournamentId/matches/:matchId/end - 매치 종료
	fastify.post(
		'/:tournamentId/matches/:matchId/end',
		{
			schema: {
				params: Type.Object({
					tournamentId: Type.Integer(),
					matchId: Type.Integer()
				}),
				body: Type.Object({
					winnerId: Type.Integer()
				}),
				response: {
					200: Type.Object({
						message: Type.String(),
						nextMatchId: Type.Optional(Type.Integer())
					}),
					404: Type.Object({
						message: Type.String()
					}),
					409: Type.Object({
						message: Type.String()
					}),
					500: Type.Object({
						message: Type.String()
					})
				},
				tags: ["Tournaments"]
			},
			preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { tournamentId, matchId } = request.params as { tournamentId: number; matchId: number };
				const { winnerId } = request.body as { winnerId: number };

				// 토너먼트 존재 여부 확인
				const tournament = await fastify.tournamentsRepository.getTournament(tournamentId);
				if (!tournament) {
					return reply.status(404).send({ 
						message: 'Tournament not found' 
					});
				}

				// 매치 존재 여부 및 상태 확인
				const match = await fastify.matchesRepository.getMatchById(matchId);
				if (!match) {
					return reply.status(404).send({ 
						message: 'Match not found' 
					});
				}

				if (match.status !== 'playing') {
					return reply.status(409).send({ 
						message: 'Match is not in playing status' 
					});
				}

				// 매치 종료 처리 (승자 기록, 다음 라운드 준비)
				const matchResult = await fastify.matchesRepository.processMatchResult(matchId, winnerId);

				// 다음 매치 확인
				let nextMatchId: number | undefined;
				if (match.round_number === 1) {
					// 4강전이 완료된 경우, 다음 4강전 확인
					const nextMatch = await fastify.matchesRepository.getNextPendingMatch(tournamentId);
					if (nextMatch) {
						nextMatchId = nextMatch.id;
					}
				} else if (match.round_number === 2) {
					// 결승전이 완료된 경우, 토너먼트 종료
					await fastify.matchesRepository.setTournamentWinner(tournamentId, winnerId);
				}

				return reply.status(200).send({
					message: 'Match ended successfully',
					nextMatchId
				});

			} catch (error: any) {
				fastify.log.error('Error ending match:', error);
				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)

	// GET /api/tournaments/:tournamentId/matches - 토너먼트 매치 목록 조회
	fastify.get(
		'/:tournamentId/matches',
		{
			schema: {
				params: Type.Object({
					tournamentId: Type.Integer()
				}),
				response: {
					200: Type.Array(Type.Object({
						id: Type.Integer(),
						round_number: Type.Integer(),
						status: Type.String(),
						participants: Type.Array(Type.Object({
							id: Type.Integer(),
							display_name: Type.Optional(Type.String()),
							user_id: Type.Optional(Type.Integer()),
							type: Type.String(),
							score: Type.Optional(Type.Integer()),
							avatarUrl: Type.Optional(Type.String()) 
						})),
						winner_id: Type.Optional(Type.Integer()),
						started_at: Type.Optional(Type.String()),
					})),
					404: Type.Object({
						message: Type.String()
					}),
					500: Type.Object({
						message: Type.String()
					})
				},
				tags: ["Tournaments"]
			},
			preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { tournamentId } = request.params as { tournamentId: number };

				fastify.log.info('Fetching matches for tournament:', tournamentId);

				// 토너먼트 존재 여부 확인
				const tournament = await fastify.tournamentsRepository.getTournament(tournamentId);
				if (!tournament) {
					fastify.log.warn('Tournament not found:', tournamentId);
					return reply.status(404).send({ 
						message: 'Tournament not found' 
					});
				}

				fastify.log.info('Tournament found:', tournament);

				// 토너먼트 매치 목록 조회
				const matches = await fastify.matchesRepository.getTournamentMatches(tournamentId);

				fastify.log.info('Matches retrieved:', matches.length);

				return reply.status(200).send(matches);

			} catch (error: any) {
				fastify.log.error('Error fetching tournament matches:', error);
				fastify.log.error('Error stack:', error.stack);
				fastify.log.error('Error message:', error.message);
				fastify.log.error('Error details:', JSON.stringify(error, null, 2));
				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)
}

export default plugin
