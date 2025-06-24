# ❌ Cancel Game API

**Description**: Cancel an active or waiting game session. Different from delete - this handles user exits during gameplay.

---

## 📌 `POST /api/games/:id/cancel`

### ✅ Request

* **No authentication required**
* **Method**: `POST`
* **URL Parameters**:
  * `:id` - Game ID (string, required)
* **Content-Type**: `application/json`

```json
{
  "reason": "user_exit",
  "playerId": "user_123"
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | ✅ | Cancellation reason: `"user_exit"`, `"page_unload"`, `"network_error"` |
| `playerId` | string | ❌ | ID of player who initiated the cancellation |

---

### ✅ Response

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Game cancelled successfully",
  "data": {
    "gameId": "game_1_1735018415123",
    "status": "finished",
    "reason": "user_exit",
    "cancelledBy": "user_123",
    "cancelTime": 1735018450000,
    "finalResult": {
      "game_id": "game_1_1735018415123",
      "winner": "user_456",
      "final_score": {
        "left": 2,
        "right": 1
      },
      "duration": 30000,
      "end_reason": "disconnect"
    }
  }
}
```

#### ▶ Not Found (HTTP 404)

```json
{
  "msg": "Game not found"
}
```

#### ▶ Bad Request (HTTP 400)

```json
{
  "msg": "Invalid cancellation reason or game cannot be cancelled"
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "Failed to cancel game"
}
```

---

### 📊 Response Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `gameId` | string | Unique game identifier |
| `status` | string | New game status (should be `"finished"`) |
| `reason` | string | Cancellation reason provided in request |
| `cancelledBy` | string | Player ID who cancelled (if provided) |
| `cancelTime` | number | Unix timestamp when game was cancelled |
| `finalResult` | GameResult | Final game result object |

#### GameResult Object

| Field | Type | Description |
|-------|------|-------------|
| `game_id` | string | Game identifier |
| `winner` | string | Winner player ID (other player if one cancelled) |
| `final_score` | object | Final score `{left, right}` |
| `duration` | number | Game duration in milliseconds |
| `end_reason` | string | End reason: `"disconnect"`, `"timeout"`, etc. |

---

### 🧩 Notes

* Cancelling stops the 60fps game loop immediately
* The remaining player is automatically declared winner
* Game result is saved with `end_reason` reflecting the cancellation
* Game session is scheduled for cleanup after 30 seconds
* Different from DELETE - cancel handles graceful user exits
* Can be called during any game state (waiting, playing, paused)

---

### 🔄 Cancellation Reasons

| Reason | Description | Use Case |
|--------|-------------|----------|
| `user_exit` | Player deliberately left | User clicks "Leave Game" button |
| `page_unload` | Browser page closed/refreshed | Browser `beforeunload` event |
| `network_error` | Connection lost | Network connectivity issues |

---

### 📝 Example Usage

```javascript
// Cancel game when user leaves
async function cancelGame(gameId, playerId, reason = 'user_exit') {
  try {
    const response = await fetch(`/api/games/${gameId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason,
        playerId: playerId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Game cancelled:', result.data);
      // Handle winner announcement
      showGameCancelledModal(result.data.finalResult);
    }
  } catch (error) {
    console.error('Error cancelling game:', error);
  }
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (currentGameId && currentPlayerId) {
    // Use sendBeacon for reliable delivery
    navigator.sendBeacon(`/api/games/${currentGameId}/cancel`, 
      JSON.stringify({
        reason: 'page_unload',
        playerId: currentPlayerId
      })
    );
  }
});
```
