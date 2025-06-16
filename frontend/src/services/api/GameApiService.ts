import { BaseApiService } from './BaseApiService';
import { convertToMatchHistoryArray } from '../utils/TypeSafetyUtils';
import * as Types from '../../types/types';

export class GameApiService extends BaseApiService {
  constructor() {
    super(undefined, 'GameApi');
  }

  // 게임 생성
  async createGame(gameConfig: Types.GameConfig): Promise<Types.Game> {
    return this.post('/games', gameConfig);
  }

  // 게임 참가
  async joinGame(gameId: string): Promise<Types.Game> {
    return this.post(`/games/${gameId}/join`, {});
  }

  // 게임 정보 조회
  async getGame(gameId: string): Promise<Types.Game> {
    return this.get(`/games/${gameId}`);
  }

  // 게임 움직임/액션
  async makeMove(gameId: string, move: Types.GameMove): Promise<Types.Game> {
    return this.post(`/games/${gameId}/move`, move);
  }

  // 게임 떠나기
  async leaveGame(gameId: string): Promise<void> {
    await this.post(`/games/${gameId}/leave`, {});
  }

  // 게임 히스토리 조회
  async getGameHistory(page: number = 1, limit: number = 10): Promise<Types.MatchHistory[]> {
    const historyData = await this.get<Types.MatchHistory[]>(`/games/history?page=${page}&limit=${limit}`);
    return convertToMatchHistoryArray(historyData);
  }

  // 게임 통계 조회
  async getGameStats(): Promise<Types.GameStats> {
    return this.get('/games/stats');
  }

  // 활성 게임 목록 조회
  async getActiveGames(): Promise<Types.Game[]> {
    return this.get('/games/active');
  }

  // 대기 중인 게임 목록 조회
  async getWaitingGames(): Promise<Types.Game[]> {
    return this.get('/games/waiting');
  }

  // 게임 초대 보내기
  async sendGameInvite(username: string, gameConfig: Types.GameConfig): Promise<void> {
    await this.post('/games/invite', { username, gameConfig });
  }

  // 게임 초대 응답
  async respondToGameInvite(inviteId: string, accept: boolean): Promise<Types.Game | null> {
    if (accept) {
      return this.post(`/games/invite/${inviteId}/accept`, {});
    } else {
      await this.post(`/games/invite/${inviteId}/reject`, {});
      return null;
    }
  }

  // 초대 목록 조회
  async getPendingInvites(): Promise<Types.GameInvite[]> {
    return this.get('/games/invites');
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/health');
  }
}