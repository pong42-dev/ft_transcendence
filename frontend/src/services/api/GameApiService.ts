import { BaseApiService, ApiError } from './BaseApiService';
import { ErrorLevel } from '../../utils/ErrorHandler';
import {
  CreateGameRequestDto,
  GameResponseDto,
} from '../../types/types';

export class GameApiService extends BaseApiService {
  constructor() {
    super(undefined, 'GameApiService');
  }

  async createGame(gameSettings: CreateGameRequestDto): Promise<GameResponseDto> {
    const response = await this.post('/api/games', gameSettings);
    return response as GameResponseDto;
  }

  async getGameState(gameId: string): Promise<GameResponseDto> {
    const response = await this.get(`/api/games/${gameId}`);
    return response as GameResponseDto;
  }

  async cancelGame(gameId: string, reason?: 'user_exit' | 'page_unload' | 'network_error' | 'manual_cancel'): Promise<GameResponseDto> {
    const response = await this.post(`/api/games/${gameId}/cancel`, reason ? { reason } : {});
    return response as GameResponseDto;
  }
}