import { getConfig } from '../config/environment';

export class ApiError extends Error {
  constructor(
    public status: number, 
    public statusText: string, 
    public data?: any
  ) {
    super(`${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export abstract class BaseApiService {
  protected baseUrl: string;
  protected token: string | null = null;
  protected config = getConfig();

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || this.config.apiUrl;
    // localStorage에서 토큰 복원
    this.token = localStorage.getItem('auth_token');
  }

  // 토큰 설정
  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // 토큰 가져오기
  public getToken(): string | null {
    return this.token;
  }

  // 인증된 사용자인지 확인
  public hasAuthToken(): boolean {
    return !!this.token;
  }

  // 토큰 제거
  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Mock 데이터 사용 여부 확인
  public shouldUseMockData(): boolean {
    return this.config.useMockData;
  }

  // HTTP 요청 메서드 (환경설정 기반)
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Mock 데이터 사용 시 실제 요청 대신 모킹된 응답 반환
    if (this.config.useMockData) {
      return this.getMockResponse<T>(endpoint, options);
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    // 기본 헤더 설정
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 인증 토큰이 있으면 추가
    if (this.token) {
      defaultHeaders.Authorization = `Bearer ${this.token}`;
    }

    // 요청 옵션 구성
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      // 로깅 (개발 환경에서만)
      if (this.config.enableLogging) {
        console.log(`API Request: ${requestOptions.method || 'GET'} ${url}`, {
          headers: requestOptions.headers,
          body: requestOptions.body,
        });
      }

      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const apiError = new ApiError(response.status, response.statusText, errorData);
        
        // 401 Unauthorized - 토큰 만료 또는 인증 실패
        if (response.status === 401) {
          this.handleUnauthorized();
        }
        
        throw apiError;
      }

      const responseData = await response.json();
      
      if (this.config.enableLogging) {
        console.log(`API Response: ${response.status}`, responseData);
      }

      return responseData;
    } catch (error) {
      console.error(`API Error: ${url}`, error);
      throw error;
    }
  }

  // Mock 응답 생성 (하위 클래스에서 구현)
  protected abstract getMockResponse<T>(endpoint: string, options: RequestInit): Promise<T>;

  // 인증 실패 처리
  private handleUnauthorized(): void {
    this.clearToken();
    console.warn('Authentication failed. Token cleared.');
  }

  // GET 요청
  protected async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST 요청
  protected async post<T>(
    endpoint: string,
    data?: any,
    isFormData = false
  ): Promise<T> {
    const options: RequestInit = {
      method: 'POST',
    };

    if (data) {
      if (isFormData) {
        // FormData의 경우 Content-Type 헤더를 설정하지 않음 (브라우저가 자동 설정)
        options.body = data;
        options.headers = {};
      } else {
        options.body = JSON.stringify(data);
      }
    }

    return this.request<T>(endpoint, options);
  }

  // PUT 요청
  protected async put<T>(
    endpoint: string,
    data?: any,
    isFormData = false
  ): Promise<T> {
    const options: RequestInit = {
      method: 'PUT',
    };

    if (data) {
      if (isFormData) {
        options.body = data;
        options.headers = {};
      } else {
        options.body = JSON.stringify(data);
      }
    }

    return this.request<T>(endpoint, options);
  }

  // DELETE 요청
  protected async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
