import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { 
	CreateTournamentRequestDtoSchema,
	TournamentResponseDtoSchema,
	TournamentDetailsResponseDtoSchema,
	TournamentListResponseDtoSchema,
	ParticipantResponseDtoSchema
} from '../../../schemas/tournaments.js'
import matchesPlugin from './matches.js'
import historyPlugin from './history.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
	// matches 플러그인 등록
	await fastify.register(matchesPlugin, { prefix: '/' })
	
	// history 플러그인 등록
	await fastify.register(historyPlugin, { prefix: '/' })

	// const { authenticate } = fastify  // TODO: 테스트 완료 후 활성화

	// POST /api/tournaments - 토너먼트 생성
	fastify.post(
		'/',
		{
			schema: {
				body: CreateTournamentRequestDtoSchema,
				response: {
					201: TournamentResponseDtoSchema,
					400: Type.Object({
							message: Type.String()
						}),
					500: Type.Object({
							message: Type.String()
						})
				},
				tags: ["Tournaments"]
			},
			// TODO: 테스트 완료 후 인증 재활성화
			// preHandler: [authenticate]
		},
		async (request, reply) => {
			const trx = await fastify.knex.transaction();
			
			try {
				const { participants } = request.body as { participants: Array<{
					type: 'user' | 'guest';
					userId?: number;
					displayName?: string;
				}> };

				// 참가자 수 검증
				if (participants.length !== 4) {
					await trx.rollback();
					return reply.status(400).send({ 
						message: 'Tournament must have exactly 4 participants' 
					});
				}

				// 유저 타입 참가자 수 검증 (정확히 1명이어야 함)
				const userParticipants = participants.filter(p => p.type === 'user');
				const guestParticipants = participants.filter(p => p.type === 'guest');

				if (userParticipants.length !== 1 || guestParticipants.length !== 3) {
					await trx.rollback();
					return reply.status(400).send({ 
						message: 'Tournament must have exactly 1 user and 3 guest participants' 
					});
				}

				// 유저 ID 검증
				if (!userParticipants[0].userId) {
					await trx.rollback();
					return reply.status(400).send({ 
						message: 'userId is required for user type participant' 
					});
				}

				// 게스트 닉네임 검증
				for (const guest of guestParticipants) {
					if (!guest.displayName || guest.displayName.trim().length === 0) {
						await trx.rollback();
						return reply.status(400).send({ 
							message: 'displayName is required for guest type participants' 
						});
					}
				}

				// 1. 토너먼트 생성
				const [tournamentId] = await trx('tournaments').insert({
					status: 'waiting',
					winner_player_id: null,
					created_at: new Date().toISOString(),
					ended_at: null
				});

				// 2. 참가자들 등록
				for (const participant of participants) {
					await fastify.tournamentsRepository.addTournamentParticipantWithTransaction(
						trx,
						tournamentId,
						participant.type,
						participant.userId,
						participant.displayName
					);
				}

				// 3. 대진표 자동 생성
				await fastify.tournamentsRepository.generateTournamentBracketWithTransaction(trx, tournamentId);

				// 4. 생성된 토너먼트 정보 조회
				const tournament = await trx('tournaments')
					.where('id', tournamentId)
					.first();

				if (!tournament) {
					await trx.rollback();
					return reply.status(500).send({ 
						message: 'Failed to retrieve created tournament' 
					});
				}

				await trx.commit();
				return reply.status(201).send(tournament);

			} catch (error: any) {
				await trx.rollback();
				fastify.log.error('Error creating tournament:', error);
				fastify.log.error('Error stack:', error.stack);
				fastify.log.error('Error message:', error.message);
				fastify.log.error('Error details:', JSON.stringify(error, null, 2));
				
				if (error?.message?.includes('Invalid') || error?.message?.includes('required')) {
					return reply.status(400).send({ 
						message: 'Invalid input data: ' + error.message 
					});
				}
				return reply.status(500).send({ 
					message: 'Internal server error: ' + error.message 
				});
			}
		}
	)

	// GET /api/tournaments - 토너먼트 목록 전체 조회
	fastify.get(
		'/',
		{
			schema: {
				response: {
					200: TournamentListResponseDtoSchema,
					500: Type.Object({
							message: Type.String()
						})
				},
				tags: ["Tournaments"]
			},
			// TODO: 테스트 완료 후 인증 재활성화
			// preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const tournaments = await fastify.tournamentsRepository.getAllTournaments();
				return reply.status(200).send(tournaments);

			} catch (error: any) {
				fastify.log.error('Error fetching tournaments:', error);
				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)

	// GET /api/tournaments/:tournamentId - 토너먼트 상세 정보 조회
	fastify.get(
		'/:tournamentId',
		{
			schema: {
				params: Type.Object({
					tournamentId: Type.Integer()
				}),
				response: {
					200: TournamentDetailsResponseDtoSchema,
					404: Type.Object({
						message: Type.String()
					}),
					500: Type.Object({
						message: Type.String()
					})
				},
				tags: ["Tournaments"]
			},
			// TODO: 테스트 완료 후 인증 재활성화
			// preHandler: [authenticate]
		},
		async (request, reply) => {
			try {
				const { tournamentId } = request.params as { tournamentId: number };

				const tournamentDetails = await fastify.tournamentsRepository.getTournamentWithDetails(tournamentId);

				if (!tournamentDetails) {
					return reply.status(404).send({ 
						message: 'Tournament not found' 
					});
				}

				return reply.status(200).send(tournamentDetails);

			} catch (error: any) {
				fastify.log.error('Error fetching tournament details:', error);
				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)

	// PATCH /api/tournaments/:tournamentId/cancel - 토너먼트 취소
	fastify.patch(
		'/:tournamentId/cancel',
		{
			schema: {
				params: Type.Object({
					tournamentId: Type.Integer()
				}),
				response: {
					200: Type.Object({
						message: Type.String()
					}),
					404: Type.Object({
						message: Type.String()
					}),
					400: Type.Object({
						message: Type.String()
					}),
					500: Type.Object({
						message: Type.String()
					})
				},
				tags: ["Tournaments"]
			},
			// TODO: 테스트 완료 후 인증 재활성화
			// preHandler: [authenticate]
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

				// 이미 종료된 토너먼트는 취소할 수 없음
				if (tournament.status === 'ended' || tournament.status === 'canceled') {
					return reply.status(400).send({ 
						message: 'Cannot cancel tournament that is already ended or canceled' 
					});
				}

				// 토너먼트 취소
				await fastify.tournamentsRepository.updateTournamentStatus(tournamentId, 'canceled');

				return reply.status(200).send({ 
					message: 'Tournament canceled successfully' 
				});

			} catch (error: any) {
				fastify.log.error('Error canceling tournament:', error);
				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)

	// GET /api/tournaments/:tournamentId/participants - 토너먼트 참가자 목록 조회
	fastify.get(
		'/:tournamentId/participants',
		{
			schema: {
				params: Type.Object({
					tournamentId: Type.Integer()
				}),
				response: {
					200: Type.Array(ParticipantResponseDtoSchema),
					404: Type.Object({
							message: Type.String()
						}),
					500: Type.Object({
							message: Type.String()
						})
				},
				tags: ["Tournaments"]
			},
			// TODO: 테스트 완료 후 인증 재활성화
			// preHandler: [authenticate]
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

				// 참가자 목록 조회
				const participants = await fastify.tournamentsRepository.getTournamentParticipants(tournamentId);

				return reply.status(200).send(participants);

			} catch (error: any) {
				fastify.log.error('Error fetching tournament participants:', error);
				return reply.status(500).send({ 
					message: 'Internal server error' 
				});
			}
		}
	)
}

export default plugin
