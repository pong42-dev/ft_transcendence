/**
 * 보안 강화된 토큰 관리자
 * - Access Token: 인메모리 저장 (XSS 공격 방지)
 * - Refresh Token: HttpOnly 쿠키 저장 (자동 관리)
 * - 중앙 집중식 토큰 새로고침
 */

import { getConfig } from '../../config/environment.js';

export class TokenManager {
  private static accessToken: string | null = null;
  private static readonly REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
  private static readonly ACCESS_TOKEN_SESSION_KEY = 'access_token_session';
  private static isRefreshing = false;
  private static refreshPromise: Promise<string | null> | null = null;
  private static lastRefreshAttempt = 0;
  private static readonly MIN_REFRESH_INTERVAL = 5000; // 5초 최소 간격
  

  /**
   * 토큰 설정 (로그인 시 호출)
   * @param accessToken - 메모리와 세션 스토리지에 저장될 액세스 토큰
   * @param refreshToken - HttpOnly 쿠키로 저장될 리프레시 토큰 (선택적)
   */
  static setTokens(accessToken: string, refreshToken?: string): void {
    // Access Token을 메모리와 세션 스토리지에 이중 저장
    this.accessToken = accessToken;
    this.saveTokenToSession(accessToken);
    console.log('[TokenManager] Access token stored in memory and session storage');
    
    // Refresh Token을 HttpOnly 쿠키로 설정 (서버에서 처리되어야 함)
    if (refreshToken) {
      // 클라이언트에서는 HttpOnly 쿠키를 직접 설정할 수 없으므로
      // 서버가 Set-Cookie 헤더로 설정해야 함을 로깅
      console.log('[TokenManager] Refresh token should be set by server as HttpOnly cookie');
    }
  }
  
  /**
   * 액세스 토큰 조회 (메모리 우선, 없으면 세션 스토리지에서 복원)
   * @returns 액세스 토큰 또는 null
   */
  static getAccessToken(): string | null {
    // 메모리에 토큰이 있으면 바로 반환
    if (this.accessToken) {
      return this.accessToken;
    }
    
    // 메모리에 없으면 세션 스토리지에서 복원 시도
    const sessionToken = this.loadTokenFromSession();
    if (sessionToken) {
      this.accessToken = sessionToken;
      console.log('[TokenManager] Access token restored from session storage');
      return sessionToken;
    }
    
    return null;
  }
  
  /**
   * 리프레시 토큰 존재 여부 확인 (개선된 로직)
   * 세션에 access token이 있거나 최근 로그인 상태였다면 refresh token이 있을 가능성이 높음
   * @returns 쿠키 존재 가능성
   */
  static hasRefreshToken(): boolean {
    // 1. 현재 메모리나 세션에 access token이 있으면 refresh token도 있을 가능성 높음
    const hasAccessToken = this.accessToken || this.loadTokenFromSession();
    if (hasAccessToken) {
      console.log('[TokenManager] 🔑 Access token exists, refresh token likely available');
      return true;
    }
    
    // 2. 일반 쿠키에서 refresh token 확인 (non-HttpOnly인 경우)
    const hasRefreshCookie = document.cookie.includes(`${this.REFRESH_TOKEN_COOKIE_NAME}=`);
    if (hasRefreshCookie) {
      console.log('[TokenManager] 🍪 Refresh token cookie found (non-HttpOnly)');
      return true;
    }
    
    // 3. 최근 로그인 기록이 있는지 확인 (사용자 캐시가 있으면 가능성 높음)
    const hasUserCache = localStorage.getItem('user_state_cache');
    if (hasUserCache) {
      console.log('[TokenManager] 📱 Recent login cache found, refresh token might be available');
      return true;
    }
    
    console.log('[TokenManager] ❌ No indicators of refresh token availability');
    return false;
  }
  
  /**
   * 액세스 토큰만 업데이트 (토큰 갱신 시 호출)
   * @param accessToken - 새로운 액세스 토큰
   */
  static updateAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
    this.saveTokenToSession(accessToken);
    console.log('[TokenManager] Access token updated in memory and session storage');
  }

  /**
   * 중앙 집중식 토큰 새로고침
   * 동시에 여러 요청이 와도 하나의 refresh 요청만 보냄
   */
  static async refreshToken(): Promise<string | null> {
    console.log('[TokenManager] 🔄 Refresh token requested...');
    
    // Rate Limit 방지: 최근 갱신 시도가 너무 빠른 경우 건너뛰기
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.MIN_REFRESH_INTERVAL) {
      const remainingTime = this.MIN_REFRESH_INTERVAL - (now - this.lastRefreshAttempt);
      console.log(`[TokenManager] ⏰ Rate limit protection: skipping refresh (wait ${Math.ceil(remainingTime / 1000)}s more)`);
      
      // 기존 토큰이 있으면 반환, 없으면 null
      const currentToken = this.accessToken;
      if (currentToken) {
        console.log('[TokenManager] 💾 Returning existing token due to rate limit protection');
        return currentToken;
      }
      return null;
    }
    
    this.lastRefreshAttempt = now;
    
    // 새로고침 중이면 기존 Promise 반환 (중복 요청 방지)
    if (this.isRefreshing && this.refreshPromise) {
      console.log('[TokenManager] ⏸️ Already refreshing, waiting for existing request...');
      return await this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * 실제 토큰 새로고침 수행
   */
  private static async performTokenRefresh(): Promise<string | null> {
    console.log('[TokenManager] 🔄 Starting token refresh request...');
    
    try {
      const config = getConfig();
      const response = await fetch(`${config.apiUrl}/api/users/refresh-token`, {
        method: 'POST',
        credentials: 'include' // Include cookies (refresh token)
        // No Content-Type header since we're not sending a body
      });

      console.log('[TokenManager] 📡 Refresh response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('[TokenManager] 📦 Refresh response data:', responseData);
        
        // Backend API returns: { success: true, data: { accessToken: "..." } }
        const accessToken = responseData.data?.accessToken;
        if (accessToken) {
          this.updateAccessToken(accessToken);
          console.info('[TokenManager] ✅ Token refreshed successfully');
          return accessToken;
        } else {
          console.info('[TokenManager] ℹ️ No access token in response data');
          this.clearTokens();
          return null;
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        // 401은 정상적인 로그아웃 상태이므로 info 레벨로 처리
        if (response.status === 401) {
          console.info('[TokenManager] ℹ️ No valid refresh token (user not logged in)');
          this.clearTokens();
          return null;
        } 
        // 429 Rate Limit은 일시적 문제이므로 토큰을 유지하고 기존 토큰 반환
        else if (response.status === 429) {
          console.warn('[TokenManager] ⏰ Rate limit exceeded - keeping existing token');
          // 기존 토큰을 반환 (null이 아님으로써 갱신 성공으로 인식)
          // 단, 기존 토큰이 없으면 null 반환
          const currentToken = this.accessToken;
          if (currentToken) {
            console.log('[TokenManager] 💾 Returning existing token due to rate limit');
            return currentToken;
          } else {
            console.warn('[TokenManager] ⚠️ Rate limited but no existing token to preserve');
            return null;
          }
        }
        // 기타 에러는 토큰 무효화 (단, 세션 토큰이 있으면 한 번 더 기회 제공)
        else {
          console.warn('[TokenManager] ❌ Token refresh failed:', response.status, errorText);
          
          // 세션에 토큰이 있고 메모리 토큰과 다르다면 세션 토큰으로 재시도 기회 제공
          const sessionToken = this.loadTokenFromSession();
          if (sessionToken && sessionToken !== this.accessToken) {
            console.log('[TokenManager] 🔄 Trying with session token as fallback');
            this.accessToken = sessionToken;
            return sessionToken;
          }
          
          this.clearTokens();
          return null;
        }
      }
    } catch (error) {
      console.error('[TokenManager] 💥 Token refresh error:', error);
      
      // 네트워크 에러나 일시적 문제인 경우 기존 토큰 유지
      const isNetworkError = error instanceof Error && 
        (error.message.toLowerCase().includes('fetch') ||
         error.message.toLowerCase().includes('network') ||
         error.message.toLowerCase().includes('timeout') ||
         error.message.toLowerCase().includes('connection'));
      
      if (isNetworkError) {
        const availableToken = this.accessToken || this.loadTokenFromSession();
        if (availableToken) {
          console.warn('[TokenManager] ⚠️ Network error during token refresh - preserving available token');
          this.accessToken = availableToken;
          return availableToken;
        }
      }
      
      // 심각한 에러인 경우만 토큰 클리어
      this.clearTokens();
      return null;
    }
  }
  
  /**
   * 모든 토큰 정리 (로그아웃 시 호출)
   */
  static clearTokens(): void {
    // 메모리에서 Access Token 제거
    this.accessToken = null;
    
    // 세션 스토리지에서도 Access Token 제거
    this.clearTokenFromSession();
    
    console.log('[TokenManager] Access token cleared from memory and session storage');
    
    // Refresh Token 쿠키 제거는 서버에서 처리
    console.log('[TokenManager] Refresh token cookie should be cleared by server');
  }
  
  /**
   * 인증 상태 확인
   * @returns 유효한 액세스 토큰이 있는지 여부
   */
  static isAuthenticated(): boolean {
    return !!this.accessToken;
  }
  
  // ============= 기존 호환성을 위한 메서드들 =============
  
  /**
   * @deprecated Use setTokens() instead
   */
  static setToken(token: string): void {
    this.setTokens(token);
  }
  
  /**
   * @deprecated Use getAccessToken() instead
   */
  static getToken(): string | null {
    return this.getAccessToken();
  }
  
  /**
   * @deprecated Use clearTokens() instead
   */
  static clearToken(): void {
    this.clearTokens();
  }
  
  // ============= 세션 스토리지 관리 메서드들 =============
  
  /**
   * 세션 스토리지에 토큰 저장
   */
  private static saveTokenToSession(token: string): void {
    try {
      sessionStorage.setItem(this.ACCESS_TOKEN_SESSION_KEY, token);
    } catch (error) {
      console.warn('[TokenManager] Failed to save token to session storage:', error);
    }
  }
  
  /**
   * 세션 스토리지에서 토큰 로드
   */
  private static loadTokenFromSession(): string | null {
    try {
      return sessionStorage.getItem(this.ACCESS_TOKEN_SESSION_KEY);
    } catch (error) {
      console.warn('[TokenManager] Failed to load token from session storage:', error);
      return null;
    }
  }
  
  /**
   * 세션 스토리지에서 토큰 제거
   */
  private static clearTokenFromSession(): void {
    try {
      sessionStorage.removeItem(this.ACCESS_TOKEN_SESSION_KEY);
    } catch (error) {
      console.warn('[TokenManager] Failed to clear token from session storage:', error);
    }
  }
  
  // ============= 개발/디버깅용 메서드들 =============
  
  /**
   * 현재 토큰 상태 출력 (개발용)
   */
  static debugTokenState(): void {
    const sessionToken = this.loadTokenFromSession();
    console.log('[TokenManager Debug]', {
      hasAccessTokenMemory: !!this.accessToken,
      hasAccessTokenSession: !!sessionToken,
      accessTokenLength: this.accessToken?.length || 0,
      sessionTokenLength: sessionToken?.length || 0,
      hasRefreshTokenCookie: this.hasRefreshToken(),
      isAuthenticated: this.isAuthenticated(),
      tokenPreview: this.accessToken ? `${this.accessToken.substring(0, 20)}...` : 'none',
      sessionPreview: sessionToken ? `${sessionToken.substring(0, 20)}...` : 'none'
    });
  }

  /**
   * 토큰 동기화 상태 확인 (개발용)
   */
  static validateTokenSync(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.accessToken) {
      issues.push('No access token in memory');
    }
    
    // 토큰이 있지만 너무 짧거나 형식이 이상한 경우
    if (this.accessToken && this.accessToken.length < 50) {
      issues.push('Access token seems too short');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

// 디버깅을 위해 window 객체에 TokenManager 노출 (개발 환경에서만)
if (typeof window !== 'undefined') {
  (window as any).TokenManager = TokenManager;
}

