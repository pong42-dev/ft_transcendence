# Changes Log

# new_src Changes from alt_src

이 문서는 `src`가 `bolt_demo`로부터 어떤 변경사항이 있는지 정리합니다.

## 📁 폴더 구조 변경

### 새로 추가된 폴더
- `config/` - 환경설정 관리 (src에서 가져옴)
- `models/` - 데이터 모델 정의 (src에서 가져옴)

### 기존 폴더 유지
- `components/` - UI 컴포넌트들
- `services/` - API 서비스 계층
- `types/` - TypeScript 타입 정의
- `utils/` - 유틸리티 함수들

## 🔧 서비스 계층 강화

## 🎨 UI 컴포넌트 추가

### components/ 폴더 변경사항
| 파일 | 출처 | 설명 |
|------|------|------|
| 기존 컴포넌트들 | alt_src | 모든 기존 컴포넌트 유지 |
| `NotificationCenter.ts` | **src** | 새로 추가 - 알림 센터 UI |

**NotificationCenter 기능:**
- 실시간 알림 표시
- 친구 요청/게임 초대 처리
- 읽지 않은 알림 카운트
- 액션 버튼 (Accept/Decline)

## ⚙️ 설정 시스템 추가

### config/ 폴더 (새로 추가)
| 파일 | 출처 | 설명 |
|------|------|------|
| `environment.ts` | **src** | 환경별 설정 관리 |

**환경 설정 기능:**
- 개발/프로덕션/테스트 환경 구분
- API URL 자동 설정
- WebSocket URL 관리
- 모킹 데이터 사용 여부 제어
- 로깅 활성화/비활성화

## 📊 데이터 모델 추가

### models/ 폴더 (새로 추가)
| 파일 | 출처 | 설명 |
|------|------|------|
| `Types.ts` | **src** | 알림 및 추가 타입 정의 |

**추가된 타입:**
- `Notification` - 알림 데이터 구조
- 기타 UI 관련 타입들

## 🛠️ 유틸리티 함수 확장

### utils/ 폴더 변경사항
| 파일 | 출처 | 설명 |
|------|------|------|
| 기존 유틸리티들 | alt_src | 모든 기존 유틸리티 유지 |
| `AuthService.ts` | **src** | 새로 추가 - 인증 관련 헬퍼 |
| `helpers.ts` | **src** | 새로 추가 - 일반 헬퍼 함수들 |

**새로운 유틸리티 기능:**
- 토큰 관리 헬퍼
- 인증 상태 확인
- 공통 헬퍼 함수들

## 🔄 호환성 유지

### 변경되지 않은 핵심 요소들
- ✅ `main.ts` - 애플리케이션 진입점
- ✅ `style.css` - 스타일링
- ✅ `types/types.ts` - 핵심 타입 정의
- ✅ `vite-env.d.ts` - Vite 환경 타입
- ✅ 모든 기존 컴포넌트들

## 📈 향후 개선 방향

### API 통합 작업 시
1. `types/types.ts`의 `ApiResponse` 타입을 src의 구조에 맞게 점진적 수정
2. 기존 `ApiClient.ts`를 새로운 서비스 계층과 통합
3. 환경 설정을 통한 모킹/실제 API 전환

### 예상 이점
- 🔒 **보안**: 체계적인 토큰 관리
- 🚀 **성능**: 환경별 최적화
- 🔧 **유지보수**: 모듈화된 서비스 구조
- 📱 **UX**: 실시간 알림 시스템
- 🧪 **테스트**: 환경별 설정 지원

## 📋 마이그레이션 체크리스트

- [x] 폴더 구조 생성
- [x] 기존 컴포넌트 복사
- [x] 새로운 서비스 계층 추가
- [x] 알림 시스템 추가
- [x] 환경 설정 시스템 추가
- [x] 유틸리티 함수 확장
- [x] API 통합 테스트
- [x] 타입 호환성 검증
- [x] 계층화된 아키텍처 구현
- [ ] 빌드 시스템 연동

## 2025-01-13 - API Architecture Refactoring

### 🏗️ **Major: Layered API Architecture Implementation**

**Background:**
기존 `alt_src`와 `src`의 API 클라이언트들이 중복된 기능을 가지고 있어서, 확장성과 유지보수성을 고려한 계층화된 아키텍처로 통합했습니다.

### 📁 **New File Structure**

```
frontend/src/services/
├── BaseApiService.ts     # 추상 기본 클래스 (HTTP, 토큰, Mock 처리)
├── AuthApiService.ts     # 인증 관련 API (extends BaseApiService)
├── GameApiService.ts     # 게임 관련 API (extends BaseApiService)
├── FriendApiService.ts   # 친구 관련 API (extends BaseApiService)
└── ApiClient.ts          # 파사드 패턴 - 모든 서비스 통합
```

### ✨ **New Features**

#### 1. **BaseApiService (추상 클래스)**
- HTTP 요청 처리 (GET, POST, PUT, DELETE)
- 토큰 관리 (설정, 가져오기, 제거)
- 환경 기반 Mock/Real API 자동 전환
- 에러 처리 및 401 인증 실패 자동 처리
- 개발 환경 로깅

#### 2. **Domain-Specific Services**
- **AuthApiService**: 로그인, 회원가입, 사용자 관리
- **GameApiService**: 게임 생성, 통계, 매치 히스토리
- **FriendApiService**: 친구 관리, 요청, 차단 기능

#### 3. **ApiClient (파사드 패턴)**
- 모든 서비스에 대한 단일 진입점
- 기존 API 호환성 유지 (편의 메서드 제공)
- 새로운 명확한 구조 지원 (`apiClient.auth.login()`)

### 🔧 **Enhanced Features**

#### Mock Data System
- 환경설정 기반 Mock/Real API 자동 전환
- 각 서비스별로 실제 API 응답 시뮬레이션
- 네트워크 지연 시뮬레이션 (100-500ms)
- 개발/테스트 환경에서 백엔드 독립적 개발 가능

#### Environment Configuration
```typescript
// config/environment.ts에서 제어
{
  useMockData: true,     // Mock 모드 활성화
  enableLogging: true,   // API 요청/응답 로깅
  apiUrl: 'http://localhost:3000/api'
}
```

### 📱 **UI Updates**

#### App.ts Integration
- 헤더에 API 모드 표시: `[MOCK]` / `[LIVE]`
- help 명령어에서 현재 API 상태 확인 가능
- 환경 기반 조건부 API 호출

#### NotificationCenter Enhancement
- Mock 모드에서 30초마다 랜덤 알림 자동 생성
- Real 모드에서 실제 API 연동 준비
- 알림 액션 (Accept/Decline) API 호출 연동

### 🔄 **Migration & Compatibility**

#### Backward Compatibility
```typescript
// 기존 방식 (여전히 작동)
const user = await apiClient.login(email, password);
const friends = await apiClient.getFriends();

// 새로운 방식 (권장)
const user = await apiClient.auth.login(email, password);
const friends = await apiClient.friend.getFriends();
```

#### Breaking Changes
- ❌ **Removed**: `ApiService.ts` (기능이 ApiClient에 통합됨)
- ✅ **Maintained**: 모든 기존 메서드 호환성 유지

### 🎯 **Benefits**

1. **확장성**: 새로운 도메인 서비스 쉽게 추가 가능
2. **재사용성**: BaseApiService 상속으로 공통 기능 활용
3. **테스트 용이성**: 각 서비스별 독립적 테스트 가능
4. **단일 책임**: 각 서비스가 명확한 역할 분담
5. **개발 효율성**: Mock 데이터로 백엔드 독립적 개발

### 📋 **Usage Examples**

#### Basic Usage (Facade Pattern)
```typescript
const apiClient = new ApiClient();

// Authentication
await apiClient.auth.login(email, password);
await apiClient.auth.getCurrentUser();

// Game Management  
await apiClient.game.getMatchHistory();
await apiClient.game.createGame(gameData);

// Friend Management
await apiClient.friend.getFriends();
await apiClient.friend.addFriend(username);
```

#### Environment Switching
```typescript
// development 환경: useMockData: true
// → Mock 응답 자동 반환

// production 환경: useMockData: false  
// → 실제 백엔드 API 호출
```

### 📚 **Documentation**

- **New**: `frontend/src/API_INTEGRATION.md` - 계층화된 아키텍처 가이드
- **Updated**: 환경 설정 및 Mock/Real API 전환 방법

### 🔜 **Future Enhancements**

1. **WebSocket 서비스**: 실시간 알림 및 게임 상태
2. **Caching 레이어**: API 응답 캐싱 전략
3. **Retry 로직**: 네트워크 실패 시 자동 재시도
4. **Error 서비스**: 중앙화된 에러 처리 및 로깅

---

### 🏷️ **Commit Summary**
- **Type**: `feat` - Major API architecture refactoring
- **Scope**: Frontend services layer
- **Breaking**: No (backward compatibility maintained)
- **Files Changed**: 6 added, 1 removed, 2 modified

---

