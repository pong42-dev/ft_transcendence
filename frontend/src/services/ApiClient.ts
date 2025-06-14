import { AuthApiService } from './AuthApiService';
import { GameApiService } from './GameApiService';
import { FriendApiService } from './FriendApiService';
import { getConfig } from '../config/environment';
import * as Types from '../types/types';

export { ApiError } from './BaseApiService';

export class ApiClient {
  public auth: AuthApiService;
  public game: GameApiService;
  public friend: FriendApiService;
  private config = getConfig();

  constructor() {
    this.auth = new AuthApiService();
    this.game = new GameApiService();
    this.friend = new FriendApiService();
  }

  // 공통 메서드들 - auth 서비스에 위임
  hasAuthToken(): boolean {
    return this.auth.hasAuthToken();
  }

  getToken(): string | null {
    return this.auth.getToken();
  }

  setToken(token: string | null): void {
    // 모든 서비스에 토큰 설정
    this.auth.setToken(token);
    this.game.setToken(token);
    this.friend.setToken(token);
  }

  clearToken(): void {
    // 모든 서비스에서 토큰 제거
    this.auth.clearToken();
    this.game.clearToken();
    this.friend.clearToken();
  }

  shouldUseMockData(): boolean {
    return this.config.useMockData;
  }

  // 편의 메서드들 - 직접 서비스에 위임하여 기존 API 호환성 유지
  
  // Auth 관련 편의 메서드
  async login(email: string, password: string): Promise<Types.User> {
    return this.auth.login(email, password);
  }

  async register(email: string, password: string, nickname: string): Promise<Types.User> {
    return this.auth.register(email, password, nickname);
  }

  async logout(): Promise<void> {
    return this.auth.logout();
  }

  async loginWithGoogle(): Promise<Types.User> {
    return this.auth.loginWithGoogle();
  }

  async getCurrentUser(): Promise<Types.User> {
    return this.auth.getCurrentUser();
  }

  async getUserByUsername(username: string): Promise<Types.User> {
    return this.auth.getUserByUsername(username);
  }

  async searchUsers(query: string): Promise<Types.User[]> {
    return this.auth.searchUsers(query);
  }

  async updateUser(updates: Partial<Types.User>): Promise<Types.User> {
    return this.auth.updateUser(updates);
  }

  // Friend 관련 편의 메서드
  async getFriends(): Promise<Types.Friend[]> {
    return this.friend.getFriends();
  }

  async addFriend(username: string): Promise<void> {
    return this.friend.addFriend(username);
  }

  async removeFriend(username: string): Promise<void> {
    return this.friend.removeFriend(username);
  }

  async blockFriend(username: string): Promise<void> {
    return this.friend.blockFriend(username);
  }

  async unblockFriend(username: string): Promise<void> {
    return this.friend.unblockFriend(username);
  }

  // Game 관련 편의 메서드
  async createGame(gameData: any): Promise<any> {
    return this.game.createGame(gameData);
  }

  async updateGame(gameId: number, result: any): Promise<any> {
    return this.game.updateGame(gameId, result);
  }

  async getGameStats(): Promise<any> {
    return this.game.getGameStats();
  }

  async getMatchHistory(): Promise<Types.MatchHistory[]> {
    return this.game.getMatchHistory();
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.game.healthCheck();
  }
}