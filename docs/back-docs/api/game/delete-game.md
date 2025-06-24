# 🗑️ Delete Game API

**Description**: Permanently delete a game session. Used for cleanup after games are completed.

---

## 📌 `DELETE /api/games/:id`

### ✅ Request

* **No authentication required**
* **Method**: `DELETE`
* **URL Parameters**:
  * `:id` - Game ID (string, required)

**Example**: `DELETE /api/games/game_1_1735018415123`

---

### ✅ Response

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Game deleted successfully",
  "data": {
    "gameId": "game_1_1735018415123",
    "deletedAt": 1735018480000,
    "wasActive": false,
    "finalStatus": "finished"
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
  "msg": "Failed to delete game"
}
```

---

### 📊 Response Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `gameId` | string | Unique game identifier that was deleted |
| `deletedAt` | number | Unix timestamp when deletion occurred |
| `wasActive` | boolean | Whether game was still active when deleted |
| `finalStatus` | string | Final status before deletion |

---

### 🧩 Notes

* Permanently removes game session from memory
* If game is still active, it will be stopped before deletion
* Players in active games will lose connection
* No game data recovery after deletion
* Automatic cleanup occurs 30 seconds after game end
* Use CANCEL for graceful game termination during play

---

### ⚠️ Differences from Cancel

| Operation | Purpose | When to Use | Game Loop | Winner |
|-----------|---------|-------------|-----------|---------|
| **Cancel** | Graceful exit | During gameplay, user leaves | Stops gracefully | Other player wins |
| **Delete** | Cleanup | After game finished | Force stops | No winner declared |

---

### 🔄 Automatic Cleanup

Games are automatically deleted:
- 30 seconds after normal completion
- 30 seconds after cancellation
- When server restarts (memory-based storage)

---

### 📝 Example Usage

```javascript
// Delete a finished game
async function deleteGame(gameId) {
  try {
    const response = await fetch(`/api/games/${gameId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Game deleted:', result.data);
      // Remove from UI, clear references
      removeGameFromUI(gameId);
    }
  } catch (error) {
    console.error('Error deleting game:', error);
  }
}

// Manual cleanup after viewing game results
function handleGameResultsClose(gameId) {
  // Give user time to view results, then cleanup
  setTimeout(() => {
    deleteGame(gameId);
  }, 5000);
}
```

---

### 🚨 Force Delete Active Game

```javascript
// Emergency cleanup - stops active game immediately
async function forceDeleteGame(gameId) {
  // Check if game is active first
  const statusResponse = await fetch(`/api/games/${gameId}`);
  const statusResult = await statusResponse.json();
  
  if (statusResult.success && 
      ['waiting', 'playing', 'paused'].includes(statusResult.data.status)) {
    
    console.warn('Deleting active game - players will be disconnected');
    
    // Notify players before deletion
    notifyPlayersGameEnding(statusResult.data.players);
  }
  
  // Proceed with deletion
  await deleteGame(gameId);
}
```

---

### 📋 Best Practices

1. **Use Cancel for user-initiated exits** during gameplay
2. **Use Delete for cleanup** after games are completely finished
3. **Check game status** before deletion to avoid disrupting active games
4. **Implement client-side cleanup** to remove UI references
5. **Handle 404 errors gracefully** - game may have auto-deleted
