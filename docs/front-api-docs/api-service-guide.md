# API Service Layer Guide

> **프론트엔드 API 서비스 레이어 사용 가이드** (v3.0)

## 🚀 기본 사용법

### 1. API 클라이언트 초기화
```typescript
import { ApiClient } from '../services';

const apiClient = new ApiClient({
  showNotification: (message, type) => showToast(message, type),
  environment: 'development'
});
```

### 2. 인증 API (AuthApiService)
```typescript
// 로그인 (HttpOnly 쿠키 기반)
const user = await apiClient.auth.login('email@example.com', 'password');

// 회원가입
const newUser = await apiClient.auth.register('email@example.com', 'password', 'nickname');

// 토큰 갱신
const refreshedUser = await apiClient.auth.refreshToken();

// 현재 사용자 정보
const currentUser = await apiClient.auth.getCurrentUser();

// 로그아웃 (자동 토큰 정리)
await apiClient.auth.logout();

// 인증 상태 확인
const isAuthenticated = apiClient.auth.isAuthenticated();
const token = apiClient.auth.getToken();
```

### 3. 사용자 API (UserApiService)
**참고: UserApiService는 ApiClient에 포함되지 않으며, 필요시 별도로 import하여 사용합니다.**

```typescript
import { UserApiService } from '../services';

const userApi = new UserApiService();

// 프로필 조회
const profile = await userApi.getProfile();

// 프로필 업데이트
const updatedProfile = await userApi.updateProfile({
  nickname: 'new-nickname',
  bio: 'Hello world!'
});

// 아바타 업로드
const file = /* File object */;
const userWithNewAvatar = await userApi.uploadAvatar(file);

// 사용자 검색
const users = await userApi.searchUsers('search query');

// ID로 사용자 조회
const user = await userApi.getUserById('user-id');

// 사용자명으로 조회
const user = await userApi.getUserByUsername('username');
```

### 4. 게임 API (GameApiService)
```typescript
// 게임 생성
const game = await apiClient.game.createGame({
  gameMode: '1v1',
  difficulty: 'medium'
});

// 게임 참가
const joinedGame = await apiClient.game.joinGame('gameId');

// 게임 정보 조회
const gameInfo = await apiClient.game.getGame('gameId');

// 게임 움직임/액션
const updatedGame = await apiClient.game.makeMove('gameId', {
  type: 'paddle_move',
  data: { y: 100 }
});

// 게임 떠나기
await apiClient.game.leaveGame('gameId');

// 게임 히스토리 조회
const matches = await apiClient.game.getGameHistory(1, 10); // page, limit

// 게임 통계
const stats = await apiClient.game.getGameStats();

// 활성 게임 목록
const activeGames = await apiClient.game.getActiveGames();
```

### 5. 친구 API (FriendApiService)
```typescript
// 친구 목록
const friends = await apiClient.friend.getFriends();

// 친구 요청 보내기
await apiClient.friend.addFriend('username');

// 친구 삭제
await apiClient.friend.removeFriend('username');

// 친구 차단/해제
await apiClient.friend.blockFriend('username');
await apiClient.friend.unblockFriend('username');

// 친구 요청 목록
const requests = await apiClient.friend.getFriendRequests();

// 친구 요청 응답
await apiClient.friend.respondToFriendRequest('requestId', true); // 수락
await apiClient.friend.respondToFriendRequest('requestId', false); // 거절

// 친구 온라인 상태 조회
const statuses = await apiClient.friend.getFriendsStatus();
```

## 🔧 자동 기능들

### 백그라운드에서 자동 처리되는 기능들

#### 1. 토큰 관리 (TokenManager)
- **액세스 토큰**: 메모리에 저장 (XSS 방지)
- **리프레시 토큰**: HttpOnly 쿠키로 서버가 관리
- **자동 갱신**: 401 에러 시 자동으로 토큰 갱신 시도

#### 2. 인터셉터 시스템 (SimpleInterceptorManager)
- **요청 인터셉터**: 자동 토큰 주입, 요청 로깅
- **응답 인터셉터**: 에러 처리, 응답 로깅, 토큰 갱신

#### 3. 데이터 변환 (DataTransformers)
- **백엔드 → 프론트엔드**: 서버 응답을 클라이언트 타입으로 변환
- **타입 안전성**: TypeScript 타입 보장

#### 4. 캐시 관리
- **자동 캐시**: 서비스별 독립적인 캐시 시스템
- **캐시 초기화**: `clearCache()` 메서드로 수동 정리 가능

## 🛡️ 보안 특징

### 1. HttpOnly 쿠키 기반 인증
```typescript
// 로그인 시 자동으로 설정
await apiClient.auth.login(email, password);
// → 액세스 토큰: 메모리 저장
// → 리프레시 토큰: HttpOnly 쿠키 저장 (서버가 관리)
```

### 2. 자동 토큰 갱신
```typescript
// API 호출 중 401 에러 발생 시 자동으로 처리
// 사용자는 별도 작업 불필요
const data = await apiClient.friend.getFriends();
// → 내부적으로 토큰 갱신 후 재시도
```

### 3. 안전한 로그아웃
```typescript
await apiClient.auth.logout();
// → 메모리의 액세스 토큰 제거
// → 서버의 리프레시 토큰 쿠키 제거
// → 모든 서비스 캐시 초기화
```

## 🔍 에러 처리

### 자동 에러 처리
```typescript
try {
  const friends = await apiClient.friend.getFriends();
} catch (error) {
  // ApiError 타입의 구조화된 에러
  if (error instanceof ApiError) {
    console.log('Status:', error.status);
    console.log('Message:', error.message);
    console.log('Context:', error.context);
  }
}
```

### 알림 시스템 통합
```typescript
const apiClient = new ApiClient({
  showNotification: (message, type) => {
    // 사용자 정의 알림 시스템 연결
    showToast(message, type);
  }
});
// → 에러 발생 시 자동으로 사용자에게 알림
```

## 📋 타입 정의

모든 API는 완전한 TypeScript 지원을 제공합니다:

```typescript
// types/types.ts에서 import
import * as Types from '../../types/types';

// 예시: 사용자 타입
interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  // ...
}

// 예시: 게임 설정 타입
interface GameConfig {
  gameMode: '1v1' | 'tournament';
  difficulty: 'easy' | 'medium' | 'hard';
  // ...
}
```

## 🚀 추가 기능

### 캐시 관리
```typescript
// 모든 캐시 초기화
apiClient.clearAllCaches();

// 특정 서비스 캐시만 초기화
apiClient.auth.clearCache();
apiClient.friend.clearCache();
apiClient.game.clearCache();
```

### 인터셉터 재설정
```typescript
// 인터셉터 시스템 초기화 (디버깅용)
apiClient.resetInterceptors();
```

### 토큰 수동 관리 (고급 사용법)
```typescript
// 인증 상태 확인
const isAuth = apiClient.isAuthenticated();

// 토큰 수동 설정 (특수한 경우에만 사용)
apiClient.setToken('custom-token');

// 토큰 초기화
apiClient.clearToken();
```
- **인증 관리**: 자동 토큰 첨부 및 갱신
- **데이터 변환**: 백엔드 ↔ 프론트엔드 데이터 자동 변환
- **에러 처리**: 사용자 친화적 에러 메시지
- **캐시 관리**: GET 요청 자동 캐싱 (5분 TTL)
- **재시도 로직**: 네트워크/서버 오류 시 자동 재시도

## 📊 데이터 변환 시스템

### 백엔드 → 프론트엔드 자동 변환
```typescript
// 백엔드에서 받는 데이터
interface BackendUser {
  id: number;
  username: string;
  nickname?: string;
  // ... 기타 필드
}

// 프론트엔드에서 사용하는 데이터 (자동 변환됨)
interface User {
  id: string;        // number → string 변환
  username: string;
  nickname: string;  // optional → required 변환 (기본값 제공)
  // ... 기타 필드
}
```

### 수동 변환 함수들
```typescript
import { transformUser, transformFriends } from '../services/core/DataTransformers';

// 필요시 수동 변환 가능
const user = transformUser(backendUserData);
const friends = transformFriends(backendFriendsData);
```

## 🎮 Mock 데이터 시스템

### 개발 환경 설정
```typescript
// Mock 데이터 사용 시
const apiClient = new ApiClient({
  environment: 'development' // Mock 데이터 자동 활성화
});

// 실제 API 사용 시  
const apiClient = new ApiClient({
  environment: 'production'
});
```

### Mock 응답 예시
```typescript
// 개발 중에는 실제 서버 없이도 개발 가능
const user = await apiClient.auth.login('any@email.com', 'any-password');
// Mock 데이터 반환: { id: '1', username: 'mockUser', ... }

const friends = await apiClient.friend.getFriends();
// Mock 데이터 반환: [{ username: 'friend1', status: 'online', ... }]
```

## ⚡ 성능 최적화

### 캐시 시스템
```typescript
// GET 요청은 자동 캐시됨 (5분 TTL)
const friends1 = await apiClient.friend.getFriends(); // 서버 호출
const friends2 = await apiClient.friend.getFriends(); // 캐시에서 반환

// 캐시 수동 초기화
apiClient.clearAllCaches();
```

### 재시도 로직
```typescript
// 네트워크 오류나 5xx 에러 시 자동 재시도 (최대 3번)
// 지수 백오프 적용 (1초, 2초, 3초 간격)
const data = await apiClient.game.getGameStats();
```

## 🔐 보안 고려사항

### 토큰 관리
- **Access Token**: 메모리에만 저장 (XSS 방지)
- **Refresh Token**: HttpOnly 쿠키 (서버 관리)
- **자동 갱신**: 401 에러 시 투명하게 처리

### 에러 처리
```typescript
try {
  const user = await apiClient.auth.login(email, password);
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Status:', error.status);
    console.log('Message:', error.data?.message);
  }
}
```

## 🧪 개발 및 디버깅

### 브라우저 콘솔에서 테스트
```typescript
// 개발 환경에서 전역으로 사용 가능
apiClient.auth.login('test@example.com', 'password');
apiClient.friend.getFriends();
apiClient.game.getGameStats();
```

## 🔄 마이그레이션 팁

### 기존 코드에서 변경점
```typescript
// Before (복잡한 구조)
import { AuthApiService } from '../services/auth/AuthApiService';
import { InterceptorSetup } from '../services/interceptors/InterceptorSetup';

// After (단순화된 구조)
import { ApiClient } from '../services';
```

### 권장 사용 패턴
1. **중앙화된 클라이언트**: 하나의 `ApiClient` 인스턴스 사용
2. **환경별 설정**: development/production 환경 구분
3. **에러 핸들링**: try-catch 블록으로 적절한 에러 처리
4. **타입 활용**: TypeScript 타입을 적극 활용

---

**다음 단계**: [Migration Guide](./migration-guide.md)를 확인하여 기존 코드를 새 구조로 업데이트하세요!