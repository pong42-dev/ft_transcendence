import { BaseApiService, ApiError } from './BaseApiService';
import { extractUserFromLoginResponse, convertToUser } from '../../utils/TypeSafetyUtils';
import { TokenManager } from '../core/TokenManager';
import * as Types from '../../types/types';

export class AuthApiService extends BaseApiService {
  constructor() {
    super(undefined, 'AuthApi'); // 인터셉터 시스템과 일치하도록 수정
  }

  // 로그인 - HttpOnly 쿠키 기반 인증
  async login(email: string, password: string): Promise<Types.User> {
    const response = await this.post<Types.LoginResponse>('/auth/login', {
      email, 
      password
    }, {
      credentials: 'include'
    });
    
    // Access Token은 메모리에 저장, Refresh Token은 서버가 HttpOnly 쿠키로 설정
    TokenManager.setTokens(response.accessToken, 'cookie-managed');
    console.log('[Auth] Login successful - tokens managed securely');
    
    // 타입 안전성을 위한 변환 검증
    return extractUserFromLoginResponse(response);
  }

  // 회원가입 - HttpOnly 쿠키 기반 인증
  async register(email: string, password: string, nickname: string): Promise<Types.User> {
    const response = await this.post<Types.LoginResponse>('/auth/register', {
      email, 
      password, 
      nickname
    }, {
      credentials: 'include'
    });
    
    // Access Token은 메모리에 저장, Refresh Token은 서버가 HttpOnly 쿠키로 설정
    TokenManager.setTokens(response.accessToken, 'cookie-managed');
    console.log('[Auth] Registration successful - tokens managed securely');
    
    // 타입 안전성을 위한 변환 검증
    return extractUserFromLoginResponse(response);
  }

  // 로그아웃 - HttpOnly 쿠키 정리 포함
  async logout(): Promise<void> {
    try {
      // 서버에 로그아웃 요청 (Refresh Token 쿠키 정리)
      await this.post('/auth/logout', {}, {
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

  // Google OAuth 로그인
  async loginWithGoogle(): Promise<Types.User> {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=email%20profile`;
    window.location.href = googleAuthUrl;
    
    throw new ApiError(501, 'Google OAuth not implemented', { message: 'Google login not yet implemented' });
  }

  // 현재 사용자 정보 조회 - 인터셉터에서 자동 변환됨
  async getCurrentUser(): Promise<Types.User> {
    const userData = await this.get<Types.User>('/users/me');
    // 타입 안전성을 위한 변환 검증
    return convertToUser(userData);
  }

  // 사용자 검색 (username으로) - 인터셉터에서 자동 변환됨
  async getUserByUsername(username: string): Promise<Types.User> {
    const userData = await this.get<Types.User>(`/users/${username}`);
    // 타입 안전성을 위한 변환 검증
    return convertToUser(userData);
  }

  // 사용자 검색 (query로) - 인터셉터에서 자동 변환됨
  async searchUsers(query: string): Promise<Types.User[]> {
    const usersData = await this.get<Types.User[]>(`/users/search?q=${encodeURIComponent(query)}`);
    // 배열의 각 요소가 올바른 타입인지 검증
    if (Array.isArray(usersData)) {
      return usersData.map(user => convertToUser(user));
    }
    throw new Error('Invalid users data structure. Expected User[] type after interceptor transformation.');
  }

  // 프로필 업데이트 - 인터셉터에서 자동 변환됨
  async updateUser(updates: Partial<Types.User>): Promise<Types.User> {
    const userData = await this.put<Types.User>('/users/me', updates);
    // 타입 안전성을 위한 변환 검증
    return convertToUser(userData);
  }
}
