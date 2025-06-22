import { BaseApiService, ApiError } from './BaseApiService';
import { ErrorLevel } from '../../utils/ErrorHandler';

export class GameApiService extends BaseApiService {
  constructor() {
    super(undefined, 'GameApiService');
  }

  // 백엔드에 게임 관련 API가 구현되지 않았으므로 
  // 모든 게임 관련 메소드는 501 응답 반환
  
  private throwNotImplemented(): never {
    this.errorHandler.handleError(
      new ApiError(501, 'Not Implemented', { 
        message: 'Game APIs are not implemented in backend yet' 
      }),
      'GameApiService.throwNotImplemented',
      ErrorLevel.WARNING,
      {
        component: 'GameApiService',
        action: 'notImplemented'
      }
    );
    throw new ApiError(501, 'Not Implemented', { 
      message: 'Game APIs are not implemented in backend yet' 
    });
  }

  async getAvailableGames(): Promise<any[]> {
    this.throwNotImplemented();
  }

  async createGame(gameSettings: any): Promise<any> {
    this.throwNotImplemented();
  }

  async joinGame(gameId: string): Promise<any> {
    this.throwNotImplemented();
  }

  async leaveGame(gameId: string): Promise<void> {
    this.throwNotImplemented();
  }

  async startGame(gameId: string): Promise<any> {
    this.throwNotImplemented();
  }

  async updateGameState(gameId: string, gameState: any): Promise<any> {
    this.throwNotImplemented();
  }

  async getGameState(gameId: string): Promise<any> {
    this.throwNotImplemented();
  }

  async getMatchHistory(userId?: string): Promise<any[]> {
    this.throwNotImplemented();
  }

  async getLeaderboard(): Promise<any[]> {
    this.throwNotImplemented();
  }
}