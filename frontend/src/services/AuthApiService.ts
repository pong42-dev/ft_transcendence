import { BaseApiService, ApiError } from './BaseApiService';
import * as Types from '../types/types';

export class AuthApiService extends BaseApiService {
  constructor() {
    super();
  }

  // Mock 응답 생성 (BaseApiService의 추상 메서드 구현)
  protected async getMockResponse<T>(endpoint: string, options: RequestInit): Promise<T> {
    // Mock 데이터 시뮬레이션을 위한 지연
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    
    const method = options.method || 'GET';
    
    // Mock 응답 생성 로직
    if (endpoint.includes('/users/login/local') || endpoint.includes('/auth/login')) {
      return {
        user: {
          id: 1,
          username: 'mockuser',
          nickname: 'Mock User',
          email: 'mock@example.com',
          avatarUrl: '',
          twoFactorEnabled: false,
          gamesPlayed: 10,
          gamesWon: 6,
          friends: [],
          matchHistory: []
        },
        accessToken: 'mock_token_' + Date.now(),
        refreshToken: 'mock_refresh_' + Date.now(),
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const
      } as T;
    }
    
    if (endpoint.includes('/users/register') || endpoint.includes('/auth/register')) {
      return {
        user: {
          id: 2,
          username: 'newuser',
          nickname: 'New User',
          email: 'new@example.com',
          avatarUrl: '',
          twoFactorEnabled: false,
          gamesPlayed: 0,
          gamesWon: 0,
          friends: [],
          matchHistory: []
        },
        accessToken: 'mock_token_' + Date.now(),
        refreshToken: 'mock_refresh_' + Date.now(),
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const
      } as T;
    }
    
    if (endpoint.includes('/users/me') || endpoint.includes('/users/profile')) {
      return {
        id: 1,
        username: 'mockuser',
        nickname: 'Mock User',
        email: 'mock@example.com',
        avatarUrl: '',
        twoFactorEnabled: false,
        gamesPlayed: 10,
        gamesWon: 6,
        friends: [],
        matchHistory: []
      } as T;
    }

    if (endpoint.includes('/users/') && method === 'GET') {
      return {
        id: 3,
        username: 'searcheduser',
        nickname: 'Searched User',
        email: 'searched@example.com',
        avatarUrl: '',
        twoFactorEnabled: false,
        gamesPlayed: 5,
        gamesWon: 3,
        friends: [],
        matchHistory: []
      } as T;
    }

    if (endpoint.includes('/users/check-email')) {
      return { available: true } as T;
    }

    if (endpoint.includes('/users/check-name')) {
      return { available: true } as T;
    }

    // 기본 성공 응답
    return { success: true } as T;
  }

  // Type conversion utilities
  private convertBackendUserToFrontendUser(backendUser: Types.BackendUser): Types.User {
    return {
      id: backendUser.id.toString(),
      username: backendUser.username,
      nickname: backendUser.nickname || '',
      avatarUrl: backendUser.avatarUrl || '',
      twoFactorEnabled: backendUser.twoFactorEnabled,
      gamesPlayed: backendUser.gamesPlayed,
      gamesWon: backendUser.gamesWon,
      friends: backendUser.friends.map((f: Types.BackendFriend) => ({
        username: f.user.username,
        nickname: f.user.nickname || f.user.username,
        status: 'offline' as 'online' | 'offline' | 'in-game',
        blocked: f.status === 'blocked'
      })),
      matchHistory: backendUser.matchHistory.map((m: Types.BackendGameMatch) => ({
        date: new Date(m.startedAt).toLocaleDateString(),
        opponent: m.player2 ? m.player2.username : 'AI',
        rank: 1,
        type: m.gameMode === 'tournament' ? 'tournament' : '1v1',
        my_score: m.player1.id === backendUser.id ? m.player1Score : m.player2Score,
        opponent_score: m.player1.id === backendUser.id ? m.player2Score : m.player1Score
      }))
    };
  }

  // 로그인
  async login(email: string, password: string): Promise<Types.User> {
    const response = await this.post<Types.LoginResponse>('/auth/login', {
      email, 
      password
    });
    
    this.setToken(response.accessToken);
    return this.convertBackendUserToFrontendUser(response.user);
  }

  // 회원가입
  async register(email: string, password: string, nickname: string): Promise<Types.User> {
    const response = await this.post<Types.LoginResponse>('/auth/register', {
      email, 
      password, 
      nickname
    });
    
    this.setToken(response.accessToken);
    return this.convertBackendUserToFrontendUser(response.user);
  }

  // 로그아웃
  async logout(): Promise<void> {
    await this.post('/auth/logout', {});
    this.clearToken();
  }

  // Google OAuth 로그인
  async loginWithGoogle(): Promise<Types.User> {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=code&scope=email%20profile`;
    window.location.href = googleAuthUrl;
    
    throw new ApiError(501, 'Google OAuth not implemented', { message: 'Google login not yet implemented' });
  }

  // 현재 사용자 정보 조회
  async getCurrentUser(): Promise<Types.User> {
    const user = await this.get<Types.BackendUser>('/users/me');
    return this.convertBackendUserToFrontendUser(user);
  }

  // 사용자 검색 (username으로)
  async getUserByUsername(username: string): Promise<Types.User> {
    const user = await this.get<Types.BackendUser>(`/users/${username}`);
    return this.convertBackendUserToFrontendUser(user);
  }

  // 사용자 검색 (query로)
  async searchUsers(query: string): Promise<Types.User[]> {
    const users = await this.get<Types.BackendUser[]>(`/users/search?q=${encodeURIComponent(query)}`);
    return users.map(user => this.convertBackendUserToFrontendUser(user));
  }

  // 프로필 업데이트
  async updateUser(updates: Partial<Types.User>): Promise<Types.User> {
    const backendUpdates: any = {};
    if (updates.nickname !== undefined) {
      backendUpdates.nickname = updates.nickname;
    }
    if (updates.avatarUrl !== undefined) {
      backendUpdates.avatarUrl = updates.avatarUrl;
    }

    const user = await this.put<Types.BackendUser>('/users/me', backendUpdates);
    return this.convertBackendUserToFrontendUser(user);
  }
}
