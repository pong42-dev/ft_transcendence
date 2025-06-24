# 🎮 Create Game API

**Description**: Create a new game session with two players.

---

## 📌 `POST /api/games`

### ✅ Request

* **No authentication required**
* **Content-Type**: `application/json`

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

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `player1` | Player | ✅ | First player information |
| `player2` | Player | ✅ | Second player information |
| `gameMode` | string | ❌ | Game mode: `"1v1"` or `"tournament"` (default: `"1v1"`) |

#### Player Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique player identifier |
| `name` | string | ✅ | Player display name |
| `type` | string | ✅ | Player type: `"user"` or `"guest"` |
| `user_id` | number | ❌ | Database user ID (required if type is `"user"`) |
| `guest_name` | string | ❌ | Guest display name (required if type is `"guest"`) |

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

```json
{
  "msg": "Invalid request body or missing required fields"
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
* Both players are automatically added to the game session
* Game mode defaults to `"1v1"` if not specified
* Maximum of 2 players per game session
* Game session includes 60fps game loop ready to start

---

### 📝 Example Usage

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
console.log('Game ID:', result.data.gameId);
```
