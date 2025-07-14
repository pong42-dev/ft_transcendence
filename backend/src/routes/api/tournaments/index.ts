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

	const { authenticate } = fastify

	// POST /api/tournaments - 토너먼트 생성
	fastify.post(
		'/',
		{
			schema: {
				body: Type.Object({
					type: Type.Literal('tournament'),
					opponents: Type.Array(Type.String(), { minItems: 3, maxItems: 3 })
				}),
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
			preHandler: [authenticate]
		},
		async (request, reply) => {
			const trx = await fastify.knex.transaction();
			let response, statusCode;
			let shouldCommit: boolean | null = false;
			try {
				// 1. 요청 본문에서 GamePage의 CreateGameRequestDto 구조로 받습니다.
				const { type, opponents } = request.body as { type: 'tournament'; opponents: string[] };
				if (type !== 'tournament') {
					shouldCommit = null;
					await trx.rollback();
					return reply.status(400).send({ message: 'Invalid tournament type' });
				}

				if (!opponents || opponents.length !== 3) {
					shouldCommit = null;
					await trx.rollback();
					return reply.status(400).send({ message: 'Tournament must have exactly 3 opponents' });
				}

				// 게스트 닉네임 유효성 검증 및 정제
				for (const opponent of opponents) {

					const validOpponent = fastify.sanitizeHtml(opponent);

					if (validOpponent === null) {
						shouldCommit = null;
						await trx.rollback();
						return reply.status(400).send({ message: 'Opponent names cannot be empty' });
					}

					// 닉네임이 비어있거나 길이가 50자를 초과하는지 확인
					if (fastify.isValidName(validOpponent)) {
						shouldCommit = null;
						await trx.rollback();
						return reply.status(400).send({ message: 'Invalid opponent name' });
					}
				}
				// 2. 인증된 사용자 정보를 request.user에서 가져옵니다.
				const loggedInUser = request.user;
				if (!loggedInUser || !loggedInUser.user_id) {
					shouldCommit = null;
					await trx.rollback();
					return reply.status(400).send({ message: '로그인된 사용자 정보가 필요합니다.' });
				}

				// 3. 중복 토너먼트 생성 방지 - 최근 10초 내에 같은 사용자가 같은 게스트들과 토너먼트를 생성했는지 확인
				const recentTournaments = await trx('tournaments')
					.join('games', 'tournaments.id', 'games.tournament_id')
					.join('game_participants', 'games.id', 'game_participants.game_id')
					.join('players', 'game_participants.player_id', 'players.id')
					.where('players.user_id', loggedInUser.user_id)
					.where('tournaments.created_at', '>', new Date(Date.now() - 10000).toISOString())
					.select('tournaments.id', 'tournaments.created_at');

				if (recentTournaments.length > 0) {
					shouldCommit = null;
					await trx.rollback();
					fastify.log.warn(`Duplicate tournament creation attempt by user ${loggedInUser.user_id}`);
					return reply.status(429).send({ message: 'Tournament creation in progress, please wait...' });
				}
				// 3. 전체 참가자 목록 (인증된 사용자 1명 + 게스트 3명)을 구성합니다.
				const allParticipants = [
					{ type: 'user', userId: loggedInUser.user_id },
					...opponents.map(opponent => ({ type: 'guest', displayName: opponent }))
				];
				// 4. 토너먼트를 생성합니다.
				const [tournamentId] = await trx('tournaments').insert({
					status: 'waiting',
					winner_player_id: null,
					created_at: new Date().toISOString(),
					ended_at: null
				});
				// 5. 구성된 전체 참가자들을 등록하고 플레이어 ID들을 수집합니다.
				const playerIds: number[] = [];
				for (const participant of allParticipants) {
					let playerId: number;
					if (participant.type === 'user') {
						playerId = await fastify.tournamentsRepository.addTournamentParticipantWithTransaction(
							trx,
							tournamentId,
							'user',
							(participant as { type: 'user'; userId: number }).userId,
							undefined
						);
					} else {
						playerId = await fastify.tournamentsRepository.addTournamentParticipantWithTransaction(
							trx,
							tournamentId,
							'guest',
							undefined,
							(participant as { type: 'guest'; displayName: string }).displayName
						);
					}
					playerIds.push(playerId);
				}
				// 6. 수집된 플레이어 ID들로 대진표를 생성합니다.
				await fastify.tournamentsRepository.generateTournamentBracketWithTransaction(trx, tournamentId, playerIds);
				// 7. 생성된 토너먼트 정보 조회
				const tournament = await trx('tournaments')
					.where('id', tournamentId)
					.first();
				if (!tournament) {
					shouldCommit = null;
					await trx.rollback();
					return reply.status(500).send({ message: 'Failed to retrieve created tournament' });
				}
				shouldCommit = true;
				response = tournament;
				statusCode = 201;
			} catch (error: any) {
				fastify.log.error('Error creating tournament:', error);
				fastify.log.error('Error stack:', error.stack);
				fastify.log.error('Error message:', error.message);
				fastify.log.error('Error details:', JSON.stringify(error, null, 2));
				if (error?.message?.includes('Invalid') || error?.message?.includes('required')) {
					response = { message: 'Invalid input data: ' + error.message };
					statusCode = 400;
				} else {
					response = { message: 'Internal server error: ' + error.message };
					statusCode = 500;
				}
			} finally {
				if (shouldCommit === true) {
					await trx.commit();
				} else if (shouldCommit === false) {
					await trx.rollback();
				}
			}
			return reply.status(statusCode).send(response);
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
			preHandler: [authenticate]
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
			preHandler: [authenticate]
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
