# 🚀 Start Game API

**Description**: Start a game session and begin the 60fps game loop.

---

## 📌 `POST /api/games/:id/start`

### ✅ Request

* **No authentication required**
* **Method**: `POST`
* **URL Parameters**:
  * `:id` - Game ID (string, required)
* **Content-Type**: `application/json`
* **Body**: Empty `{}` or no body required

**Example**: `POST /api/games/game_1_1735018415123/start`

---

### ✅ Response

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Game started successfully",
  "data": {
    "gameId": "game_1_1735018415123",
    "status": "playing",
    "startTime": 1735018420000,
    "playerCount": 2,
    "gameState": {
      "game_id": "game_1_1735018415123",
      "ball": {
        "x": 400,
        "y": 300
      },
      "paddles": {
        "left": { "y": 250 },
        "right": { "y": 250 }
      },
      "score": {
        "left": 0,
        "right": 0
      },
      "round": 1,
      "status": "playing",
      "timestamp": 1735018420000
    }
  }
}
```

#### ▶ Bad Request (HTTP 400)

```json
{
  "msg": "Cannot start game: insufficient players or invalid state"
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
  "msg": "Failed to start game"
}
```

---

### 📊 Response Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `gameId` | string | Unique game identifier |
| `status` | string | New game status (should be `"playing"`) |
| `startTime` | number | Unix timestamp when game started |
| `playerCount` | number | Number of players in the game |
| `gameState` | GameState | Initial game state after start |

---

### 🧩 Notes

* Game must have exactly 2 players to start
* Game status changes from `"waiting"` to `"playing"`
* 60fps game loop begins immediately after successful start
* Ball starts at center position (400, 300) with random direction
* Paddles start at center vertical position
* Score and round counters reset to initial values
* Game state updates will be available via polling or WebSocket

---

### ⚠️ Prerequisites

* Game must exist (created via `POST /api/games`)
* Game must have 2 players
* Game must not already be started
* Game must not be finished or cancelled

---

### 📝 Example Usage

```javascript
// Start a game
async function startGame(gameId) {
  try {
    const response = await fetch(`/api/games/${gameId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Game started!', result.data);
      // Begin polling for game state updates
      startGameStatePolling(gameId);
    } else {
      console.error('Failed to start game:', result.msg);
    }
  } catch (error) {
    console.error('Error starting game:', error);
  }
}

// Usage
startGame('game_1_1735018415123');
```

---

### 🔄 Game Loop Details

Once started, the game:
1. Runs at 60fps (16.67ms intervals)
2. Updates ball and paddle positions
3. Detects collisions and scoring
4. Broadcasts state changes
5. Handles round transitions
6. Determines match winner
7. Auto-ends when match is complete
