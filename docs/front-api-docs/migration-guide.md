# API Service Layer 마이그레이션 가이드

> **복잡한 구조에서 단순화된 API 서비스 레이어로의 마이그레이션 가이드**

## 🎯 주요 변경사항

### 구조 개선: 서비스 직접 노출
```typescript
// ✅ 새로운 구조의 핵심 개선사항
// 1. 명확한 책임 분리
apiClient.auth.login()     // 인증 관련 작업
apiClient.game.getStats()  // 게임 관련 작업
apiClient.friend.add()     // 친구 관련 작업

// 2. 확장성 향상
// 새 메서드 추가 시 ApiClient 수정 불필요
// 각 서비스에서 독립적으로 기능 확장 가능

// 3. IDE 지원 개선
// 자동완성과 타입 추론이 더 정확해짐
```

### 단순화된 구조
```
Before: 15개 파일 (복잡한 중첩 구조)
After:  9개 파일 (논리적 그룹핑)

Before: services/
├── interceptors/
│   ├── InterceptorSetup.ts
│   ├── InterceptorFactory.ts
│   ├── AuthInterceptor.ts
│   ├── LoggingInterceptor.ts
│   ├── DataTransformInterceptor.ts
│   ├── TokenRefreshInterceptor.ts
│   ├── ErrorNotificationInterceptor.ts
│   └── InterceptorConfig.ts
├── transformers/
│   ├── UserTransformer.ts
│   ├── FriendTransformer.ts
│   ├── GameTransformer.ts
│   └── BaseTransformer.ts
└── ...

After: services/
├── index.ts                   # 메인 엔트리 포인트
├── ApiClient.ts              # 통합 클라이언트
├── api/                      # API 서비스들
│   ├── BaseApiService.ts
│   ├── AuthApiService.ts
│   ├── GameApiService.ts
│   └── FriendApiService.ts
├── core/                     # 핵심 유틸리티
│   ├── Interceptors.ts       # 통합 인터셉터
│   ├── TokenManager.ts
│   └── DataTransformers.ts   # 함수형 변환기
├── examples/
│   └── ApiExample.ts
└── mocks/                    # Mock 데이터
    ├── AuthApiServiceMock.ts
    ├── GameApiServiceMock.ts
    └── FriendApiServiceMock.ts
```

## 🔄 마이그레이션 단계

### 1단계: Import 경로 업데이트

```typescript
// ❌ 기존 (복잡한 import)
import { InterceptorSetup } from '../services/interceptors/InterceptorSetup';
import { UserTransformer } from '../services/transformers/UserTransformer';
import { AuthInterceptor } from '../services/interceptors/AuthInterceptor';

// ✅ 새로운 (단순한 import)
import { ApiClient } from '../services';
import { transformUser } from '../services/core/DataTransformers';
```

### 2단계: 클라이언트 초기화 변경

```typescript
// ❌ 기존 (복잡한 설정)
const interceptors = InterceptorSetup.createForService('AuthApiService');
const authService = new AuthApiService();
InterceptorSetup.applyInterceptors(authService, interceptors);

// ✅ 새로운 (자동 설정)
const apiClient = new ApiClient({
  showNotification: (message, type) => showToast(message, type),
  environment: 'development'
});
```

### 3단계: 데이터 변환 코드 업데이트

```typescript
// ❌ 기존 (클래스 기반)
import { UserTransformer } from '../services/transformers/UserTransformer';

const transformer = new UserTransformer();
const user = transformer.transform(backendUser);

// ✅ 새로운 (함수 기반)
import { transformUser } from '../services/core/DataTransformers';

const user = transformUser(backendUser);
```

## 🛠️ 호환성 보장

### API 호출 방식 (구조 개선)
```typescript
// ✅ 새로운 구조: 각 서비스에 직접 접근
const user = await apiClient.auth.login(email, password);
const friends = await apiClient.friend.getFriends();
const games = await apiClient.game.getMatchHistory();

// ✅ 핵심 토큰 관리는 여전히 ApiClient 레벨에서
apiClient.setToken(token);        // 모든 서비스에 토큰 설정
apiClient.clearToken();           // 모든 서비스에서 토큰 제거
const isAuth = apiClient.isAuthenticated();
```

### 자동으로 개선되는 기능들
```typescript
// ✅ 코드 수정 없이 자동 적용되는 개선사항들:
// - 통합된 인터셉터 시스템 (성능 최적화)
// - 향상된 에러 처리
// - 타입 안전성 강화
// - Mock 데이터 동적 로딩
// - 개발 환경 디버깅 도구
```

## 🔧 새로운 기능 활용

### 1. 통합 서비스 import
```typescript
// ✅ 모든 서비스를 한 곳에서 import
import { 
  ApiClient, 
  AuthApiService, 
  GameApiService, 
  FriendApiService,
  TokenManager,
  transformUser
} from '../services';
```

### 2. 브라우저 콘솔 디버깅
```typescript
// ✅ 개발 환경에서 직접 API 테스트 가능
apiClient.auth.login('test@example.com', 'password');
apiClient.friend.getFriends();
apiClient.game.getGameStats();
```

### 3. 환경별 설정
```typescript
// ✅ 환경에 따른 자동 최적화
const apiClient = new ApiClient({
  environment: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  showNotification: (message, type) => {
    if (type === 'error') {
      showErrorToast(message);
    } else {
      showInfoToast(message);
    }
  }
});
```

## 🚀 성능 개선 효과

### 번들 크기 최적화
- **Mock 코드 분리**: 프로덕션 빌드에서 자동 제외
- **동적 import**: 필요할 때만 로드
- **코드 중복 제거**: 통합된 인터셉터 시스템

### 개발 경험 향상
- **자동 설정**: 복잡한 초기화 과정 제거
- **디버깅 도구**: 브라우저 콘솔 지원
- **타입 안전성**: 향상된 TypeScript 지원

### 유지보수성 개선
- **중앙 집중식 관리**: 모든 설정이 한 곳에서
- **명확한 구조**: 논리적 폴더 그룹핑
- **일관된 패턴**: 표준화된 접근 방식

## ⚠️ 주의사항

### 제거된 기능들
```typescript
// ❌ 더 이상 사용할 수 없는 것들
InterceptorSetup.createForService()     // → 자동 적용됨
UserTransformer.transform()             // → transformUser() 함수 사용
service.addInterceptor()                // → 자동 관리됨
```

### 마이그레이션이 필요한 경우
```typescript
// ⚠️ 수동 인터셉터 설정을 사용했다면:
// Before
InterceptorSetup.addCustomInterceptor('myInterceptor', myLogic);

// After
SimpleInterceptorManager.addCustomInterceptor('myInterceptor', myLogic);
```

## 🧪 마이그레이션 검증

### 기본 동작 확인
```typescript
// ✅ 이 코드들이 정상 동작하는지 확인
const apiClient = new ApiClient();

// 인증 테스트
const user = await apiClient.auth.login('test@example.com', 'password');
console.log('Login successful:', user.username);

// 토큰 관리 테스트
apiClient.setToken('test-token');
console.log('Token set:', apiClient.getToken());

// 데이터 조회 테스트
const friends = await apiClient.friend.getFriends();
console.log('Friends loaded:', friends.length);
```

### 콘솔에서 기본 테스트
```typescript
// ✅ 브라우저 콘솔에서 실행
apiClient.auth.login('test@example.com', 'password')
  .then(() => console.log('✅ 마이그레이션 성공!'))
  .catch(error => console.error('❌ 마이그레이션 문제:', error));
```

## 🎁 추가 혜택

### 자동으로 적용되는 개선사항
- **에러 메시지**: API 응답의 구체적 메시지 자동 표시
- **토큰 갱신**: 401 에러 시 자동 refresh token 처리
- **타입 변환**: 백엔드 데이터 자동 변환
- **캐시 최적화**: 중복 요청 방지
- **개발 로깅**: 상세한 API 호출 로그

### 새로운 개발 도구
- **브라우저 콘솔 테스트**: 실시간 API 테스트
- **Mock 데이터 시스템**: 빠른 프로토타이핑
- **타입 안전성**: 런타임 에러 사전 방지

## 🔗 관련 문서

- **[API Service Guide](./api-service-guide.md)**: 새로운 API 사용법 상세 가이드

---

**요약**: 대부분의 기존 코드는 수정 없이 그대로 사용할 수 있으며, 자동으로 개선된 기능들의 혜택을 받을 수 있습니다. 새로운 기능들은 필요에 따라 점진적으로 도입하시면 됩니다.