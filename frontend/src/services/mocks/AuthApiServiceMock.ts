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
  
  // 로그인 Mock - /api/users/login/local
  if (endpoint.includes('/api/users/login/local') && method === 'POST') {
    return {
      success: true,
      msg: 'Successfully logged in.',
      data: {
        accessToken: 'mock_jwt_token_here'
      }
    } as T;
  }
  
  // 회원가입 Mock - /api/users/register
  if (endpoint.includes('/api/users/register') && method === 'POST') {
    return {
      msg: 'Registration completed successfully.'
    } as T;
  }
  
  // 현재 사용자 정보 Mock - /api/users/me
  if (endpoint.includes('/api/users/me') && method === 'GET') {
    return {
      success: true,
      msg: 'User Profile successfully retrieved.',
      data: {
        me: {
          name: 'agumon_trainer',
          avatar: 'https://digi-api.com/images/digimon/w/Agumon.png'
        }
      }
    } as T;
  }
  
  // 로그아웃 Mock - /api/users/logout
  if (endpoint.includes('/api/users/logout') && method === 'POST') {
    return {
      success: true,
      msg: 'Successfully logged out'
    } as T;
  }
  
  // 토큰 갱신 Mock - /api/users/refresh-token
  if (endpoint.includes('/api/users/refresh-token') && method === 'POST') {
    return {
      success: true,
      msg: 'Token refreshed successfully.',
      data: {
        accessToken: 'new_mock_jwt_token'
      }
    } as T;
  }
  
  // 이메일 중복 확인 Mock - /api/users/check-email
  if (endpoint.includes('/api/users/check-email') && method === 'POST') {
    return {
      success: true,
      msg: '사용 가능한 이메일입니다.'
    } as T;
  }
  
  // 닉네임 중복 확인 Mock - /api/users/check-name
  if (endpoint.includes('/api/users/check-name') && method === 'POST') {
    return {
      success: true,
      msg: '사용 가능한 닉네임입니다.'
    } as T;
  }
  
  // Google OAuth Mock - /api/users/login/google (구현 예정)
  if (endpoint.includes('/api/users/login/google')) {
    return {
      error: 'Google OAuth not implemented',
      msg: 'Google login not yet implemented'
    } as T;
  }
  
  // 기본 응답
  return {
    success: true,
    message: 'Mock response for AuthApiService'
  } as T;
};
