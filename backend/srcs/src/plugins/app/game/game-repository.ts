import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
interface FastifyInstance {
	gamesRepository: ReturnType<typeof creategamesRepository>;
}
}

interface GameMatchHistory {
	endedAt: string | null;
	guest: string | null;
	winner: string | null;
	rank: 1 | 2;
}

interface TournMatchHistory {
	endedAt: string | null;
	guest1: string | null;
	guest2: string | null;
	guest3: string | null;
	winner: string | null;
	rank: 1 | 2 | 3;
}

export function creategamesRepository(fastify: FastifyInstance) {
	const knex = fastify.knex;

	return {
		async getGameStats(userId: number): Promise<number> {
			const localGamesResult: Array<{ count: number }> = await knex('games')
			.where({ user_id: userId, type: '1vs1' })
			.count('id as count');

			const localGamesCount = Number(localGamesResult[0]?.count ?? 0);

			const tournamentsResult: Array<{ count: number }> = await knex('tournaments')
			.where({ user_id: userId })
			.count('id as count');

			const tournamentsCount = Number(tournamentsResult[0]?.count ?? 0);

			return localGamesCount + tournamentsCount;
		},

		async getTotalWins(userId: number): Promise<number> {
			const localWinsResult: Array<{ count: number }> = await knex('games')
				.where({
				user_id: userId,
				type: '1vs1',
				winner: 'user',
				})
				.count('id as count');
			const localWins = Number(localWinsResult[0]?.count ?? 0);

			const tournamentFinalWinsResult: Array<{ count: number }> = await knex('tournaments as t')
				.join('games as g', 't.game3_id', 'g.id')
				.where('t.user_id', userId)
				.andWhere('g.winner', 'user')
				.count('t.id as count');
			const tournamentFinalWins = Number(tournamentFinalWinsResult[0]?.count ?? 0);

			return localWins + tournamentFinalWins;
		},

		async get1v1MatchHistory(userId: number, userName: string): Promise<GameMatchHistory[]> {
			const rows = await knex('games')
				.select('ended_at', 'guest_name', 'winner')
				.where({
				user_id: userId,
				type: '1vs1',
				status: 'finished',
				})
				.orderBy('ended_at', 'desc');

			return rows.map(row => ({
				endedAt: row.ended_at,
				guest: row.guest_name,
				winner: row.winner === userName ? userName : row.guest_name,
				rank: row.winner === userName ? 1 : 2,
			}));
		},
		
		async getTournMatchHistory(userId: number, userName: string): Promise<TournMatchHistory[]> {
			const tournaments = await knex('tournaments as t')
				.leftJoin('games as g1', 't.game1_id', 'g1.id')
				.leftJoin('games as g2', 't.game2_id', 'g2.id')
				.leftJoin('games as g3', 't.game3_id', 'g3.id')
				.select(
				't.id as tournamentId',
				't.ended_at as endedAt',
				't.guest1_name as guest1',
				't.guest2_name as guest2',
				't.guest3_name as guest3',
				'g1.winner as winner1',
				'g2.winner as winner2',
				'g3.winner as winner3'
				)
				.where({
				't.user_id': userId,
				't.status': 'finished'
				})
				.orderBy('t.ended_at', 'desc');

			return tournaments.map(t => {
				let rank: 1 | 2 | 3 = 3;

				if (t.winner3 === userName) {
					rank = 1;
				} else if (t.winner1 === userName || t.winner2 === userName) {
					rank = 2;
				} else { 
					rank = 3;
				}

				let winnerName: string | null = null;
				if (t.winner3 === userName) {
					winnerName = userName;
				} else if (t.winner3 === t.guest1) {
					winnerName = t.guest1;
				} else if (t.winner3 === t.guest2) {
					winnerName = t.guest2;
				} else if (t.winner3 === t.guest3) {
					winnerName = t.guest3;
				} else {
					winnerName = null;
				}

				return {
					endedAt: t.endedAt,
					guest1: t.guest1,
					guest2: t.guest2,
					guest3: t.guest3,
					winner: winnerName,
					rank,
				};
			});
		}
	}
}

export default fp(
	async function (fastify: FastifyInstance) {
		const repo = creategamesRepository(fastify);
		fastify.decorate('gamesRepository', repo);
	},
	{
		name: 'games-repository',
		dependencies: ['knex'],
	}
)