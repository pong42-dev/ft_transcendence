/**
 * GameApiService Mock 응답 핸들러
 * 프로덕션 빌드에서 동적 임포트로만 로드됨
 */

import * as Types from '../../types/types';

export const getGameApiServiceMockResponse = async <T>(
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  // Mock 데이터 시뮬레이션을 위한 지연 (개선된 지연 시간)
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200));
  
  const method = options.method || 'GET';
  const now = new Date();
  
  // 게임 생성 Mock
  if (endpoint === '/games' && method === 'POST') {
    const mockGame: Types.Game = {
      id: `game-${Date.now()}`,
      gameMode: '1v1',
      players: [
        { id: 'user-123', username: 'mockuser', isReady: true },
      ],
      status: 'waiting',
      startedAt: now.toISOString(),
      maxPlayers: 2,
      currentScore: { player1: 0, player2: 0 }
    };
    return mockGame as T;
  }

  // 게임 참가 Mock
  if (endpoint.includes('/join') && method === 'POST') {
    const gameId = endpoint.split('/')[2];
    const mockGame: Types.Game = {
      id: gameId,
      gameMode: '1v1',
      players: [
        { id: 'user-123', username: 'mockuser', isReady: true },
        { id: 'user-456', username: 'opponent', isReady: true }
      ],
      status: 'in_progress',
      startedAt: now.toISOString(),
      maxPlayers: 2,
      currentScore: { player1: 0, player2: 0 }
    };
    return mockGame as T;
  }

  // 게임 정보 조회 Mock
  if (endpoint.match(/\/games\/[^\/]+$/) && method === 'GET') {
    const gameId = endpoint.split('/')[2];
    const mockGame: Types.Game = {
      id: gameId,
      gameMode: '1v1',
      players: [
        { id: 'user-123', username: 'mockuser', isReady: true },
        { id: 'user-456', username: 'opponent', isReady: true }
      ],
      status: 'in_progress',
      startedAt: new Date(now.getTime() - 120000).toISOString(),
      maxPlayers: 2,
      currentScore: { player1: 3, player2: 2 }
    };
    return mockGame as T;
  }

  // 게임 움직임 Mock
  if (endpoint.includes('/move') && method === 'POST') {
    const gameId = endpoint.split('/')[2];
    const mockGame: Types.Game = {
      id: gameId,
      gameMode: '1v1',
      players: [
        { id: 'user-123', username: 'mockuser', isReady: true },
        { id: 'user-456', username: 'opponent', isReady: true }
      ],
      status: 'in_progress',
      startedAt: new Date(now.getTime() - 180000).toISOString(),
      maxPlayers: 2,
      currentScore: { player1: 4, player2: 2 }
    };
    return mockGame as T;
  }

  // 게임 통계 Mock
  if (endpoint.includes('/games/stats')) {
    return {
      totalGames: 25,
      gamesWon: 15,
      gamesLost: 10,
      winRate: 0.6,
      averageScore: 7.5,
      favoriteGameMode: '1v1'
    } as T;
  }
  
  // 매치 히스토리 Mock
  if (endpoint.includes('/games/history') || endpoint.includes('/matches')) {
    return [
      {
        id: 1,
        date: new Date(Date.now() - 86400000).toISOString(),
        opponent: ['opponent1'],
        rank: 1,
        type: '1v1' as const,
        my_score: 11,
        opponent_score: 8,
        result: 'win',
        duration: 180
      },
      {
        id: 2,
        date: new Date(Date.now() - 172800000).toISOString(),
        opponent: ['opponent2'],
        rank: 2,
        type: '1v1' as const,
        my_score: 7,
        opponent_score: 11,
        result: 'loss',
        duration: 240
      },
      {
        id: 3,
        date: new Date(Date.now() - 259200000).toISOString(),
        opponent: ['player1', 'player2', 'player3'],
        rank: 1,
        type: 'tournament' as const,
        my_score: 15,
        opponent_score: 12,
        result: 'win',
        duration: 420
      }
    ] as T;
  }
  
  // 활성 게임 목록 Mock
  if (endpoint.includes('/games/active')) {
    return [
      {
        id: 'game-1',
        status: 'waiting',
        gameMode: '1v1',
        player1: { id: 'player-1', username: 'waitingPlayer' },
        player2: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'game-2',
        status: 'in-progress',
        gameMode: '1v1',
        player1: { id: 'player-2', username: 'player2' },
        player2: { id: 'player-3', username: 'player3' },
        startedAt: new Date(Date.now() - 60000).toISOString()
      }
    ] as T;
  }
  
  // 게임 초대 관련 Mock
  if (endpoint.includes('/games/invite') && method === 'POST') {
    return {
      success: true,
      inviteId: `invite-${Date.now()}`,
      message: 'Game invite sent successfully'
    } as T;
  }
  
  // 초대 응답 Mock
  if (endpoint.includes('/games/invite/') && method === 'PUT') {
    return {
      success: true,
      message: 'Invite response recorded'
    } as T;
  }
  
  // 게임 참여 Mock
  if (endpoint.includes('/games/') && endpoint.includes('/join') && method === 'POST') {
    return {
      success: true,
      gameId: endpoint.split('/')[2],
      message: 'Successfully joined game'
    } as T;
  }
  
  // 게임 나가기 Mock
  if (endpoint.includes('/games/') && endpoint.includes('/leave') && method === 'POST') {
    return {
      success: true,
      message: 'Successfully left game'
    } as T;
  }
  
  // 헬스 체크 Mock
  if (endpoint.includes('/health')) {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'GameApiService'
    } as T;
  }
  
  // 기본 응답
  return {
    success: true,
    message: 'Mock response for GameApiService'
  } as T;
};
