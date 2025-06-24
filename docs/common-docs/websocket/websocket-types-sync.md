# Game WebSocket Types Sync

이 문서는 백엔드와 프론트엔드 간 게임 WebSocket 타입 동기화를 관리합니다.

## 📁 타입 위치

- **백엔드**: `/backend/srcs/src/schemas/game-websocket.ts` (WebSocket 전용 스키마)
- **백엔드**: `/backend/srcs/src/schemas/games.ts` (기본 게임 스키마)
- **프론트엔드**: `/frontend/src/types/game-websocket.ts`

## 🔄 동기화 규칙

### 1. 메시지 타입 변경 시
백엔드에서 WebSocket 메시지 스키마를 변경하면 **반드시** 프론트엔드 타입도 업데이트해야 합니다.

### 2. 변경 체크리스트
- [ ] 백엔드 WebSocket 스키마 변경 (`schemas/game-websocket.ts`)
- [ ] 백엔드 기본 게임 스키마 변경 (`schemas/games.ts`, 필요시)
- [ ] 프론트엔드 타입 동기화 (`types/game-websocket.ts`)
- [ ] 양쪽 TypeScript 컴파일 확인
- [ ] WebSocket 통신 테스트

### 3. 주요 타입들

| 타입 | 방향 | 설명 |
|------|------|------|
| `WSPlayerInputMessage` | Client → Server | 플레이어 입력 |
| `WSGameStateMessage` | Server → Client | 게임 상태 업데이트 |
| `WSGameEndMessage` | Server → Client | 게임 종료 |
| `WSErrorMessage` | Server → Client | 에러 메시지 |

## 🚨 동기화 실패 시 증상

- TypeScript 컴파일 오류
- WebSocket 메시지 파싱 실패
- 런타임에서 알 수 없는 메시지 타입 오류

## 🔧 자동화 개선 방안 (향후)

```bash
# 타입 동기화 검증 스크립트
npm run validate-types

# 백엔드에서 프론트엔드 타입 자동 생성
npm run generate-frontend-types
```

## 📝 변경 로그

- `2025-06-24`: WebSocket 스키마 분리
  - `schemas/games.ts`에서 `schemas/game-websocket.ts`로 WebSocket 관련 스키마 분리
  - 관심사 분리로 코드 가독성 및 관리성 향상
- `2025-06-24`: 초기 게임 WebSocket 타입 구조 정의
  - 플레이어 입력, 게임 상태, 게임 종료 메시지 타입
  - 백엔드 TypeBox 스키마와 프론트엔드 TypeScript 인터페이스 동기화
