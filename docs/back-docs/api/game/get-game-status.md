# 🔍 Get Game Status API

**Description**: Retrieve current game status, state, and player information.

---

## 📌 `GET /api/games/:id`

### ✅ Request

* **No authentication required**
* **Method**: `GET`
* **URL Parameters**:
  * `:id` - Game ID (string, required)

**Example**: `GET /api/games/game_1_1735018415123`

---

### ✅ Response

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Game status retrieved successfully",
  "data": {
    "gameId": "game_1_1735018415123",
    "status": "playing",
    "gameMode": "1v1",
    "playerCount": 2,
    "players": [
      {
        "id": "user_123",
        "name": "John Doe",
        "type": "user",
        "user_id": 123
      },
      {
        "id": "guest_456", 
        "name": "Guest Player",
        "type": "guest",
        "guest_name": "Anonymous"
      }
    ],
    "gameState": {
      "game_id": "game_1_1735018415123",
      "ball": {
        "x": 400,
        "y": 300
      },
      "paddles": {
        "left": { "y": 250 },
        "right": { "y": 280 }
      },
      "score": {
        "left": 2,
        "right": 1
      },
      "round": 3,
      "status": "playing",
      "timestamp": 1735018420000
    },
    "canvasSize": {
      "width": 800,
      "height": 600
    },
    "duration": 45000
  }
}
```

#### ▶ Not Found (HTTP 404)

```json
{
  "msg": "Game not found"
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "Failed to retrieve game status"
}
```

---

### 📊 Response Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `gameId` | string | Unique game identifier |
| `status` | string | Current game status: `waiting`, `starting`, `playing`, `paused`, `finished` |
| `gameMode` | string | Game mode: `1v1` or `tournament` |
| `playerCount` | number | Number of players in the game |
| `players` | Player[] | Array of player objects |
| `gameState` | GameState | Current game state (ball, paddles, score, etc.) |
| `canvasSize` | object | Game canvas dimensions |
| `duration` | number | Game duration in milliseconds |

#### GameState Object

| Field | Type | Description |
|-------|------|-------------|
| `game_id` | string | Game identifier |
| `ball` | object | Ball position `{x, y}` |
| `paddles` | object | Paddle positions `{left: {y}, right: {y}}` |
| `score` | object | Current score `{left, right}` |
| `round` | number | Current round number |
| `status` | string | Game state status: `playing`, `round_end`, `game_end` |
| `timestamp` | number | Unix timestamp of state update |

---

### 🧩 Notes

* This endpoint can be polled for real-time game state updates
* Game state is updated at 60fps during active gameplay
* Ball and paddle positions are in canvas coordinates
* Score represents rounds won by each player
* Duration is calculated from game start time
* WebSocket integration recommended for real-time updates

---

### 📝 Example Usage

```javascript
// Poll game status
async function pollGameStatus(gameId) {
  const response = await fetch(`/api/games/${gameId}`);
  const result = await response.json();
  
  if (result.success) {
    console.log('Game Status:', result.data.status);
    console.log('Score:', result.data.gameState.score);
    console.log('Ball Position:', result.data.gameState.ball);
  }
}

// Poll every 100ms for smooth updates
setInterval(() => pollGameStatus('game_1_1735018415123'), 100);
```
