import { AuthApiService } from './api/AuthApiService';
import { GameApiService } from './api/GameApiService';
import { FriendApiService } from './api/FriendApiService';
import { UserApiService } from './api/UserApiService';
import { TournamentApiService } from './api/TournamentApiService';
import { BaseApiService } from './api/BaseApiService';
import { getConfig } from '../config/environment';
import { SimpleInterceptorManager } from './core/Interceptors';
import { TokenManager } from './core/TokenManager';

export { ApiError } from './api/BaseApiService';

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
    // 단순화된 인터셉터 시스템 초기화
    SimpleInterceptorManager.initialize({
      showNotification: options?.showNotification,
      environment: options?.environment || 'development'
    });

    // 서비스 인스턴스 생성
    this.auth = new AuthApiService();
    this.game = new GameApiService();
    this.friend = new FriendApiService();
    this.user = new UserApiService();
    this.tournament = new TournamentApiService();

    // 기존 토큰 설정 (한 번만)
    const existingToken = TokenManager.getAccessToken();
    if (existingToken) {
      this.setTokenDirectly(existingToken);
    }
  }

  // 정리 메서드 (더 이상 필요 없음)
  public destroy(): void {
    // 콜백 시스템 제거로 인해 정리할 것이 없음
  }

  // 직접 토큰 설정 (콜백 없이)
  private setTokenDirectly(token: string | null): void {
    this.auth.setToken(token);
    this.game.setToken(token);
    this.friend.setToken(token);
    this.user.setToken(token);
    this.tournament.setToken(token);
  }

  // ...existing code...

  // 캐시 초기화
  public clearAllCaches(): void {
    this.auth.clearCache();
    this.game.clearCache();
    this.friend.clearCache();
    this.user.clearCache();
    this.tournament.clearCache();
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
    // TokenManager와 동기화 최적화
    if (token) {
      // 이미 동일한 토큰이면 중복 처리 방지
      const currentToken = TokenManager.getAccessToken();
      if (currentToken !== token) {
        TokenManager.setTokens(token);
      }
    } else {
      TokenManager.clearTokens();
    }
    // 각 서비스에 직접 설정
    this.setTokenDirectly(token);
  }

  clearToken(): void {
    // TokenManager 정리하고 모든 서비스에서 직접 제거
    TokenManager.clearTokens();
    this.setTokenDirectly(null);
  }

  shouldUseMockData(): boolean {
    return this.config.useMockData;
  }
}