# Frontend-Backend 통합 가이드

## 📋 개요
현재 Frontend 애플리케이션에서 Backend API와 연결이 필요한 주요 부분들을 정리한 문서입니다.
Mock 데이터를 사용하고 있는 부분들을 실제 Backend API로 교체해야 합니다.

---

## 🔐 1. 인증 시스템 (AuthService)

### 현재 상태
- `frontend/src/utils/AuthService.ts`에서 하드코딩된 사용자 데이터 사용
- 메모리 기반 mock 인증 시스템

### 필요한 Backend API 엔드포인트
```typescript
// 로그인
POST /api/auth/login
Body: { email: string, password: string }
Response: { user: User, token: string, refreshToken: string }

// 회원가입
POST /api/auth/register  
Body: { email: string, password: string, nickname: string }
Response: { user: User, token: string, refreshToken: string }

// Google OAuth 로그인
POST /api/auth/google
Body: { googleToken: string }
Response: { user: User, token: string, refreshToken: string }

// 토큰 새로고침
POST /api/auth/refresh
Body: { refreshToken: string }
Response: { token: string, refreshToken: string }

// 로그아웃
POST /api/auth/logout
Headers: { Authorization: "Bearer <token>" }
Response: { success: boolean }
```

### 교체가 필요한 코드 위치
- `App.ts` 라인 245-270: `login` 명령어 처리
- `App.ts` 라인 290-340: `register` 명령어 처리
- `App.ts` 라인 260: Google 로그인 처리

---

## 👤 2. 사용자 프로필 및 통계

### 현재 상태
- `UserProfile.ts`에서 랜덤 생성된 mock 통계 데이터 사용
- 하드코딩된 게임 히스토리

### 필요한 Backend API 엔드포인트
```typescript
// 사용자 통계 조회
GET /api/users/:userId/stats
Response: {
  wins: number,
  losses: number,
  winRate: number,
  totalGames: number,
  level: number
}

// 게임 히스토리 조회
GET /api/users/:userId/games
Query: { limit?: number, offset?: number }
Response: {
  games: Array<{
    id: string,
    opponent: string,
    score: string,
    won: boolean,
    mode: string,
    date: string,
    duration: number
  }>
}

// 프로필 업데이트
PUT /api/users/:userId/profile
Body: { nickname?: string, avatar?: File }
Response: { user: User }

// 사용자 검색
GET /api/users/search/:nickname
Response: { user: User | null }
```

### 교체가 필요한 코드 위치
- `UserProfile.ts` 전체 컴포넌트
- `App.ts` 라인 370-400: `profile` 명령어 처리
- `App.ts` 라인 450-470: 닉네임 변경 처리

---

## 🎮 3. 게임 시스템

### 현재 상태
- 게임 결과가 저장되지 않음
- 로컬 상태로만 관리

### 필요한 Backend API 엔드포인트
```typescript
// 게임 시작
POST /api/games/start
Body: {
  mode: 'vs_ai' | 'local' | 'tournament',
  opponents: string[],
  settings?: GameSettings
}
Response: { gameId: string, gameState: GameState }

// 게임 결과 저장
POST /api/games/:gameId/result
Body: {
  winner: 'left' | 'right',
  leftScore: number,
  rightScore: number,
  accuracy: number,
  rallyLength: number,
  duration: number
}
Response: { success: boolean, stats: UserStats }

// 토너먼트 생성
POST /api/tournaments
Body: { players: string[], name?: string }
Response: { tournamentId: string, bracket: TournamentBracket }

// 토너먼트 매치 결과 업데이트
PUT /api/tournaments/:tournamentId/matches/:matchId
Body: { winner: string, score: string }
Response: { tournament: Tournament, nextMatch?: Match }
```

### 교체가 필요한 코드 위치
- `App.ts` 라인 60-80: `handleGameEnd` 메서드
- `App.ts` 라인 350-365: `play` 명령어 처리
- `GameModal.ts`: 게임 시작 처리 로직

---

## 👥 4. 친구 시스템

### 현재 상태
- `AuthService`에서 메모리 기반 친구 목록 관리
- 하드코딩된 친구 데이터

### 필요한 Backend API 엔드포인트
```typescript
// 친구 목록 조회
GET /api/friends
Headers: { Authorization: "Bearer <token>" }
Response: { friends: Friend[] }

// 친구 요청 보내기
POST /api/friends/request
Body: { targetUserId: string }
Response: { success: boolean }

// 친구 요청 응답
PUT /api/friends/request/:requestId
Body: { accepted: boolean }
Response: { success: boolean, friend?: Friend }

// 친구 차단/차단해제
PUT /api/friends/:friendId/block
Body: { blocked: boolean }
Response: { success: boolean }

// 친구 삭제
DELETE /api/friends/:friendId
Response: { success: boolean }
```

### 교체가 필요한 코드 위치
- `App.ts` 라인 500-580: `friend` 명령어 전체 처리
- `AuthService.ts`: 친구 관련 모든 메서드들

---

## 🔔 5. 알림 시스템

### 현재 상태
- `NotificationCenter`에서 수동 테스트 알림만 생성
- 실시간 알림 없음

### 필요한 Backend API 엔드포인트
```typescript
// 알림 목록 조회
GET /api/notifications
Headers: { Authorization: "Bearer <token>" }
Response: { notifications: Notification[] }

// 알림 읽음 처리
PUT /api/notifications/:notificationId/read
Headers: { Authorization: "Bearer <token>" }
Response: { success: boolean }

// 모든 알림 읽음 처리
PUT /api/notifications/read-all
Headers: { Authorization: "Bearer <token>" }
Response: { success: boolean }
```

### WebSocket 이벤트
```typescript
// 실시간 알림 수신
ws://backend-url/notifications
Events:
- 'friend_request': 친구 요청 알림
- 'game_invite': 게임 초대 알림
- 'game_result': 게임 결과 알림
```

### 교체가 필요한 코드 위치
- `App.ts` 라인 520-550: `notify` 명령어 처리
- `NotificationCenter.ts`: 전체 알림 관리 시스템

---

## 🔐 6. 2FA (Two-Factor Authentication)

### 현재 상태
- 하드코딩된 인증 코드 ('123456')
- 실제 인증 시스템 없음

### 필요한 Backend API 엔드포인트
```typescript
// 2FA 활성화
POST /api/auth/2fa/enable
Headers: { Authorization: "Bearer <token>" }
Response: { qrCode: string, backupCodes: string[] }

// 2FA 인증 코드 확인
POST /api/auth/2fa/verify
Body: { code: string }
Headers: { Authorization: "Bearer <token>" }
Response: { success: boolean }

// 2FA 비활성화
POST /api/auth/2fa/disable
Body: { code: string }
Headers: { Authorization: "Bearer <token>" }
Response: { success: boolean }
```

### 교체가 필요한 코드 위치
- `App.ts` 라인 200-220: 2FA 코드 입력 처리
- `App.ts` 라인 480-500: 2FA 설정 명령어 처리

---

## 📁 7. 파일 업로드 (아바타)

### 현재 상태
- `FileModal`에서 로컬 파일 URL 생성
- 실제 서버 업로드 없음

### 필요한 Backend API 엔드포인트
```typescript
// 아바타 업로드
POST /api/users/avatar
Headers: { Authorization: "Bearer <token>" }
Body: FormData { avatar: File }
Response: { avatarUrl: string }

// 아바타 삭제
DELETE /api/users/avatar
Headers: { Authorization: "Bearer <token>" }
Response: { success: boolean }
```

### 교체가 필요한 코드 위치
- `App.ts` 라인 330-340: 회원가입 시 아바타 업로드
- `App.ts` 라인 470-480: 아바타 변경 처리

---

## 🚀 8. 실시간 게임 동기화 (WebSocket)

### 현재 상태
- 로컬 게임만 지원
- 멀티플레이어 동기화 없음

### 필요한 WebSocket 연결
```typescript
// 게임 상태 동기화
ws://backend-url/game/:gameId
Events:
- 'paddle_move': 패들 움직임 동기화
- 'ball_position': 공 위치 동기화
- 'score_update': 점수 업데이트
- 'game_end': 게임 종료
```

### 교체가 필요한 코드 위치
- `PongGame.ts`: 멀티플레이어 모드 전체
- `GameModal.ts`: 게임 시작 시 WebSocket 연결

---

## ⚡ 9. 우선순위별 구현 권장사항

### Phase 1 (필수)
1. **인증 시스템** - 로그인/회원가입/로그아웃
2. **사용자 프로필** - 기본 정보 조회/수정
3. **게임 결과 저장** - 기본 통계 수집

### Phase 2 (중요)
4. **친구 시스템** - 친구 추가/관리
5. **알림 시스템** - 기본 알림 기능
6. **파일 업로드** - 아바타 업로드

### Phase 3 (고급)
7. **2FA 시스템** - 보안 강화
8. **실시간 게임** - WebSocket 기반 멀티플레이어
9. **실시간 알림** - WebSocket 기반 실시간 알림

---

## 📝 참고사항

### 현재 Backend 구조 확인
- Backend는 이미 `/backend/src/routes/api/users/` 구조로 설정됨
- Knex.js 기반 데이터베이스 설정 완료
- JWT 토큰 시스템 구현됨

### Frontend에서 추가해야 할 파일들
1. `src/services/ApiService.ts` - API 통신 담당
2. `src/services/WebSocketService.ts` - WebSocket 연결 관리
3. `src/config/environment.ts` - 환경 설정
4. `src/types/api.ts` - API 응답 타입 정의
