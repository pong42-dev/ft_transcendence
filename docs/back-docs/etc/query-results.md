# Game Read Queries and Results

## 🔎 Player Query
### 📌 getPlayerById(playerId: number)
: Retrieves player information by player ID.
```json
{
  "id": 1,
  "type": "user",
  "user_id": 101,
  "display_name": "Player1",
  "created_at": "2025-06-30T12:00:00Z"
}
```

### 📌 getPlayerByUserId(userId: number)
: Retrieves player information by user ID.
```json
{
  "id": 1,
  "type": "user",
  "user_id": 101,
  "display_name": "Player1",
  "created_at": "2025-06-30T12:00:00Z"
}
```
---
## 🔎 Game Information Query
### 📌 getGameById(gameId: number)
: Retrieves game information by game ID.
```json
{
  "id": 10,
  "type": "local_1v1",
  "status": "finished",
  "winner_id": 1,
  "started_at": "2025-06-30T10:00:00Z",
  "ended_at": "2025-06-30T10:30:00Z"
}
```

### 📌 getGameParticipants(gameId: number)
: Retrieves participant information for a specific game ID.
```json
[
  {
    "id": 1,
    "type": "user",
    "user_id": 101,
    "display_name": "Player1",
    "score": 11
  },
  {
    "id": 2,
    "type": "ai",
    "user_id": null,
    "display_name": "AI_Player",
    "score": 7
  }
]
```
---
## 🔎 1v1 Game History Query
### 📌 getUser1v1History(userId: number)
: Retrieves 1v1 game history for a specific user ID. Only completed games are returned, including opponent information and scores.
```json
[
  {
    "endedAt": "2025-06-30T10:30:00Z",
    "opponent": {
      "id": 2,
      "type": "ai",
      "user_id": null,
      "display_name": "AI_Player"
    },
    "myScore": 11,
    "opponentScore": 7,
    "winnerId": 1
  }
]
```
---