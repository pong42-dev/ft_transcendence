/**
 * GameApiService Mock 응답 핸들러
 * 현재 백엔드에 게임 API가 미구현 상태
 */

import * as Types from '../../types/types';

export const getGameApiServiceMockResponse = async <T>(
  endpoint: string,
  options: RequestInit
): Promise<T> => {
  // Mock 데이터 시뮬레이션을 위한 지연
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  
  const method = options.method || 'GET';
  
  // 모든 게임 관련 API는 현재 백엔드에서 미구현 상태
  return {
    error: 'Not Implemented',
    msg: 'Game API not implemented in backend'
  } as T;
};
