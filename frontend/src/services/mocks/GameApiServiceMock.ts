/**
 * GameApiService Mock 응답 핸들러
 * 현재 백엔드에 게임 API가 미구현 상태이므로 기본 Mock 데이터 제공
 */

export const getGameApiServiceMockResponse = async <T>(
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  // Mock 데이터 시뮬레이션을 위한 지연
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  
  const method = options.method || 'GET';
  
  // 게임 히스토리 조회 Mock
  if (endpoint.includes('/games/history') && method === 'GET') {
    return {
      success: true,
      msg: 'Game history retrieved successfully.',
      data: {
        matches: [
          {
            id: 'match_001',
            date: new Date(Date.now() - 86400000).toISOString(), // 1일 전
            opponent: 'gabumon_sage',
            score: '11-7',
            result: 'win',
            duration: 420
          },
          {
            id: 'match_002',
            date: new Date(Date.now() - 172800000).toISOString(), // 2일 전
            opponent: 'tentomon_genius',
            score: '9-11',
            result: 'loss',
            duration: 380
          },
          {
            id: 'match_003',
            date: new Date(Date.now() - 259200000).toISOString(), // 3일 전
            opponent: 'patamon_angel',
            score: '11-5',
            result: 'win',
            duration: 250
          }
        ]
      }
    } as T;
  }
  
  // 게임 통계 조회 Mock
  if (endpoint.includes('/games/stats') && method === 'GET') {
    return {
      success: true,
      msg: 'Game statistics retrieved successfully.',
      data: {
        gamesPlayed: 42,
        gamesWon: 28,
        gamesLost: 14,
        winRate: 66.7,
        averageGameDuration: 315,
        totalPlayTime: 13230
      }
    } as T;
  }
  
  // 게임 매치메이킹 Mock
  if (endpoint.includes('/games/matchmaking') && method === 'POST') {
    return {
      success: true,
      msg: 'Matchmaking started successfully.',
      data: {
        matchId: 'match_' + Date.now(),
        status: 'searching',
        estimatedWaitTime: 30
      }
    } as T;
  }
  
  // 게임 방 생성 Mock
  if (endpoint.includes('/games/room') && method === 'POST') {
    return {
      success: true,
      msg: 'Game room created successfully.',
      data: {
        roomId: 'room_' + Date.now(),
        roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        creator: 'agumon_trainer'
      }
    } as T;
  }
  
  // 게임 방 참여 Mock
  if (endpoint.includes('/games/room/') && endpoint.includes('/join') && method === 'POST') {
    return {
      success: true,
      msg: 'Joined game room successfully.',
      data: {
        roomId: endpoint.split('/')[3],
        players: ['agumon_trainer', 'gabumon_sage']
      }
    } as T;
  }
  
  // 기본 응답 - 구현되지 않은 API들
  return {
    error: 'Not Implemented',
    msg: 'Game API not fully implemented in backend'
  } as T;
};
