import { getConfig } from '../../config/environment';
import { SimpleInterceptorManager } from '../core/Interceptors';
import { TokenManager } from '../core/TokenManager';
import { MockInterceptor } from '../mocks/MockInterceptor';
import { log } from '../../utils/Logger';
import { ErrorHandler, ErrorLevel } from '../../utils/ErrorHandler';
import { 
  ApiErrorResponse, 
  RequestInterceptor, 
  ResponseInterceptor, 
  CacheConfig, 
  CacheEntry
} from '../../types/types';

export class ApiError extends Error {
  constructor(
    public status: number, 
    public statusText: string, 
    public data?: any
  ) {
    super(`${status}: ${statusText}`);
    this.name = 'ApiError';
  }

  static fromResponse(response: Response, data: ApiErrorResponse): ApiError {
    // 백엔드에서 제공하는 메시지 사용 (msg 필드 우선)
    let message = response.statusText;
    if (data && typeof data === 'object') {
      if ('msg' in data && typeof data.msg === 'string' && data.msg) {
        message = data.msg;
      } else if ('message' in data && typeof data.message === 'string' && data.message) {
        message = data.message;
      }
    }
    
    const error = new ApiError(response.status, message, data);
    return error;
  }
}

export abstract class BaseApiService {
  protected baseUrl: string;
  protected config = getConfig();
  protected serviceName: string;
  protected errorHandler = ErrorHandler.getInstance();
  
  // 통합 인터셉터 시스템에서 관리되는 인터셉터들 (캐시됨)
  private static interceptorCache = new Map<string, { request: RequestInterceptor[], response: ResponseInterceptor[] }>();
  private activeRequestInterceptors: RequestInterceptor[] = [];
  private activeResponseInterceptors: ResponseInterceptor[] = [];
  
  // 캐시 스토리지
  private cache = new Map<string, CacheEntry<any>>();
  private cacheCleanupInterval: number | null = null;
  private isDisposed = false; // 서비스 정리 상태 추적
  
  // 재시도 설정
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private readonly maxTokenRefreshRetries = 1; // 토큰 새로고침 재시도 횟수
  
  // 정적 인스턴스 추적 (전역 정리를 위함)
  private static instances = new Set<BaseApiService>();

  constructor(baseUrl?: string, serviceName?: string) {
    this.baseUrl = baseUrl || this.config.apiUrl;
    this.serviceName = serviceName || this.constructor.name;
    
    // Only log service initialization in development mode
    if (this.config.enableLogging) {
      console.info(`[${this.serviceName}] Service initialized:`, {
        useMockData: this.config.useMockData,
        apiUrl: this.config.apiUrl,
        enableLogging: this.config.enableLogging
      });
    }
    
    // 통합 인터셉터 시스템에서 인터셉터 가져오기
    this.loadInterceptorsFromManager();
    
    // 캐시 자동 정리 시작
    this.startCacheCleanup();
    
    // 전역 인스턴스 추적에 추가
    BaseApiService.instances.add(this);
    
    // 페이지 언로드 시 정리 리스너 등록 (한 번만)
    if (BaseApiService.instances.size === 1) {
      this.setupGlobalCleanup();
    }
  }

  /**
   * 단순화된 인터셉터 로드 (캐싱 적용)
   */
  private loadInterceptorsFromManager(): void {
    try {
      // 캐시에서 먼저 확인
      const cached = BaseApiService.interceptorCache.get(this.serviceName);
      if (cached) {
        this.activeRequestInterceptors = cached.request;
        this.activeResponseInterceptors = cached.response;
        return;
      }

      // 단순화된 인터셉터 매니저에서 가져오기
      const interceptors = SimpleInterceptorManager.getInterceptors();
      this.activeRequestInterceptors = interceptors.request;
      this.activeResponseInterceptors = interceptors.response;
      
      // 캐시에 저장
      BaseApiService.interceptorCache.set(this.serviceName, {
        request: [...interceptors.request],
        response: [...interceptors.response]
      });
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        'BaseApiService.loadInterceptors',
        ErrorLevel.WARNING,
        {
          component: this.serviceName,
          action: 'loadInterceptors'
        }
      );
      this.activeRequestInterceptors = [];
      this.activeResponseInterceptors = [];
    }
  }

  // Mock 데이터 사용 여부 확인 (환경 설정 위임)
  public shouldUseMockData(): boolean {
    return this.config.useMockData;
  }

  // HTTP 요청 메서드 (Mock 처리는 MockInterceptor에서 담당)
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheConfig?: CacheConfig,
    tokenRefreshAttempts: number = 0
  ): Promise<T> {
    // 정리된 서비스에서 요청 방지
    if (this.isDisposed) {
      throw new Error(`Cannot make request from disposed service: ${this.serviceName}`);
    }

    // Mock 데이터 사용 시 MockInterceptor로 처리
    if (this.config.useMockData) {
      if (this.config.enableLogging) {
        console.info(`[${this.serviceName}] Using mock data for endpoint: ${endpoint}`);
      }
      
      try {
        const mockInterceptor = MockInterceptor.getInstance();
        const mockResponse = await mockInterceptor.getMockResponse(this.serviceName, endpoint, options);
        return mockResponse as T;
      } catch (error) {
        this.errorHandler.handleError(
          error as Error,
          'BaseApiService.mockLoading',
          ErrorLevel.ERROR,
          {
            component: this.serviceName,
            action: 'mockLoading',
            additionalData: { endpoint }
          }
        );
        // Mock 로딩 실패 시 기본 Mock 응답
        return {
          success: false,
          error: 'Mock loading failed',
          message: `Failed to load mock data for ${this.serviceName}`
        } as T;
      }
    }

    // Real API 요청 처리
    if (this.config.enableLogging) {
      console.info(`[${this.serviceName}] Using real API for endpoint: ${endpoint}`);
    }

    // 캐시 확인 (GET 요청만)
    const method = options.method || 'GET';
    if (method === 'GET' && cacheConfig?.enabled) {
      const cacheKey = this.getCacheKey(endpoint, options);
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.retry(async () => {
      const url = `${this.baseUrl}${endpoint}`;
      const requestMethod = options.method || 'GET';
      
      // API 요청 로깅
      log.api.request(requestMethod, url, options.body);
      
      // 기본 헤더 설정
      let defaultHeaders: Record<string, string> = {};
      
      // FormData가 아닌 경우이고 body가 있을 때만 Content-Type 설정
      const isFormData = options.body instanceof FormData;
      const hasBody = options.body !== undefined && options.body !== null;
      if (!isFormData && hasBody) {
        defaultHeaders['Content-Type'] = 'application/json';
      }

      // ✅ Authorization 헤더는 이제 Interceptor에서 처리됨
      // (TokenManager를 통해 중앙 집중식으로 관리)

      // 요청 옵션 구성
      let requestOptions: RequestInit = {
        ...options,
        credentials: 'include', // 쿠키 포함
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      };

      // 요청 인터셉터 적용 (인증 헤더 포함)
      requestOptions = await this.executeRequestInterceptors(requestOptions, endpoint);

      try {
        const response = await fetch(url, requestOptions);
        
        // API 응답 로깅
        log.api.response(requestMethod, url, response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as ApiErrorResponse;
          const apiError = ApiError.fromResponse(response, errorData);
          
          // 401 Unauthorized - 토큰 새로고침 시도
          if (response.status === 401 && tokenRefreshAttempts < this.maxTokenRefreshRetries) {
            const refreshed = await this.attemptTokenRefresh(endpoint);
            if (refreshed) {
              // 토큰 새로고침 성공 시 원래 요청 재시도
              console.info('[BaseApiService] Token refreshed, retrying original request');
              return this.request<T>(endpoint, options, cacheConfig, tokenRefreshAttempts + 1);
            } else {
              this.handleUnauthorized();
            }
          } else if (response.status === 401) {
            // 토큰 새로고침 재시도 횟수 초과
            this.handleUnauthorized();
          }
          
          throw apiError;
        }

        let responseData = await response.json();
        
        // 응답 인터셉터 적용 (최적화된 파이프라인)
        responseData = await this.executeResponseInterceptors(response, responseData);

        // 캐시에 저장 (GET 요청만)
        if (method === 'GET' && cacheConfig?.enabled) {
          const cacheKey = this.getCacheKey(endpoint, options);
          this.setCache(cacheKey, responseData, cacheConfig.ttl || 300000); // 기본 5분
        }

        return responseData;
      } catch (error) {
        // Interceptor에서 토큰 새로고침이 필요하다고 표시한 경우
        if ((error as any)?.isTokenRefreshRequired && tokenRefreshAttempts < this.maxTokenRefreshRetries) {
          console.log('[BaseApiService] Interceptor detected 401, attempting token refresh...');
          const refreshed = await this.attemptTokenRefresh(endpoint);
          if (refreshed) {
            console.info('[BaseApiService] Token refreshed by interceptor signal, retrying original request');
            return this.request<T>(endpoint, options, cacheConfig, tokenRefreshAttempts + 1);
          } else {
            this.handleUnauthorized();
          }
        }
        
        // 응답 에러 인터셉터 적용 (최적화된 파이프라인)
        await this.executeResponseErrorInterceptors(error as Error);
        
        throw error;
      }
    });
  }

  // 토큰 새로고침 시도 (TokenManager에 위임, 중복 로직 제거)
  private async attemptTokenRefresh(endpoint: string): Promise<boolean> {
    // 로그인/회원가입/2FA 관련 요청에서는 토큰 새로고침 시도하지 않음
    const isAuthRequest = endpoint.includes('/login') || 
                         endpoint.includes('/register') || 
                         endpoint.includes('/refresh-token') || 
                         endpoint.includes('/auth/2fa') ||
                         endpoint.includes('/2fa/init') ||
                         endpoint.includes('/2fa/enable') ||
                         endpoint.includes('/2fa/disable');
    if (isAuthRequest) {
      return false;
    }

    try {
      const newToken = await TokenManager.refreshToken();
      if (newToken) {
        // TokenManager가 이미 새 토큰을 저장했으므로 추가 작업 불필요
        console.info('🔄 Token refreshed successfully in BaseApiService');
        return true;
      } else {
        console.warn('Token refresh failed');
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  // 인증 실패 처리
  private handleUnauthorized(): void {
    TokenManager.clearTokens();
    this.errorHandler.handleError(
      new Error('Authentication failed'),
      'BaseApiService.handleUnauthorized',
      ErrorLevel.WARNING,
      {
        component: this.serviceName,
        action: 'tokenCleared'
      }
    );
  }

  // GET 요청 (캐시 지원)
  protected async get<T>(
    endpoint: string, 
    cacheConfig?: CacheConfig
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, cacheConfig);
  }

  // POST 요청 - 개선된 매개변수 처리
  protected async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit | { isFormData?: boolean }
  ): Promise<T> {
    const requestOptions: RequestInit = {
      method: 'POST',
      ...options,
    };

    if (data !== undefined && data !== null) {
      const isFormData = options && 'isFormData' in options && options.isFormData;
      if (isFormData) {
        requestOptions.body = data;
        // FormData의 경우 Content-Type 헤더를 설정하지 않음
        const { 'Content-Type': _, ...restHeaders } = requestOptions.headers as Record<string, string> || {};
        requestOptions.headers = restHeaders;
      } else {
        requestOptions.body = JSON.stringify(data);
      }
    } else {
      // data가 없는 경우 빈 JSON 객체로 설정 (백엔드 호환성)
      requestOptions.body = JSON.stringify({});
    }

    return this.request<T>(endpoint, requestOptions);
  }

  // PUT 요청 - 통합된 데이터 처리
  protected async put<T>(
    endpoint: string,
    data?: any,
    isFormData = false
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
      headers: isFormData ? {} : undefined
    });
  }

  // PATCH 요청 - 통합된 데이터 처리
  protected async patch<T>(
    endpoint: string,
    data?: any,
    isFormData = false
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
      headers: isFormData ? {} : undefined
    });
  }

  // DELETE 요청
  protected async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // 캐시 관리
  private getCacheKey(endpoint: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${endpoint}:${body}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  public clearCache(): void {
    this.cache.clear();
  }

  // 최적화된 인터셉터 실행 메서드들
  private async executeRequestInterceptors(
    requestOptions: RequestInit, 
    endpoint: string
  ): Promise<RequestInit> {
    let options = requestOptions;
    
    for (const interceptor of this.activeRequestInterceptors) {
      if (interceptor.onRequest) {
        try {
          options = await interceptor.onRequest(options, endpoint);
        } catch (error) {
          if (interceptor.onRequestError) {
            throw await interceptor.onRequestError(error as Error);
          }
          throw error;
        }
      }
    }
    
    return options;
  }

  private async executeResponseInterceptors(
    response: Response, 
    data: any
  ): Promise<any> {
    let processedData = data;
    
    for (const interceptor of this.activeResponseInterceptors) {
      if (interceptor.onResponse) {
        try {
          processedData = await interceptor.onResponse(response, processedData);
        } catch (error) {
          if (interceptor.onResponseError) {
            throw await interceptor.onResponseError(error as Error);
          }
          throw error;
        }
      }
    }
    
    return processedData;
  }

  private async executeResponseErrorInterceptors(error: Error): Promise<void> {
    for (const interceptor of this.activeResponseInterceptors) {
      if (interceptor.onResponseError) {
        try {
          throw await interceptor.onResponseError(error);
        } catch (interceptedError) {
          throw interceptedError;
        }
      }
    }
    
    throw error;
  }

  // 인터셉터 캐시 초기화 (정적 메서드)
  public static clearInterceptorCache(): void {
    BaseApiService.interceptorCache.clear();
    console.info('🗑️ Interceptor cache cleared');
  }

  // 재시도 로직 (네트워크 에러 포함)
  private async retry<T>(
    fn: () => Promise<T>, 
    attempts: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempts <= 1) throw error;
      
      // 5xx 서버 에러 또는 네트워크 에러(TypeError, fetch 실패)일 경우 재시도
      const shouldRetry = 
        (error instanceof ApiError && error.status >= 500) || 
        error instanceof TypeError ||
        (error instanceof Error && error.message.includes('fetch'));
      
      if (shouldRetry) {
        const delay = this.retryDelay * (this.maxRetries - attempts + 1); // 지수 백오프
        this.errorHandler.handleError(
          error as Error,
          'BaseApiService.retry',
          ErrorLevel.WARNING,
          {
            component: this.serviceName,
            action: 'retryAttempt',
            additionalData: { attemptsRemaining: attempts - 1, delay }
          }
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retry(fn, attempts - 1);
      }
      
      // 4xx 클라이언트 에러는 정상적인 응답이므로 에러 로깅하지 않고 바로 던지기
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // 5xx 서버 에러나 네트워크 에러의 최종 실패만 로깅
      this.errorHandler.handleError(
        error as Error,
        'BaseApiService.retryFailed',
        ErrorLevel.ERROR,
        {
          component: this.serviceName,
          action: 'retryExhausted'
        }
      );
      throw error;
    }
  }

  // 캐시 자동 정리 시작
  private startCacheCleanup(): void {
    // 정리되었거나 이미 간격이 설정된 경우 중복 방지
    if (this.isDisposed || this.cacheCleanupInterval !== null) {
      return;
    }
    
    // 5분마다 만료된 캐시 정리
    this.cacheCleanupInterval = window.setInterval(() => {
      if (!this.isDisposed) {
        this.cleanExpiredCache();
      }
    }, 5 * 60 * 1000);
  }

  // 만료된 캐시 정리
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0 && this.config.enableLogging) {
      console.info(`[${this.serviceName}] Cache cleanup: ${cleanedCount} expired entries removed`);
    }
  }

  // 캐시 정리 중단
  private stopCacheCleanup(): void {
    if (this.cacheCleanupInterval !== null) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
  }

  // 전역 정리 설정 (페이지 언로드 시 모든 인스턴스 정리)
  private setupGlobalCleanup(): void {
    const cleanupHandler = () => {
      BaseApiService.disposeAll();
    };
    
    // 페이지 언로드 이벤트에 정리 핸들러 등록
    window.addEventListener('beforeunload', cleanupHandler);
    window.addEventListener('unload', cleanupHandler);
    
    // 개발 환경에서 HMR 지원 (타입 안전성 확보)
    if (typeof window !== 'undefined' && 'hot' in (import.meta as any)) {
      (import.meta as any).hot.dispose(cleanupHandler);
    }
  }
  
  // 서비스 정리 (메모리 리크 방지)
  public dispose(): void {
    if (this.isDisposed) {
      return; // 이미 정리됨
    }
    
    this.isDisposed = true;
    this.stopCacheCleanup();
    this.clearCache();
    
    // 전역 인스턴스 추적에서 제거
    BaseApiService.instances.delete(this);
    
    if (this.config.enableLogging) {
      console.info(`[${this.serviceName}] Service disposed`);
    }
  }
  
  // 모든 인스턴스 정리 (정적 메서드)
  public static disposeAll(): void {
    const instanceCount = BaseApiService.instances.size;
    console.info(`🗑️ Disposing ${instanceCount} BaseApiService instances`);
    
    for (const instance of BaseApiService.instances) {
      instance.dispose();
    }
    
    BaseApiService.instances.clear();
    BaseApiService.interceptorCache.clear();
  }
}
