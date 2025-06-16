# Frontend API Documentation

> **프론트엔드 API 서비스 레이어 문서**

## 📚 문서 구조

### 🚀 [API Service Guide](./api-service-guide.md)
**메인 가이드** - API 서비스 레이어 사용법
- 기본 사용법 및 설정
- `apiClient.auth.*`, `apiClient.game.*`, `apiClient.friend.*` 구조
- Mock 데이터 시스템
- 에러 처리 및 자동 기능

### 🔄 [Migration Guide](./migration-guide.md)
**마이그레이션 가이드** - 기존 코드에서 새 구조로
- 서비스 직접 노출 구조로의 변경점
- 호환성 보장 및 개선사항
- 단계별 마이그레이션 절차

## 🎯 빠른 시작

### 1. 기본 설정
```typescript
import { ApiClient } from '../services';

const apiClient = new ApiClient({
  showNotification: (message, type) => showToast(message, type),
  environment: 'development'
});
```

### 2. API 호출 (개선된 구조)
```typescript
// 인증 - auth 서비스를 통해 호출
const user = await apiClient.auth.login(email, password);
const currentUser = await apiClient.auth.getCurrentUser();

// 친구 - friend 서비스를 통해 호출
const friends = await apiClient.friend.getFriends();
await apiClient.friend.addFriend('username');

// 게임 - game 서비스를 통해 호출
const games = await apiClient.game.getMatchHistory();
const stats = await apiClient.game.getGameStats();
```

### 3. 핵심 기능 (자동)
```typescript
// 로그인 시 자동 토큰 저장 및 모든 서비스에 적용
// 401 에러 시 자동 토큰 갱신
// 로그아웃 시 자동 토큰 정리
// 타입 안전성 보장 및 데이터 변환
```

## 🏗️ 단순화된 구조

```
frontend/src/services/
├── index.ts                   # 메인 엔트리 포인트
├── ApiClient.ts              # 통합 클라이언트
├── api/                      # API 서비스들
│   ├── BaseApiService.ts     # 기본 HTTP 클라이언트
│   ├── AuthApiService.ts     # 인증 API
│   ├── GameApiService.ts     # 게임 API
│   └── FriendApiService.ts   # 친구 API
├── core/                     # 핵심 유틸리티
│   ├── Interceptors.ts       # 단순화된 인터셉터
│   ├── TokenManager.ts       # 토큰 관리
│   └── DataTransformers.ts   # 데이터 변환
└── mocks/                    # Mock 데이터
    ├── AuthApiServiceMock.ts
    ├── GameApiServiceMock.ts
    └── FriendApiServiceMock.ts
```

## 🔗 주요 개선사항

- **구조 개선**: 각 서비스를 직접 노출하여 명확한 책임 분리
- **단순화**: 8개 인터셉터 파일 → 1개 통합 파일
- **확장성**: `apiClient.auth.*`, `apiClient.game.*`, `apiClient.friend.*` 구조로 직관적 접근
- **함수형**: 클래스 기반 → 함수 기반 변환
- **타입 안전**: 강화된 타입 검증 및 변환
- **성능**: 인터셉터 캐싱 및 동적 Mock 로딩

---

**시작하기**: [API Service Guide](./api-service-guide.md)를 먼저 읽어보세요!