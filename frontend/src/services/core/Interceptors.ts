/**
 * 단순화된 인터셉터 시스템
 * 모든 인터셉터 로직을 하나의 파일에 통합
 */

import { RequestInterceptor, ResponseInterceptor } from '../../types/types.js';
import { 
  transformUser, 
  transformFriend, 
  transformGame
} from './DataTransformers.js';
import { ApiError } from '../api/BaseApiService.js';
import { TokenManager } from './TokenManager.js';
import { MockInterceptor } from '../mocks/MockInterceptor.js';
import { ErrorHandler, ErrorLevel } from '../../utils/ErrorHandler.js';

// URL 패턴 매칭을 위한 간단한 헬퍼
const URL_PATTERNS = {
  AUTH: /\/auth\/(login|register)$/,
  USER_PROFILE: /\/users\/me$/,
  USER_SINGLE: /\/users\/[^/]+$/,
  USER_SEARCH: /\/users\/search/,
  FRIENDS: /\/friends/,
  GAMES: /\/(games|matches)/,
} as const;

/**
 * 통합 인터셉터 생성 함수들
 */
export const createInterceptors = (options?: {
  showNotification?: (message: string, type: 'error' | 'warning' | 'info') => void;
  environment?: 'development' | 'production' | 'test';
}) => {
  const environment = options?.environment || 'development';
  const showNotification = options?.showNotification;

  // 🎭 Mock 인터셉터 (Mock 환경에서만)
  const mockInterceptor = MockInterceptor.getInstance().createRequestInterceptor();

  // 🔐 인증 인터셉터
  const authInterceptor: RequestInterceptor = {
    onRequest: async (config, endpoint) => {
      
      const publicEndpoints = [
        '/auth/login', 
        '/auth/register', 
        '/users/check-email',
        '/users/check-name',
        '/users/login/local',
        '/users/login/google',
        '/users/register',
        '/users/refresh-token' // refresh 요청은 쿠키 기반이므로 토큰 불필요
      ];
      const isPublicEndpoint = publicEndpoints.some(ep => endpoint.includes(ep));
      // 2FA 검증 엔드포인트만 tmpToken 사용 (정확한 매칭)
      const is2FAVerifyEndpoint = endpoint.endsWith('/users/auth/2fa');
      
      
      if (!isPublicEndpoint && !is2FAVerifyEndpoint) {
        const token = TokenManager.getAccessToken();
        
        if (!token) {
          console.error('[Interceptor] ❌ No access token available for endpoint:', endpoint);
          throw new Error('Authentication required - no access token');
        }
        
        // Authorization 헤더 설정
        const headers = config.headers || {};
        if (typeof headers === 'object' && !Array.isArray(headers)) {
          (headers as Record<string, string>).Authorization = `Bearer ${token}`;
          config.headers = headers;
        }
      } else {
      }
      
      // 2FA 검증 엔드포인트는 tmpToken을 사용하고, enable/disable은 일반 토큰을 사용
      
      return config;
    }
  };

  // 🔄 데이터 변환 인터셉터
  const dataTransformInterceptor: ResponseInterceptor = {
    onResponse: async (response, data) => {
      const url = response.url;
      
      // 변환이 필요한 데이터인지 먼저 확인
      if (!data || typeof data !== 'object') {
        return data;
      }
      
      // 간단한 패턴 매칭으로 변환 로직 결정
      try {
        if (URL_PATTERNS.AUTH.test(url) && data.user) {
          data.user = transformUser(data.user);
          return data;
        }
        
        if (URL_PATTERNS.USER_PROFILE.test(url) || URL_PATTERNS.USER_SINGLE.test(url)) {
          // 사용자 데이터가 있는 경우만 변환
          if (data.data && data.data.me) {
            return data; // 이미 올바른 구조이므로 변환하지 않음
          }
        }
        
        if (URL_PATTERNS.USER_SEARCH.test(url) && Array.isArray(data)) {
          return data.map(transformUser);
        }
        
        if (URL_PATTERNS.FRIENDS.test(url) && Array.isArray(data)) {
          return data.map(transformFriend);
        }
        
        if (URL_PATTERNS.GAMES.test(url) && Array.isArray(data)) {
          return data.map(transformGame);
        }
      } catch (error) {
        // 변환 실패 시 원본 데이터 반환 및 로그
        ErrorHandler.getInstance().handleError(
          error as Error,
          'Interceptors.dataTransformationInterceptor',
          ErrorLevel.WARNING,
          {
            component: 'Interceptors',
            action: 'dataTransformationFailed',
            additionalData: { url, dataType: typeof data }
          }
        );
      }
      
      return data;
    }
  };

  // 🔄 토큰 새로고침 인터셉터 (401 에러 처리) - Interceptor에서는 감지만
  const tokenRefreshInterceptor: ResponseInterceptor = {
    onResponse: async (response, data) => {
      // 401 Unauthorized 응답이고 refresh token 엔드포인트가 아닌 경우
      if (response.status === 401 && !response.url.includes('/refresh-token')) {
        
        // 401 에러를 특별한 에러로 마킹하여 BaseApiService에서 처리하도록 함
        const error = new Error('TOKEN_REFRESH_REQUIRED');
        (error as any).isTokenRefreshRequired = true;
        (error as any).originalResponse = response;
        (error as any).originalData = data;
        throw error;
      }
      
      return data;
    }
  };

  // 🚨 에러 알림 인터셉터
  const errorNotificationInterceptor: ResponseInterceptor = {
    onResponseError: async (error) => {
      if (!showNotification) return error;
      
      let message = '요청 처리 중 오류가 발생했습니다.';
      let type: 'error' | 'warning' | 'info' = 'error';
      
      if (error instanceof ApiError && error.data?.message) {
        message = error.data.message;
      } else if (error.message.includes('401')) {
        message = '인증이 필요합니다. 다시 로그인해주세요.';
        type = 'warning';
      } else if (error.message.includes('403')) {
        message = '접근 권한이 없습니다.';
      } else if (error.message.includes('404')) {
        message = '요청한 리소스를 찾을 수 없습니다.';
      } else if (error.message.includes('500')) {
        message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error instanceof TypeError || error.message.includes('fetch')) {
        message = '네트워크 연결을 확인하고 다시 시도해주세요.';
        type = 'warning';
      }
      
      showNotification(message, type);
      return error;
    }
  };

  // 📊 로깅 인터셉터 (개발 환경만)
  const loggingInterceptor = environment === 'development' ? {
    request: {
      onRequest: async (config: RequestInit, endpoint: string) => {
        console.group(`🚀 API Request: ${config.method || 'GET'} ${endpoint}`);
        console.groupEnd();
        return config;
      }
    } as RequestInterceptor,
    response: {
      onResponse: async (response: Response, data: any) => {
        console.group(`✅ API Response: ${response.status} ${response.url}`);
        
        // /api/users/me 응답에 대해서만 상세 로깅
        if (response.url.includes('/api/users/me')) {
          console.log('Response data:', data);
          if (data?.data?.tournHistory) {
            console.log('Tournament History from response:', data.data.tournHistory);
            data.data.tournHistory.forEach((tournament: any, index: number) => {
              console.log(`Response Tournament ${index}:`, tournament);
              if (tournament.rounds) {
                tournament.rounds.forEach((round: any, roundIndex: number) => {
                  console.log(`Response Round ${roundIndex}:`, {
                    round_number: round.round_number,
                    has_player1: !!round.player1,
                    has_player2: !!round.player2,
                    player1: round.player1,
                    player2: round.player2
                  });
                });
              }
            });
          }
        }
        
        console.groupEnd();
        return data;
      },
      onResponseError: async (error: Error) => {
        // 로그아웃 관련 404/401 에러는 조용히 처리
        if (error instanceof Error && error.message.includes('/api/users/logout')) {
          const apiError = error as any;
          if (apiError.status === 404 || apiError.status === 401) {
            console.info('Logout request - user already logged out on server');
            return error;
          }
        }
        
        console.group(`❌ API Error`);
        console.error(error);
        console.groupEnd();
        return error;
      }
    } as ResponseInterceptor
  } : null;

  // 인터셉터 반환
  return {
    request: [
      mockInterceptor,
      authInterceptor,
      ...(loggingInterceptor ? [loggingInterceptor.request] : [])
    ],
    response: [
      dataTransformInterceptor,
      tokenRefreshInterceptor,
      ...(showNotification ? [errorNotificationInterceptor] : []),
      ...(loggingInterceptor ? [loggingInterceptor.response] : [])
    ]
  };
};

/**
 * 간단한 인터셉터 관리 클래스
 */
export class SimpleInterceptorManager {
  private static requestInterceptors: RequestInterceptor[] = [];
  private static responseInterceptors: ResponseInterceptor[] = [];
  private static initialized = false;

  static initialize(options?: {
    showNotification?: (message: string, type: 'error' | 'warning' | 'info') => void;
    environment?: 'development' | 'production' | 'test';
  }): void {
    if (this.initialized) return;

    const interceptors = createInterceptors(options);
    this.requestInterceptors = interceptors.request;
    this.responseInterceptors = interceptors.response;
    this.initialized = true;

  }

  static getInterceptors(): {
    request: RequestInterceptor[];
    response: ResponseInterceptor[];
  } {
    return {
      request: [...this.requestInterceptors],
      response: [...this.responseInterceptors]
    };
  }

  static reset(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.initialized = false;
  }
}