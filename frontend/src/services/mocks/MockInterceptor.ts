// src/services/mocks/MockInterceptor.ts
import { RequestInterceptor } from '../../types/types.js';
import { getConfig } from '../../config/environment.js';
import { ErrorHandler, ErrorLevel } from '../../utils/ErrorHandler.js';

export class MockInterceptor {
  private static instance: MockInterceptor | null = null;
  private config = getConfig();
  private errorHandler = ErrorHandler.getInstance();

  static getInstance(): MockInterceptor {
    if (!MockInterceptor.instance) {
      MockInterceptor.instance = new MockInterceptor();
    }
    return MockInterceptor.instance;
  }

  /**
   * 요청 인터셉터를 생성하여 Mock 데이터 처리를 담당
   */
  createRequestInterceptor(): RequestInterceptor {
    return {
      onRequest: async (config: RequestInit, endpoint: string) => {
        // Mock 데이터 사용이 비활성화된 경우 그대로 진행
        if (!this.config.useMockData) {
          return config;
        }

        if (this.config.enableLogging) {
          console.info(`[MockInterceptor] Using mock data for endpoint: ${endpoint}`);
        }

        // Mock 처리 플래그 설정
        return {
          ...config,
          headers: {
            ...config.headers,
            'X-Use-Mock': 'true'
          }
        };
      }
    };
  }

  /**
   * 서비스 이름에 따른 Mock 응답 가져오기
   */
  async getMockResponse(serviceName: string, endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      switch (serviceName) {
        case 'AuthApiService': {
          const module = await import('./AuthApiServiceMock');
          return await module.getAuthApiServiceMockResponse(endpoint, options);
        }
        case 'UserApiService': {
          const module = await import('./UserApiServiceMock');
          return await module.getUserApiServiceMockResponse(endpoint, options);
        }
        case 'GameApiService': {
          const module = await import('./GameApiServiceMock');
          return await module.getGameApiServiceMockResponse(endpoint, options);
        }
        case 'FriendApiService': {
          const module = await import('./FriendApiServiceMock');
          return await module.getFriendApiServiceMockResponse(endpoint, options);
        }
        default:
          throw new Error(`Mock handler not configured for service: ${serviceName}`);
      }
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'MockInterceptor.getMockResponse',
        ErrorLevel.ERROR,
        {
          component: 'MockInterceptor',
          action: 'mockLoading',
          additionalData: { serviceName, endpoint }
        }
      );

      // Mock 로딩 실패 시 기본 Mock 응답
      return {
        success: false,
        error: 'Mock loading failed',
        message: `Failed to load mock data for ${serviceName}`
      };
    }
  }

  /**
   * Mock 데이터 사용 여부 확인
   */
  shouldUseMockData(): boolean {
    return this.config.useMockData;
  }
}

// Export for backward compatibility
export default MockInterceptor;

// Mock API 응답 타입 정의
export interface MockApiResponse<T = any> {
  data?: T;
  success?: boolean;
  error?: string;
  message?: string;
  [key: string]: any;
}
