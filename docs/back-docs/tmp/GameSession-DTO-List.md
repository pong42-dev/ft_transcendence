# GameSession DTO 목록

> **임시 문서**: GameSession 구현 완료 후 삭제 예정
> 
> **목적**: schemas/games.ts 구현 시 참고용

## 📝 GameSession에서 사용되는 DTO 목록

### **1. 입력 DTO들**

#### **Player** (플레이어 정보)
```typescript
interface Player {
  id: string;                    // 플레이어 고유 ID
  type: 'user' | 'guest';       // 유저 타입
  user_id?: number;             // 실제 유저 ID (user 타입인 경우)
  guest_name?: string;          // 게스트 이름 (guest 타입인 경우)
  name: string;                 // 표시용 이름
}
```

#### **PlayerInput** (플레이어 입력)
```typescript
interface PlayerInput {
  player_id: string;            // 플레이어 ID
  action: 'UP' | 'DOWN' | 'NONE'; // 입력 액션
  timestamp: number;            // 입력 시점
}
```

### **2. 출력 DTO들**

#### **GameState** (실시간 게임 상태)
```typescript
interface GameState {
  game_id: string;              // 게임 세션 ID
  ball: { 
    x: number; 
    y: number; 
  };                            // 공 위치
  paddles: { 
    left: { y: number }; 
    right: { y: number }; 
  };                            // 패들 위치들
  score: { 
    left: number; 
    right: number; 
  };                            // 현재 스코어
  round: number;                // 현재 라운드
  status: 'playing' | 'round_end' | 'game_end'; // 게임 상태
  timestamp: number;            // 상태 업데이트 시점
}
```

#### **GameResult** (게임 결과 - 현재 암시적)
```typescript
// getGameResult() 반환 타입 (명시적 interface 필요)
interface GameResult {
  winner: 'left' | 'right';     // 승자
  leftPlayer: {
    ...Player,                  // 플레이어 정보
    score: number;              // 최종 스코어
  };
  rightPlayer: {
    ...Player,
    score: number;
  };
  totalRounds: number;          // 총 라운드 수
  gameMode: 'regular' | 'tournament' | 'demo'; // 게임 모드
}
```

### **3. 콜백 함수 타입들**

#### **GameStateUpdateCallback**
```typescript
type GameStateUpdateCallback = (gameState: GameState) => void;
```

#### **GameEndCallback**
```typescript
type GameEndCallback = (winner: 'left' | 'right', gameResult: GameResult) => void;
```

### **4. 유틸리티 타입들**

#### **Canvas Size**
```typescript
interface CanvasSize {
  width: number; 
  height: number;
}
// getCanvasSize() 반환 타입
```

#### **유니온 타입들**
```typescript
// 플레이어 액션
type ActionType = 'UP' | 'DOWN' | 'NONE';

// 게임 상태
type GameStatus = 'playing' | 'round_end' | 'game_end';

// 플레이어 유형
type PlayerType = 'user' | 'guest';

// 승자 위치
type WinnerType = 'left' | 'right';

// 게임 모드
type GameMode = 'regular' | 'tournament' | 'demo';
```

---

## 🎯 schemas/games.ts 이전 계획

### **우선순위 1: 핵심 DTO**
- `Player` - 플레이어 정보
- `PlayerInput` - 실시간 입력 데이터
- `GameState` - 실시간 게임 상태
- `GameResult` - 게임 결과 (명시적 interface 정의 필요)

### **우선순위 2: 유니온 타입**
- `ActionType`, `GameStatus`, `PlayerType`, `WinnerType`, `GameMode`

### **우선순위 3: 유틸리티 타입**
- `CanvasSize`
- 콜백 타입들 (`GameStateUpdateCallback`, `GameEndCallback`)

---

## 📋 현재 GameSession에서의 사용 위치

### **입력으로 받는 DTO**
- `Player` - `addPlayer()`, `constructor`
- `PlayerInput` - `handlePlayerInput()`

### **출력으로 반환하는 DTO**
- `GameState` - `getGameState()`, WebSocket 브로드캐스트
- `GameResult` - `getGameResult()`, 게임 종료 시
- `CanvasSize` - `getCanvasSize()`

### **내부적으로 사용하는 타입**
- `ActionType` - `playerInputs` Map 값 타입
- `GameMode` - `gameMode` 필드 타입
- `WinnerType` - 승자 판정 시 사용

---

## ⚠️ 주의사항

### **현재 임시 정의된 곳**
```typescript
// GameSession.ts 상단에 임시 정의
interface Player { ... }
interface GameState { ... }
interface PlayerInput { ... }
```

### **이전 후 수정 필요**
```typescript
// schemas/games.ts에서 import로 변경
import { Player, GameState, PlayerInput, GameResult } from '../schemas/games.js';
```

### **TypeBox 스키마 변환 필요**
- 각 interface를 TypeBox의 `Type.Object()` 형태로 변환
- `Static<typeof Schema>` 타입 추출 패턴 적용

---

**생성일**: 2025-06-23  
**용도**: GameSession → schemas/games.ts 마이그레이션 참고  
**삭제 예정**: 구현 완료 후
