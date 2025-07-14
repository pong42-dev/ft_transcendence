import { BaseApiService } from './BaseApiService.js';
import { ErrorLevel } from '../../utils/ErrorHandler.js';
import {
  CreateGameRequestDto,
  GameResponseDto,
} from '../../types/types.js';

export class GameApiService extends BaseApiService {
  constructor() {
    super(undefined, 'GameApiService');
  }

  async createGame(gameSettings: CreateGameRequestDto): Promise<GameResponseDto> {
    try {
      // 백엔드는 직접 GameResponseDto를 반환 (success/msg/data 구조 아님)
      const response = await this.post<GameResponseDto>('/api/games', gameSettings);
      return response;
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'GameApiService.createGame',
        ErrorLevel.ERROR,
        {
          component: 'GameApiService',
          action: 'createGame',
          additionalData: { gameSettings },
        }
      );
      throw error;
    }
  }

  async getGameState(gameId: string): Promise<GameResponseDto> {
    try {
      // 백엔드는 직접 GameResponseDto를 반환 (success/msg/data 구조 아님)
      const response = await this.get<GameResponseDto>(`/api/games/${gameId}`);
      return response;
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'GameApiService.getGameState',
        ErrorLevel.ERROR,
        {
          component: 'GameApiService',
          action: 'getGameState',
          additionalData: { gameId },
        }
      );
      throw error;
    }
  }

  async cancelGame(gameId: string, reason?: 'user_exit' | 'page_unload' | 'network_error' | 'manual_cancel'): Promise<GameResponseDto> {
    try {
      // 백엔드는 직접 GameResponseDto를 반환 (success/msg/data 구조 아님)
      const response = await this.post<GameResponseDto>(`/api/games/${gameId}/cancel`, reason ? { reason } : {});
      return response;
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'GameApiService.cancelGame',
        ErrorLevel.ERROR,
        {
          component: 'GameApiService',
          action: 'cancelGame',
          additionalData: { gameId, reason },
        }
      );
      throw error;
    }
  }
}
