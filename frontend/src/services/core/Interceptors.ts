/**
 * 단순화된 인터셉터 시스템
 * 모든 인터셉터 로직을 하나의 파일에 통합
 */

import { RequestInterceptor, ResponseInterceptor } from '../../types/types';
import { 
  transformUser, 
  transformFriend, 
  transformGame
} from './DataTransformers';
import { ApiError } from '../api/BaseApiService';
import { TokenManager } from './TokenManager';
import { ErrorHandler, ErrorLevel } from '../../utils/ErrorHandler';

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

  // 🔐 인증 인터셉터
  const authInterceptor: RequestInterceptor = {
    onRequest: async (config, endpoint) => {
      const publicEndpoints = ['/auth/login', '/auth/register', '/health'];
      const isPublicEndpoint = publicEndpoints.some(ep => endpoint.includes(ep));
      
      if (!isPublicEndpoint) {
        const token = TokenManager.getAccessToken();
        if (!token && !endpoint.includes('/auth/refresh')) {
          throw new Error('Authentication required - no access token');
        }
      }
      
      return config;
    }
  };

  // 🔄 데이터 변환 인터셉터
  const dataTransformInterceptor: ResponseInterceptor = {
    onResponse: async (response, data) => {
      const url = response.url;
      
      // 간단한 패턴 매칭으로 변환 로직 결정
      try {
        if (URL_PATTERNS.AUTH.test(url) && data.user) {
          data.user = transformUser(data.user);
          return data;
        }
        
        if (URL_PATTERNS.USER_PROFILE.test(url) || URL_PATTERNS.USER_SINGLE.test(url)) {
          return transformUser(data);
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
            additionalData: { url }
          }
        );
      }
      
      return data;
    }
  };

  // 🔄 토큰 갱신 인터셉터
  const tokenRefreshInterceptor: ResponseInterceptor = {
    onResponseError: async (error) => {
      if (error instanceof ApiError && error.status === 401) {
        try {
          const response = await fetch('/auth/refresh', {
            method: 'POST',
            credentials: 'include'
          });
          
          if (response.ok) {
            const { accessToken } = await response.json();
            TokenManager.updateAccessToken(accessToken);
            console.info('🔄 Token refreshed successfully');
          } else {
            TokenManager.clearTokens();
            ErrorHandler.getInstance().handleError(
              new Error('Token refresh failed - clearing tokens'),
              'Interceptors.tokenRefreshInterceptor',
              ErrorLevel.WARNING,
              {
                component: 'Interceptors',
                action: 'tokenRefreshFailed'
              }
            );
          }
        } catch (refreshError) {
          TokenManager.clearTokens();
          ErrorHandler.getInstance().handleError(
            refreshError as Error,
            'Interceptors.tokenRefreshInterceptor',
            ErrorLevel.ERROR,
            {
              component: 'Interceptors',
              action: 'tokenRefreshError'
            }
          );
        }
      }
      
      return error;
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
        console.log('Headers:', config.headers);
        console.log('Body:', config.body);
        console.groupEnd();
        return config;
      }
    } as RequestInterceptor,
    response: {
      onResponse: async (response: Response, data: any) => {
        console.group(`✅ API Response: ${response.status} ${response.url}`);
        console.log('Data:', data);
        console.groupEnd();
        return data;
      },
      onResponseError: async (error: Error) => {
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

    console.log('✅ Simple interceptors initialized');
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