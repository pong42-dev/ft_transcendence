import { BaseApiService } from './BaseApiService';
import { 
  ApiResponse, 
  AuthResult, 
  LoginRequest, 
  RegisterRequest, 
  GoogleAuthRequest,
  RefreshTokenRequest,
  User 
} from '../types/api';

export class AuthApiService extends BaseApiService {
  constructor() {
    super();
  }

  // 로그인
  async login(email: string, password: string): Promise<ApiResponse<AuthResult>> {
    const loginData: LoginRequest = { email, password };
    
    const response = await this.post<AuthResult>('/users/login/local', loginData);
    
    // 로그인 성공 시 토큰 저장
    if (response.success && response.data) {
      this.setToken(response.data.token);
      // 리프레시 토큰도 저장
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    
    return response;
  }

  // 회원가입
  async register(email: string, password: string, nickname: string): Promise<ApiResponse<AuthResult>> {
    const registerData: RegisterRequest = { email, password, nickname };
    
    const response = await this.post<AuthResult>('/users/register', registerData);
    
    // 회원가입 성공 시 토큰 저장
    if (response.success && response.data) {
      this.setToken(response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    
    return response;
  }

  // Google OAuth 로그인
  async loginWithGoogle(googleToken: string): Promise<ApiResponse<AuthResult>> {
    const googleData: GoogleAuthRequest = { googleToken };
    
    const response = await this.post<AuthResult>('/users/login/google', googleData);
    
    if (response.success && response.data) {
      this.setToken(response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    
    return response;
  }

  // 로그아웃
  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    const response = await this.post<{ success: boolean }>('/users/logout');
    
    // 로그아웃 성공 여부와 관계없이 로컬 토큰 제거
    this.setToken(null);
    localStorage.removeItem('refreshToken');
    
    return response;
  }

  // 토큰 새로고침
  async refreshToken(): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      return {
        success: false,
        error: 'No refresh token available'
      };
    }

    const refreshData: RefreshTokenRequest = { refreshToken };
    
    const response = await this.post<{ token: string; refreshToken: string }>(
      '/users/refresh-token', 
      refreshData
    );
    
    if (response.success && response.data) {
      this.setToken(response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    
    return response;
  }

  // 현재 사용자 정보 조회
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.get<User>('/users/profile');
  }

  // 이메일 중복 확인
  async checkEmail(email: string): Promise<ApiResponse<{ available: boolean }>> {
    return this.post<{ available: boolean }>('/users/check-email', { email });
  }

  // 닉네임 중복 확인
  async checkNickname(nickname: string): Promise<ApiResponse<{ available: boolean }>> {
    return this.post<{ available: boolean }>('/users/check-name', { nickname });
  }

  // 2FA 활성화
  async enable2FA(): Promise<ApiResponse<{ qrCode: string; backupCodes: string[] }>> {
    return this.post<{ qrCode: string; backupCodes: string[] }>('/auth/2fa/enable');
  }

  // 2FA 인증 코드 확인
  async verify2FA(code: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/auth/2fa/verify', { code });
  }

  // 2FA 비활성화
  async disable2FA(code: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/auth/2fa/disable', { code });
  }

  // 사용자 검색 (닉네임으로)
  async searchUser(nickname: string): Promise<ApiResponse<User | null>> {
    try {
      const response = await this.get<User>(`/users/search/${encodeURIComponent(nickname)}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'User not found'
      };
    }
  }

  // 프로필 업데이트
  async updateProfile(data: { nickname?: string }): Promise<ApiResponse<User>> {
    return this.put<User>('/users/profile', data);
  }

  // 아바타 업로드
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return this.post<{ avatarUrl: string }>('/users/avatar', formData, true);
  }

  // 아바타 삭제
  async deleteAvatar(): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>('/users/avatar');
  }

  // 자동 토큰 새로고침 (토큰 만료 시 자동 호출)
  async autoRefreshToken(): Promise<boolean> {
    const response = await this.refreshToken();
    return response.success;
  }
}
