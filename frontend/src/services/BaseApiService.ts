import { ApiResponse } from '../types/api';
import { getConfig } from '../config/environment';

export class BaseApiService {
  protected baseUrl: string;
  protected token: string | null = null;
  private config = getConfig();

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || this.config.apiUrl;
    // localStorage에서 토큰 복원
    this.token = localStorage.getItem('authToken');
  }

  // 토큰 설정
  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // 토큰 가져오기
  public getToken(): string | null {
    return this.token;
  }

  // 인증된 사용자인지 확인
  public isAuthenticated(): boolean {
    return !!this.token;
  }

  // HTTP 요청 메서드
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
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
      
      // 응답 처리
      const responseData = await this.handleResponse<T>(response);
      
      if (this.config.enableLogging) {
        console.log(`API Response: ${response.status}`, responseData);
      }

      return responseData;
    } catch (error) {
      console.error(`API Error: ${url}`, error);
      return this.handleError(error);
    }
  }

  // 응답 처리
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      // 응답이 성공적이지 않은 경우
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // 401 Unauthorized - 토큰 만료 또는 인증 실패
        if (response.status === 401) {
          this.handleUnauthorized();
          return {
            success: false,
            error: errorData.message || 'Authentication failed',
          };
        }

        // 기타 HTTP 에러
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // 성공적인 응답 처리
      const data = await response.json();
      return {
        success: true,
        data: data.data || data, // Backend 응답 구조에 따라 조정
        message: data.message,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 에러 처리
  private handleError(error: any): ApiResponse<never> {
    let errorMessage = 'An unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }

  // 인증 실패 처리
  private handleUnauthorized(): void {
    // 토큰 제거
    this.setToken(null);
    
    // 사용자를 로그인 페이지로 리디렉션하거나 로그아웃 처리
    // 이 부분은 애플리케이션의 상태 관리에 따라 구현
    console.warn('Authentication failed. Token cleared.');
  }

  // GET 요청
  protected async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST 요청
  protected async post<T>(
    endpoint: string,
    data?: any,
    isFormData = false
  ): Promise<ApiResponse<T>> {
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
  ): Promise<ApiResponse<T>> {
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
  protected async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
