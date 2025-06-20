import { BaseApiService, ApiError } from './BaseApiService';
import * as Types from '../../types/types';

export class GameApiService extends BaseApiService {
  constructor() {
    super(undefined, 'GameApiService');
  }

  // 백엔드에 게임 관련 API가 구현되지 않았으므로 모든 메소드에서 501 응답 반환

  async getAvailableGames(): Promise<Types.Game[]> {
    throw new ApiError(501, 'Not Implemented', { 
      message: 'Game APIs are not implemented in backend' 
    });
  }

  async createGame(gameSettings: any): Promise<Types.Game> {
    throw new ApiError(501, 'Not Implemented', { 
      message: 'Game APIs are not implemented in backend' 
    });
  }

  async joinGame(gameId: string): Promise<Types.Game> {
    throw new ApiError(501, 'Not Implemented', { 
      message: 'Game APIs are not implemented in backend' 
    });
  }

  async leaveGame(gameId: string): Promise<void> {
    throw new ApiError(501, 'Not Implemented', { 
      message: 'Game APIs are not implemented in backend' 
    });
  }

  async startGame(gameId: string): Promise<Types.Game> {
    throw new ApiError(501, 'Not Implemented', { 
      message: 'Game APIs are not implemented in backend' 
    });
  }

  async updateGameState(gameId: string, gameState: any): Promise<Types.Game> {
    throw new ApiError(501, 'Not Implemented', { 
      message: 'Game APIs are not implemented in backend' 
    });
  }

  async getGameState(gameId: string): Promise<Types.Game> {
    throw new ApiError(501, 'Not Implemented', { 
      message: 'Game APIs are not implemented in backend' 
    });
  }

  async getMatchHistory(userId?: string): Promise<Types.MatchHistory[]> {
    throw new ApiError(501, 'Not Implemented', { 
      message: 'Game APIs are not implemented in backend' 
    });
  }

  async getLeaderboard(): Promise<Types.User[]> {
    throw new ApiError(501, 'Not Implemented', { 
      message: 'Game APIs are not implemented in backend' 
    });
  }
}
