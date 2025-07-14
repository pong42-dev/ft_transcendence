/**
 * Mock 응답 핸들러 인덱스
 * 동적 임포트를 통해 필요할 때만 로드되는 Mock 데이터
 */

export { getAuthApiServiceMockResponse } from './AuthApiServiceMock.js';
export { getGameApiServiceMockResponse } from './GameApiServiceMock.js';
export { getFriendApiServiceMockResponse } from './FriendApiServiceMock.js';
export { getUserApiServiceMockResponse } from './UserApiServiceMock.js';

/**
 * 서비스 이름과 Mock 핸들러 매핑
 */
export const MOCK_HANDLERS = {
  AuthApiService: 'getAuthApiServiceMockResponse',
  GameApiService: 'getGameApiServiceMockResponse',
  FriendApiService: 'getFriendApiServiceMockResponse',
  UserApiService: 'getUserApiServiceMockResponse'
} as const;

/**
 * Mock 핸들러 동적 로딩 헬퍼
 */
export async function getMockHandler(serviceName: string) {
  const handlerName = MOCK_HANDLERS[serviceName as keyof typeof MOCK_HANDLERS];
  
  if (!handlerName) {
    throw new Error(`Mock handler not found for service: ${serviceName}`);
  }
  
  try {
    const mockModule = await import(`./${serviceName}Mock`);
    return mockModule[handlerName];
  } catch (error) {
    console.error(`Failed to load mock handler for ${serviceName}:`, error);
    throw new Error(`Mock loading failed for ${serviceName}`);
  }
}
