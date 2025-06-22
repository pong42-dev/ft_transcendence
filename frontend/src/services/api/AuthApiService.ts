import { BaseApiService, ApiError } from './BaseApiService';
import { TokenManager } from '../core/TokenManager';
import { ErrorLevel } from '../../utils/ErrorHandler';
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
      };
    }>('/api/users/login/local', {
      email, 
      password
    }, {
      credentials: 'include'
    });
    
    // 2FA가 필요한 경우
    if (response.requires2FA && response.data.token) {
      return {
        requires2FA: true,
        tmpToken: response.data.token
      };
    }
    
    // 일반 로그인 성공 (2FA 없음)
    if (response.data.accessToken) {
      // Access Token은 메모리에 저장, Refresh Token은 서버가 HttpOnly 쿠키로 설정
      TokenManager.setTokens(response.data.accessToken, 'cookie-managed');
      console.info('[Auth] Login successful - tokens managed securely');
      
      // 로그인 후 사용자 정보 가져오기 (캐시된 메서드 사용)
      return await this._fetchUserProfile(false);
    }
    
    throw new ApiError(401, 'Login failed', { message: 'Invalid response from server' });
  }

  // 2FA 로그인 완료 - tmpToken과 2FA 코드로 로그인 마무리
  async completeTwoFALogin(tmpToken: string, twoFACode: string): Promise<Types.User> {
    const response = await this.verifyTwoFA({
      tmpToken,
      token: twoFACode
    });
    
    // Access Token 저장
    TokenManager.setTokens(response.token, 'cookie-managed');
    console.info('[Auth] 2FA Login successful - tokens managed securely');
    
    // 사용자 정보 가져오기 (캐시된 메서드 사용)
    return await this._fetchUserProfile(true);
  }

  // 회원가입 - /api/users/register (multipart/form-data)
  async register(email: string, password: string, nickname: string, avatarFile?: File): Promise<Types.User> {
    // FormData 생성
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('name', nickname);
    
    // 아바타 파일이 있으면 추가, 없으면 기본 빈 파일 생성
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    } else {
      // 빈 파일 생성 (백엔드에서 필수로 요구하는 경우)
      const emptyFile = new File([''], 'default.png', { type: 'image/png' });
      formData.append('avatar', emptyFile);
    }
    
    // BaseApiService의 post 메소드 사용 (mock 지원)
    await this.post<{
      msg: string;
    }>('/api/users/register', formData, {
      credentials: 'include',
      isFormData: true
    });
    
    console.info('[Auth] Registration successful, attempting auto-login');
    
    // 회원가입 성공 후 자동 로그인
    const loginResult = await this.login(email, password);
    
    // 2FA가 필요한 경우는 에러로 처리 (회원가입 직후에는 2FA가 활성화되지 않음)
    if ('requires2FA' in loginResult) {
      throw new ApiError(500, 'Unexpected 2FA requirement after registration', { message: 'Registration succeeded but login requires 2FA' });
    }
    
    return loginResult;
  }

  // 로그아웃 - /api/users/logout
  async logout(): Promise<void> {
    try {
      // 서버에 로그아웃 요청 (Refresh Token 쿠키 정리)
      await this.post('/api/users/logout', {}, {
        credentials: 'include'
      });
      console.info('[Auth] Server logout successful');
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'AuthApiService.logout',
        ErrorLevel.WARNING,
        {
          component: 'AuthApiService',
          action: 'serverLogoutFailed'
        }
      );
      // 서버 로그아웃 실패해도 클라이언트 토큰은 정리
    }
    
    // 클라이언트 토큰 정리 (Access Token 메모리에서 제거)
    TokenManager.clearTokens();
    console.info('[Auth] Client tokens cleared');
  }

  // Google OAuth 로그인 - /api/users/login/google
  async loginWithGoogle(): Promise<void> {
    // 백엔드 OAuth 엔드포인트로 리다이렉트
    // 백엔드에서 Google OAuth URL 생성 및 리다이렉트 처리
    window.location.href = '/api/users/login/google';
  }

  // OAuth 콜백 후 사용자 정보 확인 - Google OAuth 완료 후 호출
  async handleOAuthCallback(): Promise<Types.User | null> {
    try {
      // OAuth 완료 후 사용자 정보 가져오기 (캐시된 메서드 사용)
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
    return await this._fetchUserProfile(false);
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
    await this.post<{
      success: boolean;
      msg: string;
    }>('/api/users/auth/2fa/enable', request, {
      credentials: 'include'
    });
  }

  // 2FA 로그인 검증 - /api/users/auth/2fa
  async verifyTwoFA(request: Types.TwoFAVerifyRequest): Promise<{ token: string }> {
    const response = await this.post<{
      success: boolean;
      msg: string;
      data: {
        token: string;
      };
    }>('/api/users/auth/2fa', request, {
      credentials: 'include'
    });
    
    return response.data;
  }

  // 2FA 비활성화 - /api/users/auth/2fa/disable
  async disableTwoFA(request: Types.TwoFADisableRequest): Promise<void> {
    await this.post<{
      success: boolean;
      msg: string;
    }>('/api/users/auth/2fa/disable', request, {
      credentials: 'include'
    });
  }

  // ===== PRIVATE HELPER METHODS =====

  // 사용자 프로필 정보를 가져오는 공통 메서드 (API 호출 중복 제거)
  private async _fetchUserProfile(twoFactorEnabled: boolean): Promise<Types.User> {
    const userProfileResponse = await this.get<{
      success: boolean;
      msg: string;
      data: {
        me: {
          name: string;
          avatar: string | null;
        };
      };
    }>('/api/users/me');
    
    // User 객체로 변환
    const user: Types.User = {
      id: '0', // API에서 제공하지 않으므로 기본값
      username: userProfileResponse.data.me.name,
      nickname: userProfileResponse.data.me.name,
      avatarUrl: userProfileResponse.data.me.avatar || undefined,
      twoFactorEnabled,
      gamesPlayed: 0,
      gamesWon: 0,
      friends: [],
      matchHistory: []
    };
    
    return user;
  }
}
