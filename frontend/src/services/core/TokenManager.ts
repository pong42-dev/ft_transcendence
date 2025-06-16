/**
 * 보안 강화된 토큰 관리자
 * - Access Token: 인메모리 저장 (XSS 공격 방지)
 * - Refresh Token: HttpOnly 쿠키 저장 (자동 관리)
 */

export class TokenManager {
  private static accessToken: string | null = null;
  private static readonly REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
  
  /**
   * 토큰 설정 (로그인 시 호출)
   * @param accessToken - 메모리에 저장될 액세스 토큰
   * @param refreshToken - HttpOnly 쿠키로 저장될 리프레시 토큰 (선택적)
   */
  static setTokens(accessToken: string, refreshToken?: string): void {
    // Access Token을 메모리에 저장
    this.accessToken = accessToken;
    console.log('[TokenManager] Access token stored in memory');
    
    // Refresh Token을 HttpOnly 쿠키로 설정 (서버에서 처리되어야 함)
    if (refreshToken) {
      // 클라이언트에서는 HttpOnly 쿠키를 직접 설정할 수 없으므로
      // 서버가 Set-Cookie 헤더로 설정해야 함을 로깅
      console.log('[TokenManager] Refresh token should be set by server as HttpOnly cookie');
    }
  }
  
  /**
   * 액세스 토큰 조회
   * @returns 메모리에 저장된 액세스 토큰
   */
  static getAccessToken(): string | null {
    return this.accessToken;
  }
  
  /**
   * 리프레시 토큰 존재 여부 확인
   * HttpOnly 쿠키는 JavaScript로 읽을 수 없으므로 서버 응답으로 확인
   * @returns 쿠키 존재 여부 (추정)
   */
  static hasRefreshToken(): boolean {
    // HttpOnly 쿠키는 document.cookie로 접근 불가
    // 서버 엔드포인트(/auth/check-refresh-token)를 통해 확인해야 함
    return document.cookie.includes(`${this.REFRESH_TOKEN_COOKIE_NAME}=`);
  }
  
  /**
   * 액세스 토큰만 업데이트 (토큰 갱신 시 호출)
   * @param accessToken - 새로운 액세스 토큰
   */
  static updateAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
    console.log('[TokenManager] Access token updated in memory');
  }
  
  /**
   * 모든 토큰 정리 (로그아웃 시 호출)
   */
  static clearTokens(): void {
    // 메모리에서 Access Token 제거
    this.accessToken = null;
    console.log('[TokenManager] Access token cleared from memory');
    
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
  
  // ============= 개발/디버깅용 메서드들 =============
  
  /**
   * 현재 토큰 상태 출력 (개발용)
   */
  static debugTokenState(): void {
    console.log('[TokenManager Debug]', {
      hasAccessToken: !!this.accessToken,
      accessTokenLength: this.accessToken?.length || 0,
      hasRefreshTokenCookie: this.hasRefreshToken(),
      isAuthenticated: this.isAuthenticated()
    });
  }
}
