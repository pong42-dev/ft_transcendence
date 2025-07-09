import { BaseApiService, ApiError } from './BaseApiService';
import { TokenManager } from '../core/TokenManager';
import { ErrorLevel } from '../../utils/ErrorHandler';
import { getConfig } from '../../config/environment';
import * as Types from '../../types/types';

export class AuthApiService extends BaseApiService {
  constructor() {
    super(undefined, 'AuthApiService');
  }

  // 로컬 로그인 - /api/users/login/local (2FA 지원)
  async login(email: string, password: string): Promise<Types.User | { requires2FA: true; tmpToken: string }> {
    const response = await this.post<{
      success: boolean;
      requires2FA?: boolean;
      msg: string;
      data: {
        accessToken?: string;
        token?: string; // temporary token for 2FA
        access_token?: string; // alternative token field name
      };
    }>('/api/users/login/local', {
      email, 
      password
    }, {
      credentials: 'include'
    });
    
    
    // 2FA가 필요한 경우
    if (response.requires2FA && response.data?.token) {
      return {
        requires2FA: true,
        tmpToken: response.data.token
      };
    }
    
    // 일반 로그인 성공 (2FA 없음) - 다양한 토큰 필드명 지원
    const accessToken = response.data.accessToken || response.data.token || response.data.access_token;
    if (accessToken) {
      // Access Token을 TokenManager에 저장, Refresh Token은 서버가 HttpOnly 쿠키로 설정
      TokenManager.setTokens(accessToken, 'cookie-managed');
      
      // 토큰 설정 확인
      console.info('[Auth] Login successful - tokens managed securely', {
        tokenLength: accessToken.length,
        tokenManagerHasToken: !!TokenManager.getAccessToken(),
        apiClientHasToken: !!TokenManager.getAccessToken()
      });
      
      // 로그인 후 사용자 정보 가져오기 (2FA 없이 로그인했으므로 2FA 비활성화 상태)
      return await this._fetchUserProfile(false);
    }
    
    // 디버깅을 위한 로그
    console.error('[Auth] Login response structure:', JSON.stringify(response, null, 2));
    throw new ApiError(401, 'Login failed', { message: 'Invalid response from server' });
  }

  // 2FA 로그인 완료 - tmpToken과 2FA 코드로 로그인 마무리
  async completeTwoFALogin(tmpToken: string, twoFACode: string): Promise<Types.User> {
    const response = await this.verifyTwoFA({
      tmpToken,
      token: twoFACode
    });
    
    // Access Token을 TokenManager에 저장
    TokenManager.setTokens(response.token, 'cookie-managed');
    
    // 사용자 정보 가져오기 (2FA 완료 상태)
    return await this._fetchUserProfile(true);
  }

  // 회원가입 - /api/users/register (multipart/form-data)
  async register(email: string, password: string, nickname: string, avatarFile?: File): Promise<Types.User> {
    // FormData 생성
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('name', nickname);
    
    // 아바타 파일이 있을 때만 추가
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    
    // BaseApiService의 post 메소드 사용 (mock 지원)
    const registerResponse = await this.post<{
      success?: boolean;
      msg: string;
    }>('/api/users/register', formData, {
      credentials: 'include',
      isFormData: true
    });
    
    // 백엔드 스키마에 따른 성공/실패 판단:
    // - 성공: 201 상태코드 + success 필드 없음
    // - 실패: 200 상태코드 + success: false
    if (registerResponse.success === false) {
      throw new ApiError(400, 'Registration failed', { message: registerResponse.msg });
    }
    
    console.info('[Auth] Registration successful - no auto-login');
    
    // 회원가입 성공 후 기본 사용자 객체 반환 (토큰 없이)
    return {
      id: '0',
      username: nickname,
      nickname: nickname,
      avatarUrl: undefined,
      twoFactorEnabled: false,
      gamesPlayed: 0,
      gamesWon: 0,
      friends: [],
      matchHistory: []
    };
  }

  // 로그아웃 - /api/users/logout
  async logout(): Promise<void> {
    // 토큰이 있는지 먼저 확인
    const hasToken = TokenManager.getAccessToken();
    
    if (hasToken) {
      // 토큰이 있으면 서버에 로그아웃 요청 (Authorization 헤더 자동 포함됨)
      try {
        // 백엔드 스키마에 맞춰 cookies 헤더 포함 (CORS 수정됨)
        await this.post('/api/users/logout', {}, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            // 백엔드에서 요구하는 cookies 헤더
            'cookies': document.cookie || 'refresh_token=placeholder;'
          }
        });
        console.info('[Auth] Server logout successful');
      } catch (error) {
        // 404나 401 에러는 이미 로그아웃된 상태이므로 INFO 레벨로 처리
        const apiError = error as ApiError;
        if (apiError.status === 404 || apiError.status === 401) {
          console.info('[Auth] User already logged out on server');
        } else {
          // 다른 에러는 경고로 처리
          console.warn('[Auth] Server logout failed:', error);
          
          this.errorHandler.handleError(
            error as Error,
            'AuthApiService.logout',
            ErrorLevel.INFO,
            {
              component: 'AuthApiService',
              action: 'serverLogoutFailed',
              additionalData: { note: 'Server cleanup failed, proceeding with client logout' }
            }
          );
        }
      }
    } else {
      console.info('[Auth] No token available, skipping server logout');
    }
    
    // 서버 요청 결과와 관계없이 클라이언트 토큰은 항상 정리
    TokenManager.clearTokens();
    console.info('[Auth] Client tokens cleared');
    
    // 다른 탭에 로그아웃 이벤트 브로드캐스트
    this.broadcastLogout();
  }

  // 다른 탭에 로그아웃 이벤트 브로드캐스트
  private broadcastLogout(): void {
    try {
      // BroadcastChannel 지원 확인
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('auth_channel');
        channel.postMessage({ type: 'logout' });
        channel.close();
        console.info('[Auth] Logout event broadcasted to other tabs');
      } else {
        // BroadcastChannel 미지원 시 localStorage 이벤트 사용
        localStorage.setItem('auth_logout_event', Date.now().toString());
        localStorage.removeItem('auth_logout_event');
        console.info('[Auth] Logout event dispatched via localStorage');
      }
    } catch (error) {
      console.warn('[Auth] Failed to broadcast logout event:', error);
    }
  }

  // Google OAuth 로그인 - /api/users/login/google
  async loginWithGoogle(): Promise<never> {
    // Mock 환경에서는 직접 API 호출로 사용자 반환
    if (this.shouldUseMockData()) {
      const user = await this.get<Types.User>('/api/users/login/google');
      // Mock에서는 Promise를 reject하지 않고 전역 상태를 업데이트
      setTimeout(() => {
        const event = new CustomEvent('mockOAuthSuccess', { detail: user });
        window.dispatchEvent(event);
      }, 100);
      throw new Error('Mock OAuth redirect');
    }
    
    // OAuth 로그인 시도 추적
    sessionStorage.setItem('oauth_login_attempt', 'true');
    
    // 실제 환경에서는 전체 페이지 리다이렉트
    const config = getConfig();
    window.location.href = `${config.apiUrl}/api/users/login/google`;
    
    // 리다이렉트가 완료될 때까지 대기하는 Promise (실제로는 페이지가 바뀜)
    return new Promise(() => {
      // 이 Promise는 resolve되지 않음 (페이지 리다이렉트)
    });
  }

  // OAuth 콜백 후 사용자 정보 확인 - Google OAuth 완료 후 호출
  async handleOAuthCallback(): Promise<Types.User | null> {
    try {
      // OAuth 완료 후 토큰 갱신부터 시도 (새로운 refresh token 쿠키가 설정되었을 수 있음)
      const newToken = await TokenManager.refreshToken();
      if (newToken) {
        // TokenManager가 이미 새 토큰을 저장했으므로 추가 작업 불필요
        console.info('[Auth] OAuth callback - token refreshed and synchronized');
      }
      
      // OAuth 완료 후 사용자 정보 가져오기 (OAuth 로그인은 일반적으로 2FA 우회하므로 기본값 사용)
      return await this._fetchUserProfile(false);
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'AuthApiService.handleOAuthCallback',
        ErrorLevel.INFO,
        {
          component: 'AuthApiService',
          action: 'oauthCallbackFailed'
        }
      );
      return null;
    }
  }

  // Google OAuth 신규 회원가입 감지 및 프로필 설정 모달 표시
  async handleGoogleRegisterFlow(): Promise<Types.User | null> {
    // 실제 환경에서는 사용하지 않음 (Mock에서만 구현)
    return null;
  }

  // 토큰 검증 및 사용자 정보 조회 - /api/users/me
  async verifyToken(): Promise<Types.User> {
    const currentToken = TokenManager.getAccessToken();
    
    // 토큰이 없으면 에러
    if (!currentToken) {
      throw new ApiError(401, 'Authentication required', { message: 'No access token available for verification' });
    }
    
    // 기본값 사용
    return await this._fetchUserProfile(false);
  }

  // 토큰 검증 및 사용자 정보 조회 (2FA 상태 확인 건너뛰기) - 토큰 갱신 후 사용
  async verifyTokenWithoutTwoFACheck(): Promise<Types.User> {
    return await this._fetchUserProfileWithoutTwoFACheck();
  }

  // 토큰 갱신 - /api/users/refresh-token
  async refreshToken(): Promise<string> {
    const response = await this.post<{
      success: boolean;
      msg: string;
      data: {
        accessToken: string;
      };
    }>('/api/users/refresh-token', {}, {
      credentials: 'include'
    });
    
    TokenManager.setTokens(response.data.accessToken, 'cookie-managed');
    return response.data.accessToken;
  }

  // 이메일 중복 확인 - /api/users/check-email
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const response = await this.post<{
        success: boolean;
        msg: string;
      }>('/api/users/check-email', { email });
      
      return !response.success; // success가 false면 중복(이미 존재)
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'AuthApiService.checkEmailExists',
        ErrorLevel.ERROR,
        {
          component: 'AuthApiService',
          action: 'checkEmailExists',
          additionalData: { email }
        }
      );
      throw error;
    }
  }

  // 닉네임 중복 확인 - /api/users/check-name
  async checkNicknameExists(nickname: string): Promise<boolean> {
    try {
      const response = await this.post<{
        success: boolean;
        msg: string;
      }>('/api/users/check-name', { name: nickname });
      
      return !response.success; // success가 false면 중복(이미 존재)
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'AuthApiService.checkNicknameExists',
        ErrorLevel.ERROR,
        {
          component: 'AuthApiService',
          action: 'checkNicknameExists',
          additionalData: { nickname }
        }
      );
      throw error;
    }
  }

  // ===== 2FA METHODS =====

  // 2FA 설정 초기화 - /api/users/auth/2fa/enable/init
  async initTwoFA(): Promise<Types.TwoFAInitResponse> {
    // 토큰이 있는지 확인
    const token = TokenManager.getAccessToken();
    
    if (!token) {
      console.error('[Auth] No access token available for 2FA initialization');
      throw new ApiError(401, 'Authentication required', { message: 'No access token available for 2FA initialization' });
    }
    
    const response = await this.post<{
      success: boolean;
      msg: string;
      data: {
        qrCodeUrl: string;
        secret: string;
        token: string;
      };
    }>('/api/users/auth/2fa/enable/init', {}, {
      credentials: 'include'
    });
    
    return response.data;
  }

  // 2FA 활성화 - /api/users/auth/2fa/enable
  async enableTwoFA(request: Types.TwoFAEnableRequest): Promise<void> {
    // 토큰이 있는지 확인
    const token = TokenManager.getAccessToken();
    if (!token) {
      throw new ApiError(401, 'Authentication required', { message: 'No access token available for 2FA activation' });
    }
    
    await this.post<{
      success: boolean;
      msg: string;
    }>('/api/users/auth/2fa/enable', request, {
      credentials: 'include'
    });
    
  }

  // 2FA 로그인 검증 - /api/users/auth/2fa
  async verifyTwoFA(request: Types.TwoFAVerifyRequest): Promise<{ token: string }> {
    // 2FA 검증 시 tmpToken은 body에만 포함 (Authorization 헤더 사용 안함)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    const response = await this.post<{
      success: boolean;
      msg: string;
      data: {
        token: string;
      };
    }>('/api/users/auth/2fa', request, {
      credentials: 'include',
      headers
    });
    
    // 2FA 검증 실패 시 에러 던지기
    if (!response.success) {
      throw new ApiError(409, '2FA verification failed', { message: response.msg });
    }
    
    return response.data;
  }

  // 2FA 비활성화 - /api/users/auth/2fa/disable
  async disableTwoFA(request: Types.TwoFADisableRequest): Promise<void> {
    // 토큰이 있는지 확인
    const token = TokenManager.getAccessToken();
    if (!token) {
      throw new ApiError(401, 'Authentication required', { message: 'No access token available for 2FA deactivation' });
    }
    
    await this.post<{
      success: boolean;
      msg: string;
    }>('/api/users/auth/2fa/disable', request, {
      credentials: 'include'
    });
    
  }


  // ===== PRIVATE HELPER METHODS =====

  // 사용자 프로필 정보를 가져오는 공통 메서드 (API 호출 중복 제거)
  private async _fetchUserProfile(fallbackTwoFactorEnabled: boolean = false): Promise<Types.User> {
    const userProfileResponse = await this.get<any>('/api/users/me');
    
    // 응답 구조 검증 및 호환성 처리
    let userData: { name: string; avatar: string | null; twoFA?: boolean; email?: string; provider?: string };
    
    if (userProfileResponse.data?.userInfo) {
      // 새로운 API 구조: data.userInfo
      userData = userProfileResponse.data.userInfo;
    } else if (userProfileResponse.data?.me) {
      // 이전 API 구조: data.me (호환성)
      const meData = userProfileResponse.data.me;
      userData = {
        name: meData.name,
        avatar: meData.avatar,
        twoFA: meData.twoFactorEnabled,
        email: meData.email,
        provider: meData.provider
      };
      console.warn('[Auth] Using legacy API structure (data.me)');
    } else {
      console.error('[Auth] Invalid API response structure:', userProfileResponse);
      throw new Error('Invalid API response structure: missing userInfo or me');
    }
    
    // 필수 필드 검증
    if (!userData.name) {
      console.error('[Auth] Missing required field: name');
      throw new Error('Invalid user data: missing name field');
    }
    
    // 2FA 상태 결정 로직: 서버 제공 → fallback
    let twoFactorEnabled: boolean;
    
    if (userData.twoFA !== undefined) {
      // 서버에서 명시적으로 2FA 상태를 제공한 경우
      twoFactorEnabled = userData.twoFA;
    } else {
      // 서버에서 2FA 상태를 제공하지 않는 경우 fallback 사용
      console.warn('[Auth] No 2FA info in profile, using fallback:', fallbackTwoFactorEnabled);
      twoFactorEnabled = fallbackTwoFactorEnabled;
    }
    
    // User 객체로 변환
    const user: Types.User = {
      id: '0', // API에서 제공하지 않으므로 기본값
      username: userData.name,
      nickname: userData.name,
      email: userData.email || undefined,
      avatarUrl: userData.avatar || undefined,
      twoFactorEnabled,
      provider: userData.provider || undefined,
      gamesPlayed: 0,
      gamesWon: 0,
      friends: [],
      matchHistory: []
    };
    
    return user;
  }

  // 사용자 프로필 정보를 가져오는 공통 메서드 (2FA 상태 확인 없이)
  private async _fetchUserProfileWithoutTwoFACheck(): Promise<Types.User> {
    const userProfileResponse = await this.get<any>('/api/users/me');
    
    // 응답 구조 검증 및 호환성 처리
    let userData: { name: string; avatar: string | null; twoFA?: boolean; email?: string; provider?: string };
    
    if (userProfileResponse.data?.userInfo) {
      // 새로운 API 구조: data.userInfo
      userData = userProfileResponse.data.userInfo;
    } else if (userProfileResponse.data?.me) {
      // 이전 API 구조: data.me (호환성)
      const meData = userProfileResponse.data.me;
      userData = {
        name: meData.name,
        avatar: meData.avatar,
        twoFA: meData.twoFactorEnabled,
        email: meData.email,
        provider: meData.provider
      };
      console.warn('[Auth] Using legacy API structure (data.me)');
    } else {
      console.error('[Auth] Invalid API response structure:', userProfileResponse);
      throw new Error('Invalid API response structure: missing userInfo or me');
    }
    
    // 필수 필드 검증
    if (!userData.name) {
      console.error('[Auth] Missing required field: name');
      throw new Error('Invalid user data: missing name field');
    }
    
    // 서버에서 제공된 2FA 상태 사용, 없으면 기본값(false) 사용
    const twoFactorEnabled = userData.twoFA ?? false;
    
    // User 객체로 변환
    const user: Types.User = {
      id: '0', // API에서 제공하지 않으므로 기본값
      username: userData.name,
      nickname: userData.name,
      email: userData.email || undefined,
      avatarUrl: userData.avatar || undefined,
      twoFactorEnabled,
      provider: userData.provider || undefined,
      gamesPlayed: 0,
      gamesWon: 0,
      friends: [],
      matchHistory: []
    };
    
    return user;
  }
}
