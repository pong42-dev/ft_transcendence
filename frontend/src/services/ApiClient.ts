import { AuthApiService } from './api/AuthApiService';
import { GameApiService } from './api/GameApiService';
import { FriendApiService } from './api/FriendApiService';
import { BaseApiService } from './api/BaseApiService';
import { getConfig } from '../config/environment';
import { SimpleInterceptorManager } from './core/Interceptors';

export { ApiError } from './api/BaseApiService';

export class ApiClient {
  public auth: AuthApiService;
  public game: GameApiService;
  public friend: FriendApiService;
  private config = getConfig();

  constructor(options?: {
    showNotification?: (message: string, type: 'error' | 'warning' | 'info') => void;
    environment?: 'development' | 'production' | 'test';
  }) {
    // 단순화된 인터셉터 시스템 초기화
    SimpleInterceptorManager.initialize({
      showNotification: options?.showNotification,
      environment: options?.environment || 'development'
    });

    // 서비스 인스턴스 생성
    this.auth = new AuthApiService();
    this.game = new GameApiService();
    this.friend = new FriendApiService();
  }

  // 캐시 초기화
  public clearAllCaches(): void {
    this.auth.clearCache();
    this.game.clearCache();
    this.friend.clearCache();
  }

  // 인터셉터 초기화 (단순화된 시스템)
  public resetInterceptors(): void {
    SimpleInterceptorManager.reset();
    BaseApiService.clearInterceptorCache();
  }

  // 핵심 공통 메서드들 (최소한의 공통 기능만 유지)
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  hasAuthToken(): boolean {
    return this.auth.isAuthenticated();
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
}