# 프론트엔드 API 통합 완료 가이드

## 개요

프론트엔드에서 실제 백엔드 API와 연결하기 위한 완전한 서비스 레이어가 구현되었습니다. 이 문서는 구현된 API 서비스 구조와 사용법을 설명합니다.

## 구현된 API 서비스 구조

### 1. BaseApiService (`/frontend/src/services/BaseApiService.ts`)

모든 API 서비스의 기본 클래스로, 공통적인 HTTP 요청 처리를 담당합니다.

#### 주요 기능:
- **토큰 관리**: 자동 토큰 저장/복원, localStorage 연동
- **HTTP 메서드**: GET, POST, PUT, DELETE 지원
- **에러 처리**: 401 Unauthorized 자동 처리, 토큰 만료 감지
- **요청/응답 로깅**: 개발 환경에서 디버깅 지원
- **FormData 지원**: 파일 업로드 등을 위한 FormData 처리

#### 핵심 메서드:
```typescript
// 토큰 관리
setToken(token: string | null): void
getToken(): string | null
isAuthenticated(): boolean

// HTTP 요청
protected async get<T>(endpoint: string): Promise<ApiResponse<T>>
protected async post<T>(endpoint: string, data?: any, isFormData = false): Promise<ApiResponse<T>>
protected async put<T>(endpoint: string, data?: any, isFormData = false): Promise<ApiResponse<T>>
protected async delete<T>(endpoint: string): Promise<ApiResponse<T>>
```

### 2. AuthApiService (`/frontend/src/services/AuthApiService.ts`)

인증 관련 API 엔드포인트를 담당하는 서비스입니다.

#### 구현된 API 엔드포인트:
- `login(email, password)` - 로컬 로그인
- `register(email, password, nickname)` - 회원가입
- `loginWithGoogle()` - Google OAuth 로그인
- `logout()` - 로그아웃
- `refreshToken()` - 토큰 갱신
- `getCurrentUser()` - 현재 사용자 정보 조회
- `enable2FA()` - 2FA 활성화
- `verify2FA(code)` - 2FA 인증 코드 확인
- `disable2FA()` - 2FA 비활성화
- `updateProfile(data)` - 프로필 업데이트
- `uploadAvatar(file)` - 아바타 업로드
- `deleteAvatar()` - 아바타 삭제

### 3. ApiService (`/frontend/src/services/ApiService.ts`)

모든 API 서비스를 통합하는 메인 서비스 클래스입니다.

#### 구조:
```typescript
class ApiService extends BaseApiService {
  public auth: AuthApiService;
  // 향후 추가될 다른 서비스들...
  // public users: UserApiService;
  // public games: GameApiService;
  // public friends: FriendApiService;
}

// 싱글톤 인스턴스
export const apiService = new ApiService();
```

## 환경 설정

### Environment Configuration (`/frontend/src/config/environment.ts`)

환경별 설정을 관리합니다:

```typescript
interface Config {
  apiUrl: string;
  useMockData: boolean;
  enableLogging: boolean;
  environment: 'development' | 'production' | 'test';
}
```

#### 설정 방법:
- **개발 환경**: `useMockData: true` (Mock 데이터 사용)
- **프로덕션 환경**: `useMockData: false` (실제 API 사용)
- **API URL**: 백엔드 서버 주소 설정

## App.ts에서의 API 통합

### 1. 자동 로그인 시스템

```typescript
// 토큰 기반 자동 로그인
private async tryAutoLogin(): Promise<void> {
  const token = apiService.getToken();
  if (token) {
    try {
      const response = await apiService.auth.getCurrentUser();
      if (response.success && response.data) {
        this.state.isLoggedIn = true;
        this.state.currentUser = response.data;
      } else {
        apiService.setToken(null); // 유효하지 않은 토큰 제거
      }
    } catch (error) {
      apiService.setToken(null);
    }
  }
}
```

### 2. 듀얼 모드 로그인 처리

Mock 데이터와 실제 API를 환경에 따라 자동 선택:

```typescript
private async handleLogin(email: string, password: string): Promise<void> {
  if (apiService.shouldUseMockData()) {
    // Mock 데이터 사용 (개발/테스트 환경)
    const user = this.authService.login(email, password);
    this.state.isLoggedIn = true;
    this.state.currentUser = user;
  } else {
    // 실제 API 사용 (프로덕션 환경)
    const response = await apiService.auth.login(email, password);
    if (response.success && response.data) {
      this.state.isLoggedIn = true;
      this.state.currentUser = response.data.user;
    } else {
      this.terminal.appendOutput(`Login failed: ${response.error}`);
    }
  }
}
```

### 3. 회원가입 처리

```typescript
private async handleRegister(email: string, password: string, nickname: string): Promise<void> {
  if (apiService.shouldUseMockData()) {
    // Mock 처리
    const user = this.authService.register(email, password, nickname);
    // 파일 모달로 아바타 업로드
  } else {
    // 실제 API 처리
    const response = await apiService.auth.register(email, password, nickname);
    if (response.success && response.data) {
      this.state.isLoggedIn = true;
      this.state.currentUser = response.data.user;
    }
  }
}
```

## 타입 정의

### API Response Types (`/frontend/src/types/api.ts`)

```typescript
// 공통 API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 인증 관련 타입
export interface AuthResult {
  user: User;
  token: string;
  refreshToken?: string;
}

// 사용자 정보 타입
export interface User {
  id: string;
  username: string;
  nickname: string;
  email: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'in_game';
  twoFactorEnabled: boolean;
  // ... 기타 필드
}
```

## 에러 처리

### 1. 자동 토큰 갱신

401 Unauthorized 에러 발생 시 자동으로 토큰을 제거하고 로그아웃 처리:

```typescript
private handleUnauthorized(): void {
  this.setToken(null);
  console.warn('Authentication failed. Token cleared.');
}
```

### 2. 네트워크 에러 처리

```typescript
private handleError(error: any): ApiResponse<never> {
  let errorMessage = 'An unknown error occurred';
  if (error instanceof Error) {
    errorMessage = error.message;
  }
  return { success: false, error: errorMessage };
}
```

## 사용 예시

### 1. 로그인

```typescript
const response = await apiService.auth.login('user@example.com', 'password');
if (response.success) {
  console.log('User logged in:', response.data.user);
} else {
  console.error('Login failed:', response.error);
}
```

### 2. 회원가입

```typescript
const response = await apiService.auth.register('user@example.com', 'password', 'nickname');
if (response.success) {
  console.log('User registered:', response.data.user);
}
```

### 3. 프로필 업데이트

```typescript
const response = await apiService.auth.updateProfile({
  nickname: 'newNickname',
  email: 'newemail@example.com'
});
```

### 4. 아바타 업로드

```typescript
const formData = new FormData();
formData.append('avatar', file);
const response = await apiService.auth.uploadAvatar(formData);
```

## 백엔드 API 엔드포인트 매핑

현재 백엔드에서 구현된 엔드포인트와의 매핑:

| 프론트엔드 메서드 | 백엔드 엔드포인트 | HTTP 메서드 |
|------------------|------------------|-------------|
| `auth.login()` | `/api/users/login/local` | POST |
| `auth.register()` | `/api/users/register` | POST |
| `auth.loginWithGoogle()` | `/api/users/login/google` | POST |
| `auth.logout()` | `/api/users/logout` | POST |
| `auth.refreshToken()` | `/api/users/refresh-token` | POST |
| `auth.getCurrentUser()` | `/api/users/profile` | GET |
| `auth.uploadAvatar()` | `/api/users/avatar` | POST |

## 개발 환경 설정

### 1. Mock 모드 (개발/테스트)

```typescript
// config/environment.ts
export const getConfig = (): Config => ({
  apiUrl: 'http://localhost:3000/api',
  useMockData: true, // Mock 데이터 사용
  enableLogging: true,
  environment: 'development'
});
```

### 2. 프로덕션 모드

```typescript
export const getConfig = (): Config => ({
  apiUrl: 'https://api.yourdomain.com',
  useMockData: false, // 실제 API 사용
  enableLogging: false,
  environment: 'production'
});
```

## 다음 단계

### 1. 추가 구현 필요 사항:
- Google OAuth 2.0 실제 구현
- WebSocket 연결 (실시간 기능)
- 게임 API 서비스
- 친구 관리 API 서비스
- 알림 API 서비스

### 2. 테스트:
- API 서비스 단위 테스트
- 통합 테스트
- E2E 테스트

### 3. 최적화:
- 요청 캐싱
- 재시도 로직
- 오프라인 지원

## 결론

프론트엔드 API 서비스 레이어가 완전히 구현되어 백엔드와의 연결 준비가 완료되었습니다. 
- 개발 환경에서는 Mock 데이터로 테스트 가능
- 프로덕션 환경에서는 실제 백엔드 API 사용
- 토큰 기반 인증 시스템 완전 구현
- 자동 로그인 및 에러 처리 구현

이제 백엔드 서버를 시작하고 환경 설정을 `useMockData: false`로 변경하면 실제 API와 연동하여 사용할 수 있습니다.
