/**
 * FriendApiService Mock 응답 핸들러
 * 프로덕션 빌드에서 동적 임포트로만 로드됨
 */

export const getFriendApiServiceMockResponse = async <T>(
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  // Mock 데이터 시뮬레이션을 위한 지연
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  
  const method = options.method || 'GET';
  
  // 친구 목록 조회 Mock - /api/users/me/friends (exact match)
  if (endpoint === '/api/users/me/friends' && method === 'GET') {
    return {
      success: true,
      msg: 'Friend list successfully retrieved.',
      data: {
        friends: [
          {
            user_id: 1,
            name: 'gabumon_sage',
            avatar: 'https://digi-api.com/images/digimon/w/Gabumon.png',
            status: true
          },
          {
            user_id: 2,
            name: 'patamon_angel',
            avatar: 'https://digi-api.com/images/digimon/w/Patamon.png',
            status: false
          },
          {
            user_id: 3,
            name: 'tentomon_genius',
            avatar: 'https://digi-api.com/images/digimon/w/Tentomon.png',
            status: true
          },
          {
            user_id: 4,
            name: 'palmon_flower',
            avatar: 'https://digi-api.com/images/digimon/w/Palmon.png',
            status: true
          },
          {
            user_id: 5,
            name: 'gomamon_sailor',
            avatar: 'https://digi-api.com/images/digimon/w/Gomamon.png',
            status: false
          }
        ]
      }
    } as T;
  }
  
  // 친구 추가 Mock - /api/users/me/friends (exact match)
  if (endpoint === '/api/users/me/friends' && method === 'POST') {
    const body = JSON.parse(options.body as string || '{}');
    const friendName = body.friend_name;
    
    // 이미 친구인 경우 시뮬레이션
    const existingFriends = ['gabumon_sage', 'patamon_angel', 'tentomon_genius', 'palmon_flower', 'gomamon_sailor'];
    if (existingFriends.includes(friendName)) {
      throw new Error(JSON.stringify({
        status: 409,
        message: 'You are already following this user.'
      }));
    }
    
    // 존재하지 않는 사용자 시뮬레이션
    if (friendName === 'nonexistent_user') {
      throw new Error(JSON.stringify({
        status: 409,
        message: 'User does not exist.'
      }));
    }
    
    return {
      success: true,
      msg: 'Successfully followed the user.'
    } as T;
  }
  
  // 특정 친구 정보 조회 Mock - /api/users/me/friends/:id
  if (endpoint.match(/\/api\/users\/me\/friends\/\d+$/) && method === 'GET') {
    const friendId = parseInt(endpoint.split('/').pop() || '0');
    
    // 존재하지 않는 친구 ID 시뮬레이션
    if (friendId === 999) {
      throw new Error(JSON.stringify({
        status: 409,
        message: 'You are not following this user.'
      }));
    }
    
    // Mock 친구 데이터
    const mockFriends: Record<number, { name: string; avatar: string }> = {
      1: { name: 'gabumon_sage', avatar: 'https://digi-api.com/images/digimon/w/Gabumon.png' },
      2: { name: 'patamon_angel', avatar: 'https://digi-api.com/images/digimon/w/Patamon.png' },
      3: { name: 'tentomon_genius', avatar: 'https://digi-api.com/images/digimon/w/Tentomon.png' },
      4: { name: 'palmon_flower', avatar: 'https://digi-api.com/images/digimon/w/Palmon.png' },
      5: { name: 'gomamon_sailor', avatar: 'https://digi-api.com/images/digimon/w/Gomamon.png' }
    };
    
    const friend = mockFriends[friendId] || { name: 'mock_friend', avatar: 'https://digi-api.com/images/digimon/w/Agumon.png' };
    
    return {
      success: true,
      msg: 'Friend Profile successfully retrieved.',
      data: {
        friend: {
          user_id: friendId,
          ...friend
        }
      }
    } as T;
  }
  
  // 친구 삭제 Mock - /api/users/me/friends/:id
  if (endpoint.match(/\/api\/users\/me\/friends\/\d+$/) && method === 'DELETE') {
    const friendId = parseInt(endpoint.split('/').pop() || '0');
    
    // 존재하지 않는 친구 ID 시뮬레이션
    if (friendId === 999) {
      throw new Error(JSON.stringify({
        status: 409,
        message: 'You are not following this user.'
      }));
    }
    
    // 잘못된 친구 ID 시뮬레이션
    if (friendId === 0 || isNaN(friendId)) {
      throw new Error(JSON.stringify({
        status: 409,
        message: 'Invalid friend ID.'
      }));
    }
    
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
