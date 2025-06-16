/**
 * GameApiService Mock 응답 핸들러
 * 프로덕션 빌드에서 동적 임포트로만 로드됨
 */

import * as Types from '../../types/types';

export const getGameApiServiceMockResponse = async <T>(
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  // Mock 데이터 시뮬레이션을 위한 지연
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  
  const method = options.method || 'GET';
  
  // 게임 생성 Mock
  if (endpoint.includes('/games') && method === 'POST') {
    return {
      id: Date.now(),
      status: 'created',
      gameMode: '1v1',
      player1: { id: 'mock-user-id', username: 'mockuser' },
      player2: null,
      startedAt: new Date().toISOString(),
      endedAt: null,
      winner: null,
      score: { player1: 0, player2: 0 }
    } as T;
  }
  
  // 게임 업데이트 Mock
  if (endpoint.includes('/games/') && method === 'PUT') {
    return {
      id: parseInt(endpoint.split('/').pop() || '0'),
      status: 'completed',
      gameMode: '1v1',
      player1: { id: 'mock-user-id', username: 'mockuser' },
      player2: { id: 'mock-opponent-id', username: 'opponent' },
      startedAt: new Date(Date.now() - 300000).toISOString(),
      endedAt: new Date().toISOString(),
      winner: 'player1',
      score: { player1: 11, player2: 7 }
    } as T;
  }
  
  // 게임 통계 Mock
  if (endpoint.includes('/games/stats')) {
    return {
      totalGames: 15,
      wins: 9,
      losses: 6,
      winRate: 0.6,
      averageScore: 7.5,
      bestStreak: 4,
      currentStreak: 2,
      ranking: 1250
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
