import { BaseApiService } from './BaseApiService';
import * as Types from '../types/types';

export class GameApiService extends BaseApiService {
  constructor() {
    super();
  }

  // Mock 응답 생성 (BaseApiService의 추상 메서드 구현)
  protected async getMockResponse<T>(endpoint: string, options: RequestInit): Promise<T> {
    // Mock 데이터 시뮬레이션을 위한 지연
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    
    const method = options.method || 'GET';
    
    // Mock 응답 생성 로직
    if (endpoint.includes('/games') && method === 'POST') {
      return {
        id: Date.now(),
        status: 'created',
        gameMode: '1v1',
        startedAt: new Date().toISOString()
      } as T;
    }
    
    if (endpoint.includes('/games/') && method === 'PUT') {
      return {
        id: parseInt(endpoint.split('/').pop() || '0'),
        status: 'completed',
        winner: 'player1',
        endedAt: new Date().toISOString()
      } as T;
    }
    
    if (endpoint.includes('/games/stats')) {
      return {
        totalGames: 15,
        wins: 9,
        losses: 6,
        winRate: 0.6,
        averageScore: 7.5,
        bestStreak: 4
      } as T;
    }
    
    if (endpoint.includes('/games/history')) {
      return [
        {
          id: 1,
          player1: { id: 1, username: 'mockuser' },
          player2: { id: 2, username: 'opponent1' },
          player1Score: 10,
          player2Score: 8,
          gameMode: '1v1',
          startedAt: new Date(Date.now() - 86400000).toISOString(),
          endedAt: new Date(Date.now() - 86400000 + 300000).toISOString(),
          winner: 1
        },
        {
          id: 2,
          player1: { id: 1, username: 'mockuser' },
          player2: { id: 3, username: 'opponent2' },
          player1Score: 6,
          player2Score: 10,
          gameMode: '1v1',
          startedAt: new Date(Date.now() - 172800000).toISOString(),
          endedAt: new Date(Date.now() - 172800000 + 420000).toISOString(),
          winner: 3
        }
      ] as T;
    }

    if (endpoint.includes('/health')) {
      return {
        status: 'ok',
        timestamp: new Date().toISOString()
      } as T;
    }

    // 기본 성공 응답
    return { success: true } as T;
  }

  // 게임 생성
  async createGame(gameData: any): Promise<any> {
    return this.post('/games', gameData);
  }

  // 게임 결과 업데이트
  async updateGame(gameId: number, result: any): Promise<any> {
    return this.put(`/games/${gameId}`, result);
  }

  // 게임 통계 조회
  async getGameStats(): Promise<any> {
    return this.get('/games/stats');
  }

  // 매치 히스토리 조회
  async getMatchHistory(): Promise<Types.MatchHistory[]> {
    const matches = await this.get<Types.BackendGameMatch[]>('/games/history');
    return matches.map(m => ({
      date: new Date(m.startedAt).toLocaleDateString(),
      opponent: m.player2 ? m.player2.username : 'AI',
      rank: 1,
      type: m.gameMode === 'tournament' ? 'tournament' : '1v1',
      my_score: m.player1Score,
      opponent_score: m.player2Score
    }));
  }

  // 게임 초대 보내기
  async sendGameInvite(username: string, gameMode: string = '1v1'): Promise<void> {
    await this.post('/games/invite', { username, gameMode });
  }

  // 게임 초대 응답
  async respondToGameInvite(inviteId: string, accept: boolean): Promise<void> {
    await this.post(`/games/invite/${inviteId}/respond`, { accept });
  }

  // 활성 게임 조회
  async getActiveGames(): Promise<any[]> {
    return this.get('/games/active');
  }

  // 게임 참가
  async joinGame(gameId: string): Promise<any> {
    return this.post(`/games/${gameId}/join`, {});
  }

  // 게임 떠나기
  async leaveGame(gameId: string): Promise<void> {
    await this.post(`/games/${gameId}/leave`, {});
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/health');
  }
}