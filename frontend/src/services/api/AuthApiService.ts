import { BaseApiService, ApiError } from './BaseApiService';
import { TokenManager } from '../core/TokenManager';
import * as Types from '../../types/types';

export class AuthApiService extends BaseApiService {
  constructor() {
    super(undefined, 'AuthApiService');
  }

  // 로컬 로그인 - /api/users/login/local
  async login(email: string, password: string): Promise<Types.User> {
    const response = await this.post<{
      success: boolean;
      msg: string;
      data: {
        accessToken: string;
      };
    }>('/api/users/login/local', {
      email, 
      password
    }, {
      credentials: 'include'
    });
    
    // Access Token은 메모리에 저장, Refresh Token은 서버가 HttpOnly 쿠키로 설정
    TokenManager.setTokens(response.data.accessToken, 'cookie-managed');
    console.log('[Auth] Login successful - tokens managed securely');
    
    // 로그인 후 사용자 정보 가져오기
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
      twoFactorEnabled: false,
      gamesPlayed: 0,
      gamesWon: 0,
      friends: [],
      matchHistory: []
    };
    
    return user;
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
    
    console.log('[Auth] Registration successful, attempting auto-login');
    
    // 회원가입 성공 후 자동 로그인
    return await this.login(email, password);
  }

  // 로그아웃 - /api/users/logout
  async logout(): Promise<void> {
    try {
      // 서버에 로그아웃 요청 (Refresh Token 쿠키 정리)
      await this.post('/api/users/logout', {}, {
        credentials: 'include'
      });
      console.log('[Auth] Server logout successful');
    } catch (error) {
      console.warn('[Auth] Server logout failed:', error);
      // 서버 로그아웃 실패해도 클라이언트 토큰은 정리
    }
    
    // 클라이언트 토큰 정리 (Access Token 메모리에서 제거)
    TokenManager.clearTokens();
    console.log('[Auth] Client tokens cleared');
  }

  // Google OAuth 로그인 - /api/users/login/google
  async loginWithGoogle(): Promise<Types.User> {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=email%20profile`;
    window.location.href = googleAuthUrl;
    
    throw new ApiError(501, 'Google OAuth not implemented', { message: 'Google login not yet implemented' });
  }

  // 토큰 검증 및 사용자 정보 조회 - /api/users/me
  async verifyToken(): Promise<Types.User> {
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
      twoFactorEnabled: false,
      gamesPlayed: 0,
      gamesWon: 0,
      friends: [],
      matchHistory: []
    };
    
    return user;
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
      throw error;
    }
  }

  // Note: 사용자 관리 관련 메서드들은 UserApiService로 이동되었습니다.
  // - getCurrentUser() → UserApiService.getProfile()
  // - getUserByUsername() → UserApiService.getUserByUsername()
  // - searchUsers() → UserApiService.searchUsers()
  // - updateUser() → UserApiService.updateProfile()
}
