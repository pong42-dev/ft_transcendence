import { BaseApiService } from './BaseApiService';

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

  async joinTournament(tournamentId: number): Promise<any> {
    return this.post<any>(`/api/tournaments/${tournamentId}/participants`);
  }

  async generateBracket(tournamentId: number): Promise<any> {
    return this.post<any>(`/api/tournaments/${tournamentId}/bracket`);
  }

  async getTournamentMatches(tournamentId: number): Promise<any> {
    return this.get<any>(`/api/tournaments/${tournamentId}/matches`);
  }

  async getTournamentParticipants(tournamentId: number): Promise<any> {
    return this.get<any>(`/api/tournaments/${tournamentId}/participants`);
  }

  async getUserProfile(): Promise<any> {
    return this.get<any>('/api/users/me');
  }

  async getUserTournamentHistory(): Promise<any> {
    return this.get<any>('/api/tournaments/user/history');
  }
} 