# 백엔드 API 연결 설정 가이드

## 현재 상태

프론트엔드 API 서비스 레이어가 완전히 구현되어 백엔드와 연결할 준비가 완료되었습니다.

## 백엔드 서버 시작

### 1. 백엔드 서버 실행

```bash
# 백엔드 디렉토리로 이동
cd /Users/mindaewon/ft_transcendence/backend/srcs

# 의존성 설치 (처음 실행시)
npm install

# 개발 서버 시작
npm run dev
```

### 2. 데이터베이스 설정

```bash
# 데이터베이스 생성 및 마이그레이션
npm run db:create
npm run db:migrate
npm run db:seed
```

## 프론트엔드 API 연결 설정

### 1. 환경 설정 변경

`/frontend/src/config/environment.ts` 파일을 수정하여 실제 API를 사용하도록 설정:

```typescript
// 현재 Mock 모드 설정
export const getConfig = (): Config => {
  const isDevelopment = import.meta.env.DEV;
  
  return {
    apiUrl: isDevelopment 
      ? 'http://localhost:3000/api'  // 로컬 백엔드 서버
      : 'https://your-production-api.com/api',
    useMockData: false,  // ← 이 값을 false로 변경
    enableLogging: isDevelopment,
    environment: isDevelopment ? 'development' : 'production'
  };
};
```

### 2. CORS 설정 확인

백엔드에서 프론트엔드 도메인을 허용하도록 CORS 설정이 되어있는지 확인:

```typescript
// 백엔드에서 CORS 설정 예시
app.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
});
```

## API 엔드포인트 매핑 확인

### 현재 구현된 백엔드 엔드포인트:

1. **회원가입**: `POST /api/users/register`
   - Body: `{ email, password, name }`
   - Files: `avatar` (multipart/form-data)

2. **로그인**: `POST /api/users/login/local`
   - Body: `{ email, password }`

3. **Google 로그인**: `POST /api/users/login/google`

4. **로그아웃**: `POST /api/users/logout`

5. **토큰 갱신**: `POST /api/users/refresh-token`

6. **사용자 프로필**: `GET /api/users/profile`

7. **아바타 업로드**: `POST /api/users/avatar`

### 프론트엔드 API 서비스와 매핑:

```typescript
// AuthApiService의 메서드들이 백엔드 엔드포인트와 자동 매핑됨
await apiService.auth.login(email, password);        // → POST /api/users/login/local
await apiService.auth.register(email, password, name); // → POST /api/users/register
await apiService.auth.logout();                      // → POST /api/users/logout
await apiService.auth.getCurrentUser();              // → GET /api/users/profile
```

## 테스트 절차

### 1. 백엔드 서버 상태 확인

```bash
# 백엔드 서버가 실행 중인지 확인
curl http://localhost:3000/api/users/check-email
```

### 2. 프론트엔드에서 API 연결 테스트

1. `useMockData: false`로 설정
2. 브라우저 개발자 도구에서 Network 탭 확인
3. 회원가입/로그인 테스트
4. 콘솔에서 API 요청/응답 로그 확인

### 3. 디버깅

환경 설정에서 `enableLogging: true`로 설정하면 모든 API 요청/응답이 콘솔에 로깅됩니다:

```typescript
// 개발 환경에서 상세 로깅 활성화
if (this.config.enableLogging) {
  console.log(`API Request: ${method} ${url}`, { headers, body });
  console.log(`API Response: ${status}`, responseData);
}
```

## 문제 해결

### 1. CORS 에러

**증상**: `Access to fetch at 'http://localhost:3000/api/...' has been blocked by CORS policy`

**해결**:
- 백엔드에서 프론트엔드 도메인을 CORS allowlist에 추가
- 개발 환경: `http://localhost:5173` (Vite 기본 포트)

### 2. 네트워크 연결 에러

**증상**: `Failed to fetch` 또는 `NetworkError`

**해결**:
- 백엔드 서버가 실행 중인지 확인
- API URL이 올바른지 확인
- 방화벽 설정 확인

### 3. 인증 토큰 에러

**증상**: `401 Unauthorized` 응답

**해결**:
- 토큰이 올바르게 저장되었는지 확인
- localStorage에서 토큰 확인: `localStorage.getItem('authToken')`
- 토큰 만료 시간 확인

### 4. 응답 형식 불일치

**증상**: 데이터 파싱 에러

**해결**:
- 백엔드 응답 형식과 프론트엔드 타입 정의 일치 확인
- `ApiResponse<T>` 인터페이스와 실제 응답 구조 비교

## 실제 연결 체크리스트

- [ ] 백엔드 서버 실행 중
- [ ] 데이터베이스 설정 완료
- [ ] `useMockData: false` 설정
- [ ] CORS 설정 확인
- [ ] API URL 설정 확인
- [ ] 네트워크 연결 테스트
- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 토큰 저장/복원 테스트
- [ ] 자동 로그인 테스트

## 다음 단계

실제 API 연결이 완료되면:

1. **추가 API 서비스 구현**:
   - UserApiService (사용자 관리)
   - GameApiService (게임 관련)
   - FriendApiService (친구 관리)
   - NotificationApiService (알림)

2. **WebSocket 연결**: 실시간 기능 구현

3. **성능 최적화**: 캐싱, 재시도 로직 등

4. **에러 처리 개선**: 사용자 친화적 에러 메시지

5. **테스트 코드 작성**: API 서비스 단위 테스트
