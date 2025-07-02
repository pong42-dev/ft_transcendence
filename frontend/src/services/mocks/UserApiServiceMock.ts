/**
 * UserApiService Mock 응답 핸들러
 * 사용자 정보 관련 API Mock 응답 제공
 */

// Mock 사용자 상태 관리 (메모리에 저장)
let mockUserState = {
  name: 'pong_champion',
  avatar: 'https://digi-api.com/images/digimon/w/Gabumon.png',
  twoFA: false,
  email: 'champion@pongcli.dev'
};

export const getUserApiServiceMockResponse = async <T>(
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  // Mock 데이터 시뮬레이션을 위한 지연
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  
  const method = options.method || 'GET';
  const body = options.body;
  
  // 현재 사용자 프로필 조회 Mock - /api/users/me
  if (endpoint.includes('/api/users/me') && method === 'GET') {
    return {
      success: true,
      msg: 'User Profile successfully retrieved.',
      data: {
        userInfo: {
          name: mockUserState.name,
          avatar: mockUserState.avatar,
          twoFA: mockUserState.twoFA,
          email: mockUserState.email
        }
      }
    } as T;
  }
  
  // 닉네임 변경 Mock - /api/users/me/name
  if (endpoint.includes('/api/users/me/name') && method === 'PATCH') {
    const jsonBody = JSON.parse(body as string);
    const newName = jsonBody.name;
    
    if (newName && newName.trim().length >= 2) {
      mockUserState.name = newName.trim();
      console.log(`[Mock] Name updated to: ${mockUserState.name}`);
      
      return {
        success: true,
        msg: 'Name updated successfully.'
      } as T;
    }
    
    return {
      success: false,
      msg: 'Name must be at least 2 characters long.'
    } as T;
  }
  
  // 아바타 업로드 Mock - /api/users/me/avatar
  if (endpoint.includes('/api/users/me/avatar') && method === 'PUT') {
    const avatarFile = (body as FormData).get('avatar') as File;
    
    if (avatarFile && avatarFile.size > 0) {
      // Mock 새 아바타 URL
      const mockAvatars = [
        'https://digi-api.com/images/digimon/w/Agumon.png',
        'https://digi-api.com/images/digimon/w/Patamon.png',
        'https://digi-api.com/images/digimon/w/Tentomon.png'
      ];
      
      mockUserState.avatar = mockAvatars[Math.floor(Math.random() * mockAvatars.length)];
      console.log(`[Mock] Avatar updated: ${avatarFile.name}`);
      
      return {
        success: true,
        msg: 'Avatar updated successfully.'
      } as T;
    }
    
    return {
      success: false,
      msg: 'No avatar file provided.'
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