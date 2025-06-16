import { BaseApiService } from './BaseApiService';
import { convertToMatchHistoryArray } from '../../utils/TypeSafetyUtils';
import * as Types from '../../types/types';

export class GameApiService extends BaseApiService {
  constructor() {
    super(undefined, 'GameApi');
  }

  // 게임 생성
  async createGame(gameData: Types.GameData): Promise<Types.ActiveGame> {
    return this.post('/games', gameData);
  }

  // 게임 결과 업데이트
  async updateGame(gameId: string, result: Types.GameResult): Promise<void> {
    await this.put(`/games/${gameId}`, result);
  }

  // 게임 통계 조회
  async getGameStats(): Promise<Types.GameStats> {
    return this.get('/games/stats');
  }

  // 매치 히스토리 조회 - 인터셉터에서 자동 변환됨
  async getMatchHistory(): Promise<Types.MatchHistory[]> {
    const matchHistoryData = await this.get<Types.MatchHistory[]>('/games/history');
    // 타입 안전성을 위한 변환 검증
    return convertToMatchHistoryArray(matchHistoryData);
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
  async getActiveGames(): Promise<Types.ActiveGame[]> {
    return this.get('/games/active');
  }

  // 게임 참가
  async joinGame(gameId: string): Promise<Types.ActiveGame> {
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