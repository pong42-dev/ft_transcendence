import { AuthApiService } from './api/AuthApiService.js';
import { GameApiService } from './api/GameApiService.js';
import { FriendApiService } from './api/FriendApiService.js';
import { UserApiService } from './api/UserApiService.js';
import { TournamentApiService } from './api/TournamentApiService.js';
import { BaseApiService } from './api/BaseApiService.js';
import { getConfig } from '../config/environment.js';
import { SimpleInterceptorManager } from './core/Interceptors.js';
import { TokenManager } from './core/TokenManager.js';

export { ApiError } from './api/BaseApiService.js';

/**
 * ApiClient: API 서비스들의 인스턴스화와 접근을 제공하는 팩토리 클래스
 * - 토큰 관리는 TokenManager에 완전히 위임
 * - 각 API 서비스들의 생성과 접근만 담당
 */
export class ApiClient {
  public auth: AuthApiService;
  public game: GameApiService;
  public friend: FriendApiService;
  public user: UserApiService;
  public tournament: TournamentApiService;
  private config = getConfig();

  constructor(options?: {
    showNotification?: (message: string, type: 'error' | 'warning' | 'info') => void;
    environment?: 'development' | 'production' | 'test';
  }) {
    // 인터셉터 시스템 초기화
    SimpleInterceptorManager.initialize({
      showNotification: options?.showNotification,
      environment: options?.environment || 'development'
    });

    // API 서비스 인스턴스 생성 (토큰 설정은 각 서비스가 TokenManager에서 직접 가져옴)
    this.auth = new AuthApiService();
    this.game = new GameApiService();
    this.friend = new FriendApiService();
    this.user = new UserApiService();
    this.tournament = new TournamentApiService();
  }

  /**
   * 정리 메서드 (더 이상 토큰 콜백 관리가 없으므로 단순화됨)
   */
  public destroy(): void {
    // 향후 필요시 서비스 정리 로직 추가
    console.info('[ApiClient] Destroyed');
  }

  /**
   * 캐시 초기화
   */
  public clearAllCaches(): void {
    this.auth.clearCache();
    this.game.clearCache();
    this.friend.clearCache();
    this.user.clearCache();
    this.tournament.clearCache();
  }

  /**
   * 인터셉터 초기화
   */
  public resetInterceptors(): void {
    SimpleInterceptorManager.reset();
    BaseApiService.clearInterceptorCache();
  }

  /**
   * 편의 메서드들 (TokenManager에 완전히 위임)
   */
  isAuthenticated(): boolean {
    return !!TokenManager.getAccessToken();
  }

  hasAuthToken(): boolean {
    return !!TokenManager.getAccessToken();
  }

  getToken(): string | null {
    return TokenManager.getAccessToken();
  }

  setToken(token: string | null): void {
    if (token) {
      TokenManager.setTokens(token);
    } else {
      TokenManager.clearTokens();
    }
  }

  clearToken(): void {
    TokenManager.clearTokens();
  }

  shouldUseMockData(): boolean {
    return this.config.useMockData;
  }
}