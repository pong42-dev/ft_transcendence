# API Integration Guide - Layered Architecture

이 문서는 frontend/src의 계층화된 API 아키텍처를 설명합니다.

## 🔧 환경 설정

### 환경별 API 설정
`config/environment.ts`에서 환경별 설정을 관리합니다:

```typescript
export const config: Record<string, Config> = {
  development: {
    apiUrl: 'http://localhost:3000/api',
    wsUrl: 'ws://localhost:3000',
    useMockData: true,    // Mock 데이터 사용
    enableLogging: true,
  },
  production: {
    apiUrl: 'https://your-backend-domain.com/api',
    wsUrl: 'wss://your-backend-domain.com',
    useMockData: false,   // 실제 API 사용
    enableLogging: false,
  }
};
```

## 🏗️ 아키텍처 구조

### 계층화된 서비스 구조
```
services/
├── BaseApiService.ts     # 추상 기본 클래스 (HTTP, 토큰, Mock 처리)
├── AuthApiService.ts     # 인증 관련 API (extends BaseApiService)
├── GameApiService.ts     # 게임 관련 API (extends BaseApiService)
├── FriendApiService.ts   # 친구 관련 API (extends BaseApiService)
└── ApiClient.ts          # 파사드 패턴 - 모든 서비스 통합
```

### 설계 원칙
- **단일 책임 원칙**: 각 서비스는 특정 도메인만 담당
- **확장성**: 새로운 서비스 쉽게 추가 가능
- **재사용성**: BaseApiService 상속으로 공통 기능 활용
- **파사드 패턴**: ApiClient가 모든 서비스에 대한 단일 진입점 제공

## 📡 API 클라이언트 사용법

### 기본 사용법 (파사드 패턴)
```typescript
import { ApiClient } from '../services/ApiClient';

const apiClient = new ApiClient();

// 편의 메서드 사용 (기존 호환성)
const user = await apiClient.login('email@example.com', 'password');
const currentUser = await apiClient.getCurrentUser();
const friends = await apiClient.getFriends();

// 직접 서비스 접근 (더 명확한 구조)
const user = await apiClient.auth.login('email@example.com', 'password');
const gameStats = await apiClient.game.getGameStats();
const friendRequests = await apiClient.friend.getFriendRequests();
```

### 서비스별 직접 사용
```typescript
import { AuthApiService, GameApiService, FriendApiService } from '../services';

// 개별 서비스 사용
const authService = new AuthApiService();
const gameService = new GameApiService();
const friendService = new FriendApiService();

// 토큰은 수동으로 설정 필요
const token = localStorage.getItem('auth_token');
authService.setToken(token);
gameService.setToken(token);
friendService.setToken(token);
```

### Mock vs Real API 전환

#### Mock 데이터 모드 (useMockData: true)
- 실제 HTTP 요청 없이 시뮬레이션된 응답 반환
- 네트워크 지연 시뮬레이션 (100-500ms)
- 개발 및 테스트에 적합

#### Real API 모드 (useMockData: false)
- 실제 백엔드 서버로 HTTP 요청 전송
- 실제 토큰 관리 및 인증 처리
- 프로덕션 환경에서 사용

## 🔔 알림 시스템

### NotificationCenter 사용법
```typescript
import { NotificationCenter } from '../components/NotificationCenter';
import { ApiClient } from '../services/ApiClient';

const apiClient = new ApiClient();
const notificationCenter = new NotificationCenter(
  (notification) => {
    // 알림 액션 처리
    console.log('Notification action:', notification);
  },
  apiClient
);

// Mock 모드에서는 30초마다 랜덤 알림 자동 생성
// Real 모드에서는 실제 API에서 알림 조회
```

### Mock 알림 기능
Mock 모드에서는 다음 알림들이 자동 생성됩니다:
- 친구 요청 (friend_request)
- 게임 초대 (game_invite)  
- 시스템 메시지 (system)

## 🎮 App.ts 통합

### 환경 상태 표시
```typescript
// 헤더에 Mock/Live 상태 표시
PONG-CLI v1.0.0 [HASH-ROUTED] [MOCK] // Mock 모드
PONG-CLI v1.0.0 [HASH-ROUTED] [LIVE] // Live 모드

// help 명령어에서 API 상태 확인
help
> API Status: MOCK DATA
> Available commands: ...
```

### 통합된 기능들
- ✅ 환경별 API URL 자동 설정
- ✅ Mock/Real API 조건부 처리
- ✅ 토큰 관리 통합
- ✅ 에러 처리 표준화
- ✅ 로깅 시스템 (개발 환경에서만)
- ✅ 자동 인증 실패 처리

## 🚀 프로덕션 배포

### 환경 변수 설정
```bash
# .env.production
VITE_NODE_ENV=production
```

### API 모드 전환
1. `config/environment.ts`에서 `useMockData: false` 설정
2. 실제 백엔드 API URL 설정
3. 빌드 및 배포

## 🔍 디버깅

### 개발 모드 로깅
```typescript
// 요청/응답 로그 확인
console.log('API Request: POST /auth/login', { body: ... });
console.log('API Response: 200', { data: ... });
```

### Mock 응답 커스터마이징
`ApiClient.ts`의 `getMockResponse` 메서드에서 Mock 응답을 수정할 수 있습니다.

## 📋 체크리스트

### 개발 단계
- [x] Mock 데이터로 UI 테스트
- [x] 알림 시스템 테스트
- [x] 에러 처리 테스트
- [x] 토큰 관리 테스트

### 배포 준비
- [ ] 실제 API 엔드포인트 확인
- [ ] 프로덕션 환경 설정
- [ ] 에러 로깅 시스템 구성
- [ ] 성능 테스트

## 🔧 향후 개선사항

1. **WebSocket 연동**: 실시간 알림 시스템
2. **캐싱**: API 응답 캐싱 전략
3. **재시도 로직**: 네트워크 실패 시 자동 재시도
4. **오프라인 지원**: 오프라인 모드 처리