import { BaseApiService } from './BaseApiService';
import type { UserTournamentHistory } from '../../types/types';

export class TournamentApiService extends BaseApiService {
  constructor() {
    super('http://localhost:3000', 'TournamentApiService');
  }

  async createTournament(data: { participants: Array<{
    type: 'user' | 'guest';
    userId?: number;
    displayName?: string;
  }> }): Promise<any> {
    return this.post<any>('/api/tournaments', data);
  }

  async getTournaments(): Promise<any> {
    return this.get<any>('/api/tournaments');
  }

  async getTournamentDetails(tournamentId: number): Promise<any> {
    return this.get<any>(`/api/tournaments/${tournamentId}`);
  }

  async getTournamentParticipants(tournamentId: number): Promise<any> {
    return this.get<any>(`/api/tournaments/${tournamentId}/participants`);
  }

  async getTournamentProgress(tournamentId: number): Promise<any> {
    return this.get<any>(`/api/tournaments/${tournamentId}/progress`);
  }

  async cancelTournament(tournamentId: number): Promise<any> {
    return this.patch<any>(`/api/tournaments/${tournamentId}/cancel`);
  }

  async getTournamentMatches(tournamentId: number): Promise<any> {
    return this.get<any>(`/api/tournaments/${tournamentId}/matches`);
  }

  async startMatch(tournamentId: number, matchId: number): Promise<any> {
    return this.post<any>(`/api/tournaments/${tournamentId}/matches/${matchId}/start`);
  }

  async endMatch(tournamentId: number, matchId: number, winnerId: number): Promise<any> {
    return this.post<any>(`/api/tournaments/${tournamentId}/matches/${matchId}/end`, { winnerId });
  }

  async getUserProfile(): Promise<any> {
    return this.get<any>('/api/users/me');
  }

  async getUserTournamentHistory(): Promise<UserTournamentHistory[]> {
    return this.get<UserTournamentHistory[]>('/api/tournaments/user/history');
  }
} 