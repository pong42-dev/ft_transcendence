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
  
  // 친구 목록 조회 Mock
  if (endpoint.includes('/friends') && method === 'GET') {
    return [
      {
        id: 1,
        user: {
          id: 'friend-1',
          username: 'friend1',
          nickname: 'Friend One',
          avatarUrl: '',
          twoFactorEnabled: false,
          gamesPlayed: 5,
          gamesWon: 3,
          friends: [],
          matchHistory: []
        },
        status: 'accepted',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 2,
        user: {
          id: 'friend-2',
          username: 'friend2',
          nickname: 'Friend Two',
          avatarUrl: '',
          twoFactorEnabled: false,
          gamesPlayed: 8,
          gamesWon: 6,
          friends: [],
          matchHistory: []
        },
        status: 'accepted',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: 3,
        user: {
          id: 'friend-3',
          username: 'friend3',
          nickname: 'Friend Three',
          avatarUrl: '',
          twoFactorEnabled: true,
          gamesPlayed: 12,
          gamesWon: 7,
          friends: [],
          matchHistory: []
        },
        status: 'pending',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString()
      }
    ] as T;
  }
  
  // 친구 요청 보내기 Mock
  if (endpoint.includes('/friends') && method === 'POST') {
    return {
      success: true,
      requestId: `request-${Date.now()}`,
      message: 'Friend request sent successfully'
    } as T;
  }
  
  // 친구 요청 수락/거절 Mock
  if (endpoint.includes('/friends/') && method === 'PUT') {
    const action = endpoint.includes('/accept') ? 'accepted' : 'rejected';
    return {
      success: true,
      status: action,
      message: `Friend request ${action} successfully`
    } as T;
  }
  
  // 친구 삭제 Mock
  if (endpoint.includes('/friends/') && method === 'DELETE') {
    return {
      success: true,
      message: 'Friend removed successfully'
    } as T;
  }
  
  // 친구 검색 Mock
  if (endpoint.includes('/friends/search')) {
    const query = new URL(`http://dummy${endpoint}`).searchParams.get('q') || '';
    
    const mockUsers = [
      {
        id: 'search-1',
        username: `user_${query}1`,
        nickname: `User ${query} One`,
        avatarUrl: '',
        status: 'online' as const,
        blocked: false
      },
      {
        id: 'search-2',
        username: `user_${query}2`,
        nickname: `User ${query} Two`,
        avatarUrl: '',
        status: 'offline' as const,
        blocked: false
      }
    ];
    
    return mockUsers.filter(user => 
      user.username.includes(query.toLowerCase()) || 
      user.nickname.toLowerCase().includes(query.toLowerCase())
    ) as T;
  }
  
  // 친구 온라인 상태 Mock
  if (endpoint.includes('/friends/online')) {
    return [
      {
        id: 'friend-1',
        username: 'friend1',
        nickname: 'Friend One',
        status: 'online' as const,
        blocked: false,
        lastSeen: new Date().toISOString()
      },
      {
        id: 'friend-2',
        username: 'friend2',
        nickname: 'Friend Two',
        status: 'in-game' as const,
        blocked: false,
        lastSeen: new Date(Date.now() - 60000).toISOString(),
        currentGame: {
          id: 'game-123',
          opponent: 'player5',
          startedAt: new Date(Date.now() - 300000).toISOString()
        }
      }
    ] as T;
  }
  
  // 차단 목록 조회 Mock
  if (endpoint.includes('/friends/blocked')) {
    return [
      {
        id: 'blocked-1',
        username: 'blockeduser1',
        nickname: 'Blocked User One',
        status: 'offline' as const,
        blocked: true,
        blockedAt: new Date(Date.now() - 604800000).toISOString()
      }
    ] as T;
  }
  
  // 사용자 차단 Mock
  if (endpoint.includes('/friends/') && endpoint.includes('/block') && method === 'POST') {
    return {
      success: true,
      message: 'User blocked successfully'
    } as T;
  }
  
  // 사용자 차단 해제 Mock
  if (endpoint.includes('/friends/') && endpoint.includes('/unblock') && method === 'POST') {
    return {
      success: true,
      message: 'User unblocked successfully'
    } as T;
  }
  
  // 헬스 체크 Mock
  if (endpoint.includes('/health')) {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'FriendApiService'
    } as T;
  }
  
  // 기본 응답
  return {
    success: true,
    message: 'Mock response for FriendApiService'
  } as T;
};
