# 🎮 Game API Summary

This plugin provides game-related functionality including:

* Game Session Management (Create, Start, Cancel, Delete)
* Real-time Game State Retrieval
* Multiplayer Game Support
* Tournament Integration Ready

---

## 📋 API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/games` | Create a new game session | ❌ |
| `GET` | `/api/games/:id` | Get game status and state | ❌ |
| `POST` | `/api/games/:id/start` | Start a game session | ❌ |
| `POST` | `/api/games/:id/cancel` | Cancel a game session | ❌ |
| `DELETE` | `/api/games/:id` | Delete a game session | ❌ |

---

## 🎯 Game Flow

```
1. Create Game → POST /api/games
2. Add Players → (Players join automatically or via frontend)
3. Start Game → POST /api/games/:id/start
4. Monitor State → GET /api/games/:id (polling or WebSocket)
5. End Game → Game ends automatically or POST /api/games/:id/cancel
6. Cleanup → DELETE /api/games/:id (optional, auto-cleanup after 30s)
```

---

## 📊 Data Models

### Player
```typescript
{
  id: string;           // Unique player identifier
  name: string;         // Display name
  type: 'user' | 'guest' | 'ai';  // Player type
  user_id?: number;     // DB user ID (if type === 'user')
  guest_name?: string;  // Guest name (if type === 'guest')
}
```

### GameMode
```typescript
type GameMode = '1v1' | 'vs_ai' | 'tournament';
```

- **1v1**: Local multiplayer mode (requires 2 players)
- **vs_ai**: AI opponent mode (requires 1 player, AI is added automatically)  
- **tournament**: Tournament mode (requires 4 players, not implemented yet)

### GameState
```typescript
{
  game_id: string;
  ball: { x: number; y: number };
  paddles: {
    left: { y: number };
    right: { y: number };
  };
  score: { left: number; right: number };
  round: number;
  status: 'playing' | 'round_end' | 'game_end';
  timestamp: number;
}
```

### GameResult
```typescript
{
  game_id: string;
  winner: string;       // Winner player ID
  final_score: { left: number; right: number };
  duration: number;     // Game duration in milliseconds
  end_reason: 'normal' | 'disconnect' | 'timeout';
}
```

---

## 🔄 Game Session Lifecycle

1. **waiting** → Game created, waiting for players
2. **starting** → Game is about to start
3. **playing** → Game is active
4. **paused** → Game temporarily paused
5. **finished** → Game completed

---

## 📚 Individual API Documentation

- [Create Game](./create-game.md) - `POST /api/games`
- [Get Game Status](./get-game-status.md) - `GET /api/games/:id`
- [Start Game](./start-game.md) - `POST /api/games/:id/start`
- [Cancel Game](./cancel-game.md) - `POST /api/games/:id/cancel`
- [Delete Game](./delete-game.md) - `DELETE /api/games/:id`

---

## 📁 File Structure

```
/backend/srcs/src/routes/api/game/
├── create.ts            # POST /api/games (게임 생성)
├── status.ts            # GET /api/games/:id (게임 상태 조회)  
├── start.ts             # POST /api/games/:id/start (게임 시작)
├── cancel.ts            # POST /api/games/:id/cancel (게임 취소)
└── delete.ts            # DELETE /api/games/:id (게임 삭제)
```

Each file is a separate Fastify plugin that handles one specific API endpoint, following the same pattern as the users API structure.

---

## 🚀 WebSocket Integration (Coming Soon)

Real-time game state updates will be available via WebSocket:
- Game state broadcasts
- Player input handling
- Spectator mode support
