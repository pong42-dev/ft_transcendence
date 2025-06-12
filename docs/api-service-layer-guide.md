# API 서비스 레이어 설명서

## 📋 API 서비스 레이어란?

API 서비스 레이어는 **Frontend와 Backend 사이의 통신을 담당하는 중간 계층**입니다. 
이 계층을 통해 UI 컴포넌트는 복잡한 HTTP 요청 로직을 알 필요 없이 간단한 메서드 호출만으로 데이터를 주고받을 수 있습니다.

---

## 🎯 주요 목적

### 1. **관심사의 분리 (Separation of Concerns)**
- UI 로직과 API 통신 로직을 분리
- 컴포넌트는 화면 렌더링에만 집중
- API 서비스는 데이터 통신에만 집중

### 2. **재사용성 (Reusability)**
- 여러 컴포넌트에서 동일한 API 호출 로직 공유
- 중복 코드 제거

### 3. **유지보수성 (Maintainability)**
- API 엔드포인트 변경 시 한 곳에서만 수정
- 에러 처리 로직 중앙화

### 4. **타입 안전성 (Type Safety)**
- TypeScript를 활용한 API 응답 타입 정의
- 컴파일 타임 에러 방지

---

## 🏗️ 현재 프로젝트에서의 구조

### Before (현재 상태)
```typescript
// App.ts에서 직접 AuthService 호출
const user = this.authService.login(email, password); // Mock 데이터 반환
```

### After (API 서비스 레이어 적용)
```typescript
// App.ts에서 ApiService를 통해 실제 Backend 호출
const response = await this.apiService.login(email, password);
if (response.success) {
  const user = response.data;
}
```

---

## 🔧 API 서비스 레이어 구현 예시

### 1. **기본 ApiService 클래스**
```typescript
// src/services/ApiService.ts
export class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // HTTP 요청의 공통 로직
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // 구체적인 API 메서드들
  async login(email: string, password: string): Promise<ApiResponse<AuthResult>> {
    return this.request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getUserStats(userId: string): Promise<ApiResponse<UserStats>> {
    return this.request<UserStats>(`/users/${userId}/stats`);
  }
}
```

### 2. **타입 정의**
```typescript
// src/types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthResult {
  user: User;
  token: string;
  refreshToken: string;
}

export interface UserStats {
  wins: number;
  losses: number;
  winRate: number;
  totalGames: number;
}
```

### 3. **컴포넌트에서 사용**
```typescript
// App.ts
export class App {
  private apiService: ApiService;

  constructor() {
    this.apiService = new ApiService('http://localhost:3000/api');
  }

  private async handleLogin(email: string, password: string) {
    // 로딩 상태 표시
    this.terminal.appendOutput('Authenticating...');

    // API 호출
    const response = await this.apiService.login(email, password);

    if (response.success && response.data) {
      // 성공 처리
      this.state.isLoggedIn = true;
      this.state.currentUser = response.data.user;
      this.apiService.setToken(response.data.token);
      this.terminal.appendOutput(`Welcome back, ${email}!`);
    } else {
      // 에러 처리
      this.terminal.appendOutput(`Login failed: ${response.error}`);
    }
  }
}
```

---

## 📊 현재 프로젝트에서 적용 가능한 구조

### 1. **AuthService → AuthApiService**
```typescript
// Before: 메모리 기반 Mock
class AuthService {
  login(email: string, password: string): User {
    // 하드코딩된 사용자 검증
  }
}

// After: 실제 API 호출
class AuthApiService {
  async login(email: string, password: string): Promise<ApiResponse<AuthResult>> {
    return this.request('/auth/login', { method: 'POST', body: ... });
  }
}
```

### 2. **UserProfile → UserApiService**
```typescript
// Before: 랜덤 생성 데이터
class UserProfile {
  render(): HTMLElement {
    const mockStats = {
      wins: Math.floor(Math.random() * 50),
      losses: Math.floor(Math.random() * 30),
    };
  }
}

// After: 실제 API에서 데이터 가져오기
class UserProfile {
  async render(): Promise<HTMLElement> {
    const statsResponse = await this.userApiService.getUserStats(this.user.id);
    const stats = statsResponse.success ? statsResponse.data : defaultStats;
  }
}
```

---

## 🛡️ 에러 처리 및 로딩 상태 관리

### 1. **중앙화된 에러 처리**
```typescript
class ApiService {
  private handleError(error: any): ApiResponse<never> {
    // 로깅
    console.error('API Error:', error);
    
    // 특정 에러에 대한 처리
    if (error.status === 401) {
      // 토큰 만료 시 자동 리프레시 시도
      this.refreshToken();
    }
    
    return { success: false, error: error.message };
  }
}
```

### 2. **로딩 상태 관리**
```typescript
class ApiService {
  private isLoading = false;
  private loadingCallbacks: (() => void)[] = [];

  private async request<T>(...): Promise<ApiResponse<T>> {
    this.setLoading(true);
    try {
      // API 호출
    } finally {
      this.setLoading(false);
    }
  }

  onLoadingChange(callback: (loading: boolean) => void) {
    this.loadingCallbacks.push(callback);
  }
}
```

---

## 🔄 기존 코드와의 통합 방법

### 1. **점진적 마이그레이션**
```typescript
// 1단계: API 서비스 생성 및 기존 코드와 병행
class App {
  private authService: AuthService;        // 기존 Mock
  private apiService: ApiService;          // 새로운 API 서비스

  async handleLogin(email: string, password: string) {
    // 개발 환경에서는 Mock, 프로덕션에서는 API 사용
    if (process.env.NODE_ENV === 'development') {
      return this.authService.login(email, password);
    } else {
      return await this.apiService.login(email, password);
    }
  }
}

// 2단계: 완전히 API 서비스로 교체
class App {
  private apiService: ApiService;          // API 서비스만 사용

  async handleLogin(email: string, password: string) {
    return await this.apiService.login(email, password);
  }
}
```

### 2. **환경별 설정**
```typescript
// src/config/environment.ts
export const config = {
  development: {
    apiUrl: 'http://localhost:3000/api',
    useMockData: true,
  },
  production: {
    apiUrl: 'https://your-backend.com/api',
    useMockData: false,
  }
};
```

---

## 🚀 도입 시 이점

### 1. **코드 품질 향상**
- 일관된 API 호출 패턴
- 중복 코드 제거
- 타입 안전성 확보

### 2. **개발 효율성 증대**
- API 변경 시 한 곳에서만 수정
- 에러 처리 로직 재사용
- 테스트 코드 작성 용이

### 3. **확장성**
- 새로운 API 엔드포인트 쉽게 추가
- 캐싱, 재시도 로직 등 고급 기능 추가 가능
- WebSocket 등 다른 통신 방식과 통합 가능

---

## 📝 다음 단계

1. **기본 ApiService 클래스 생성**
2. **AuthService를 ApiService로 마이그레이션**
3. **UserProfile에 API 연동**
4. **게임 관련 API 추가**
5. **실시간 기능을 위한 WebSocket 서비스 추가**

이런 식으로 단계적으로 API 서비스 레이어를 도입하면 안정적이고 확장 가능한 구조를 만들 수 있습니다.
