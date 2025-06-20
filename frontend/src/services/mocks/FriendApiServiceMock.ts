/**
 * FriendApiService Mock 응답 핸들러
 * 프로덕션 빌드에서 동적 임포트로만 로드됨
 */

import * as Types from '../../types/types';

export const getFriendApiServiceMockResponse = async <T>(
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  // Mock 데이터 시뮬레이션을 위한 지연
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  
  const method = options.method || 'GET';
  
  // 친구 목록 조회 Mock - /api/users/me/friends
  if (endpoint.includes('/api/users/me/friends') && method === 'GET') {
    return {
      success: true,
      msg: 'Friend list successfully retrieved.',
      data: {
        friends: [
          {
            user_id: 1,
            name: 'gabumon_user',
            avatar: 'https://digi-api.com/images/digimon/w/Gabumon.png',
            status: true
          },
          {
            user_id: 2,
            name: 'patamon_user',
            avatar: 'https://digi-api.com/images/digimon/w/Patamon.png',
            status: false
          },
          {
            user_id: 3,
            name: 'tentomon_fighter',
            avatar: 'https://digi-api.com/images/digimon/w/Tentomon.png',
            status: true
          }
        ]
      }
    } as T;
  }
  
  // 친구 추가 Mock - /api/users/me/friends
  if (endpoint.includes('/api/users/me/friends') && method === 'POST') {
    return {
      success: true,
      msg: 'Successfully followed the user.'
    } as T;
  }
  
  // 특정 친구 정보 조회 Mock - /api/users/me/friends/:id
  if (endpoint.match(/\/api\/users\/me\/friends\/\d+$/) && method === 'GET') {
    return {
      success: true,
      msg: 'Friend Profile successfully retrieved.',
      data: {
        friend: {
          name: 'mock_friend',
          avatar: 'https://digi-api.com/images/digimon/w/Agumon.png'
        }
      }
    } as T;
  }
  
  // 친구 삭제 Mock - /api/users/me/friends/:id
  if (endpoint.match(/\/api\/users\/me\/friends\/\d+$/) && method === 'DELETE') {
    return {
      success: true,
      msg: 'Successfully unfollowed the user.'
    } as T;
  }
  
  // 현재 백엔드에서 미구현된 친구 관련 API들
  if (endpoint.includes('/block') || endpoint.includes('/unblock')) {
    return {
      error: 'Not Implemented',
      msg: 'Block/unblock features not implemented in backend'
    } as T;
  }
  
  if (endpoint.includes('/requests')) {
    return {
      error: 'Not Implemented',
      msg: 'Friend requests not implemented - using direct follow system'
    } as T;
  }
  
  // 기본 응답
  return {
    success: true,
    msg: 'Mock response for FriendApiService'
  } as T;
};
