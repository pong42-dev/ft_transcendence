/**
 * AuthApiService Mock 응답 핸들러
 * 프로덕션 빌드에서 동적 임포트로만 로드됨
 */

import * as Types from '../../types/types';

export const getAuthApiServiceMockResponse = async <T>(
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  // Mock 데이터 시뮬레이션을 위한 지연
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  
  const method = options.method || 'GET';
  
  // 로그인 Mock
  if (endpoint.includes('/auth/login') && method === 'POST') {
    return {
      success: true,
      user: {
        id: 'mock-user-id',
        username: 'mockuser',
        nickname: 'Mock User',
        avatarUrl: '',
        twoFactorEnabled: false,
        gamesPlayed: 10,
        gamesWon: 6,
        friends: [],
        matchHistory: []
      },
      accessToken: 'mock_jwt_token_here',
      refreshToken: 'mock_refresh_token_here'
    } as T;
  }
  
  // 회원가입 Mock
  if (endpoint.includes('/auth/register') && method === 'POST') {
    return {
      success: true,
      user: {
        id: 'mock-new-user-id',
        username: 'newmockuser',
        nickname: 'New Mock User',
        avatarUrl: '',
        twoFactorEnabled: false,
        gamesPlayed: 0,
        gamesWon: 0,
        friends: [],
        matchHistory: []
      },
      accessToken: 'mock_jwt_token_new_user',
      refreshToken: 'mock_refresh_token_new_user'
    } as T;
  }
  
  // 현재 사용자 정보 Mock
  if (endpoint.includes('/auth/me') && method === 'GET') {
    return {
      id: 'mock-user-id',
      username: 'mockuser',
      nickname: 'Mock User',
      avatarUrl: '',
      twoFactorEnabled: false,
      gamesPlayed: 10,
      gamesWon: 6,
      friends: [],
      matchHistory: []
    } as T;
  }
  
  // 로그아웃 Mock
  if (endpoint.includes('/auth/logout') && method === 'POST') {
    return {
      success: true,
      message: 'Successfully logged out'
    } as T;
  }
  
  // 토큰 갱신 Mock
  if (endpoint.includes('/auth/refresh') && method === 'POST') {
    return {
      accessToken: 'new_mock_jwt_token',
      refreshToken: 'new_mock_refresh_token'
    } as T;
  }
  
  // 이메일 중복 확인 Mock
  if (endpoint.includes('/auth/check-email') && method === 'POST') {
    return {
      available: Math.random() > 0.5,
      message: Math.random() > 0.5 ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.'
    } as T;
  }
  
  // 닉네임 중복 확인 Mock
  if (endpoint.includes('/auth/check-nickname') && method === 'POST') {
    return {
      available: Math.random() > 0.5,
      message: Math.random() > 0.5 ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.'
    } as T;
  }
  
  // Google OAuth Mock (구현 예정)
  if (endpoint.includes('/auth/google')) {
    return {
      error: 'Google OAuth not implemented',
      message: 'Google login not yet implemented'
    } as T;
  }
  
  // 기본 응답
  return {
    success: true,
    message: 'Mock response for AuthApiService'
  } as T;
};
