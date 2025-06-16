import { BaseApiService, ApiError } from './BaseApiService';
import { extractUserFromLoginResponse, convertToUser } from '../utils/TypeSafetyUtils';
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

  // 토큰 검증 및 사용자 정보 조회
  async verifyToken(): Promise<Types.User> {
    const userData = await this.get<Types.User>('/auth/verify');
    return convertToUser(userData);
  }

  // Note: 사용자 관리 관련 메서드들은 UserApiService로 이동되었습니다.
  // - getCurrentUser() → UserApiService.getProfile()
  // - getUserByUsername() → UserApiService.getUserByUsername()
  // - searchUsers() → UserApiService.searchUsers()
  // - updateUser() → UserApiService.updateProfile()
}
