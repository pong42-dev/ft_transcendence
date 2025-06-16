# API Service Layer Guide

> **단순화된 프론트엔드 API 서비스 레이어 사용 가이드**

## 🚀 기본 사용법

### 1. API 클라이언트 초기화
```typescript
import { ApiClient } from '../services';

const apiClient = new ApiClient({
  showNotification: (message, type) => showToast(message, type),
  environment: 'development'
});
```

### 2. 인증 API
```typescript
// 로그인 (자동 토큰 관리)
const user = await apiClient.auth.login('email@example.com', 'password');

// 회원가입
const newUser = await apiClient.auth.register('email@example.com', 'password', 'nickname');

// 현재 사용자 정보
const currentUser = await apiClient.auth.getCurrentUser();

// 사용자 검색
const users = await apiClient.auth.searchUsers('query');

// 프로필 업데이트
const updatedUser = await apiClient.auth.updateUser({ nickname: 'new-nickname' });

// 로그아웃 (자동 토큰 정리)
await apiClient.auth.logout();
```

### 3. 게임 API
```typescript
// 게임 통계
const stats = await apiClient.game.getGameStats();

// 매치 히스토리
const matches = await apiClient.game.getMatchHistory();

// 게임 생성
const game = await apiClient.game.createGame({
  gameMode: '1v1',
  difficulty: 'medium'
});

// 게임 결과 업데이트
await apiClient.game.updateGame('gameId', {
  winner: 'player1',
  player1Score: 5,
  player2Score: 3,
  duration: 300,
  endedAt: new Date().toISOString()
});

// 활성 게임 목록
const activeGames = await apiClient.game.getActiveGames();

// 게임 참가
const joinedGame = await apiClient.game.joinGame('gameId');

// 게임 초대
await apiClient.game.sendGameInvite('username', '1v1');
```

### 4. 친구 API
```typescript
// 친구 목록
const friends = await apiClient.friend.getFriends();

// 친구 요청 보내기
await apiClient.friend.addFriend('username');

// 친구 요청 목록
const requests = await apiClient.friend.getFriendRequests();

// 친구 요청 응답
await apiClient.friend.respondToFriendRequest('requestId', true); // 수락
await apiClient.friend.respondToFriendRequest('requestId', false); // 거절

// 친구 삭제
await apiClient.friend.removeFriend('username');

// 친구 차단/해제
await apiClient.friend.blockFriend('username');
await apiClient.friend.unblockFriend('username');

// 친구 상태 조회
const status = await apiClient.friend.getFriendStatus('username');
const allStatuses = await apiClient.friend.getFriendsStatus();
```

## 🔧 자동 기능들

### 백그라운드에서 자동 처리되는 기능들
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