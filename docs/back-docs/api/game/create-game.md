# 🎮 Create Game API

**Description**: Create a new game session with support for different game modes (1v1, vs_ai, tournament).

---

## 📌 `POST /api/games`

### ✅ Request

* **No authentication required** (temporarily disabled for testing)
* **Content-Type**: `application/json`

#### 🎯 1v1 Mode (Local Multiplayer)
```json
{
  "player1": {
    "id": "player1_id",
    "name": "Player 1",
    "type": "user",
    "user_id": 123
  },
  "player2": {
    "id": "player2_id", 
    "name": "Player 2",
    "type": "guest",
    "guest_name": "Guest Player"
  },
  "gameMode": "1v1"
}
```

#### 🤖 VS AI Mode
```json
{
  "player1": {
    "id": "user_id",
    "name": "Human Player", 
    "type": "user",
    "user_id": 123
  },
  "gameMode": "vs_ai"
}
```
*Note: In vs_ai mode, AI player is automatically added as player1 (left), and the human player becomes player2 (right)*

#### 🏆 Tournament Mode (Not Implemented)
```json
{
  "gameMode": "tournament"
}
```
*Note: Tournament mode is not yet implemented and will return a 400 error*

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `player1` | Player | ✅ | First player information |
| `player2` | Player | ❌ | Second player information (required for 1v1 mode) |
| `gameMode` | string | ❌ | Game mode: `"1v1"`, `"vs_ai"`, or `"tournament"` (default: `"1v1"`) |

#### Player Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique player identifier |
| `name` | string | ✅ | Player display name |
| `type` | string | ✅ | Player type: `"user"`, `"guest"`, or `"ai"` |
| `user_id` | number | ❌ | Database user ID (required if type is `"user"`) |
| `guest_name` | string | ❌ | Guest display name (required if type is `"guest"`) |

#### Game Mode Rules

- **1v1**: Requires both `player1` and `player2`
- **vs_ai**: Requires only `player1` (AI is automatically added as the opponent)
- **tournament**: Not implemented yet (returns 400 error)

---

### ✅ Response

#### ▶ Success (HTTP 201)

```json
{
  "success": true,
  "msg": "Game created successfully",
  "data": {
    "gameId": "game_1_1735018415123",
    "status": "waiting",
    "playerCount": 2,
    "canStart": true
  }
}
```

#### ▶ Bad Request (HTTP 400)

**Missing required players:**
```json
{
  "msg": "1v1 mode requires 2 players"
}
```

**Invalid AI mode usage:**
```json
{
  "msg": "vs_ai mode should have only 1 player (AI will be added automatically)"
}
```

**Tournament not implemented:**
```json
{
  "msg": "Tournament mode is not implemented yet"
}
```

**Invalid schema:**
```json
{
  "msg": "body must have required property 'player1'"
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "Failed to create game"
}
```

---

### 🧩 Notes

* Game ID is automatically generated with format: `game_{counter}_{timestamp}`
* Game status starts as `"waiting"` and transitions to other states
* **1v1 Mode**: Both players are required and added to the game session
* **VS AI Mode**: Only one human player is required; AI is automatically added as player1 (left), human becomes player2 (right)
* **Tournament Mode**: Not yet implemented
* Game mode defaults to `"1v1"` if not specified
* Game session includes 60fps game loop ready to start
* Authentication is temporarily disabled for testing purposes

---

### 📝 Example Usage

#### 🎯 1v1 Local Game
```javascript
// Create a user vs guest game
const response = await fetch('/api/games', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    player1: {
      id: 'user_123',
      name: 'John Doe',
      type: 'user',
      user_id: 123
    },
    player2: {
      id: 'guest_456',
      name: 'Guest Player',
      type: 'guest',
      guest_name: 'Anonymous'
    },
    gameMode: '1v1'
  })
});

const result = await response.json();
console.log(result);
// Output: { success: true, msg: "Game created successfully", data: { gameId: "game_1_...", ... } }
```

#### 🤖 VS AI Game
```javascript
// Create a human vs AI game
const response = await fetch('/api/games', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    player1: {
      id: 'user_123',
      name: 'Human Player',
      type: 'user',
      user_id: 123
    },
    gameMode: 'vs_ai'
  })
});

const result = await response.json();
console.log(result);
// Output: { success: true, msg: "Game created successfully", data: { gameId: "game_2_...", playerCount: 2, ... } }
// AI is automatically added as player1 (left), human becomes player2 (right)
```

#### ❌ Error Cases
```javascript
// 1v1 mode with only one player
const errorResponse1 = await fetch('/api/games', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    player1: { id: 'user_123', name: 'John', type: 'user', user_id: 123 },
    gameMode: '1v1'  // Missing player2!
  })
});
// Response: { msg: "1v1 mode requires 2 players" }

// vs_ai mode with two players
const errorResponse2 = await fetch('/api/games', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    player1: { id: 'user_123', name: 'John', type: 'user', user_id: 123 },
    player2: { id: 'user_456', name: 'Jane', type: 'user', user_id: 456 },
    gameMode: 'vs_ai'  // Should have only one player!
  })
});
// Response: { msg: "vs_ai mode should have only 1 player (AI will be added automatically)" }
```
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    player1: {
      id: 'user_123',
      name: 'John Doe',
      type: 'user',
      user_id: 123
    },
    player2: {
      id: 'guest_456',
      name: 'Guest Player',
      type: 'guest',
      guest_name: 'Anonymous'
    },
    gameMode: '1v1'
  })
});

const result = await response.json();
console.log('Game ID:', result.data.gameId);
```
