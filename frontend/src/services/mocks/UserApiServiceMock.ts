/**
 * UserApiService Mock 응답 핸들러
 * 사용자 정보 관련 API Mock 응답 제공
 */

import * as Types from '../../types/types';

export const getUserApiServiceMockResponse = async <T>(
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  // Mock 데이터 시뮬레이션을 위한 지연
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  
  const method = options.method || 'GET';
  
  // 현재 사용자 프로필 조회 Mock - /api/users/me
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
  
  // 닉네임 변경 Mock - /api/users/me/name
  if (endpoint.includes('/api/users/me/name') && method === 'PATCH') {
    return {
      success: true,
      msg: 'Name updated successfully.'
    } as T;
  }
  
  // 아바타 업로드 Mock - /api/users/me/avatar
  if (endpoint.includes('/api/users/me/avatar') && method === 'PUT') {
    return {
      success: true,
      msg: 'Avatar updated successfully.'
    } as T;
  }
  
  // 사용자 검색 Mock (현재 백엔드 미구현)
  if (endpoint.includes('/users/search') && method === 'GET') {
    return {
      error: 'Not Implemented',
      msg: 'User search not implemented in backend'
    } as T;
  }
  
  // ID로 사용자 조회 Mock (현재 백엔드 미구현)
  if (endpoint.match(/\/users\/[^/]+$/) && method === 'GET') {
    return {
      error: 'Not Implemented',
      msg: 'User lookup by ID not implemented in backend'
    } as T;
  }
  
  // 기본 응답
  return {
    success: true,
    message: 'Mock response for UserApiService'
  } as T;
};