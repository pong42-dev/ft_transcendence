---

# 🏆 Tournament API Summary (Fastify Plugin)

This plugin provides tournament-related functionality including:

* Tournament Creation and Management
* Tournament Bracket Generation
* Match Management and Progress Tracking
* Participant Management
* Tournament History and Statistics

---

## 📌 `POST /api/tournaments`

**Description**:
Creates a new 4-player tournament with automatic bracket generation.

### ✅ Request

* **Authentication**: Optional (for testing)
* **Content-Type**: `application/json`

```json
{
  "participants": [
    {
      "type": "user",
      "userId": 4,
      "displayName": "User1"
    },
    {
      "type": "guest",
      "displayName": "Guest1"
    },
    {
      "type": "guest",
      "displayName": "Guest2"
    },
    {
      "type": "guest",
      "displayName": "Guest3"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `participants` | array | ✅ | Array of 4 participants |
| `participants[].type` | string | ✅ | "user" or "guest" |
| `participants[].userId` | number | ✅ | User ID (for user type) |
| `participants[].displayName` | string | ✅ | Display name (for guest type) |

### ✅ Response

* **201 Created**

```json
{
  "id": 1,
  "status": "waiting",
  "winner_player_id": null,
  "created_at": "2025-06-29T13:10:49.074Z",
  "ended_at": null
}
```

* **400 Bad Request**

```json
{
  "message": "Tournament must have exactly 4 participants"
}
```

* **500 Internal Server Error**

```json
{
  "message": "Internal server error"
}
```

### 🧩 Notes

* Creates tournament with "waiting" status
* Automatically generates bracket (4강 → 결승)
* Validates exactly 1 user + 3 guest participants
* Uses transaction for data consistency

---

## 📌 `GET /api/tournaments`

**Description**:
Retrieves all tournaments in the system.

### ✅ Request

* **Authentication**: Optional (for testing)
* **Method**: `GET`

### ✅ Response

* **200 OK**

```json
[
  {
    "id": 1,
    "status": "waiting",
    "winner_player_id": null,
    "created_at": "2025-06-29T13:10:49.074Z",
    "ended_at": null
  }
]
```

* **500 Internal Server Error**

```json
{
  "message": "Internal server error"
}
```

---

## 📌 `GET /api/tournaments/:tournamentId`

**Description**:
Retrieves detailed information about a specific tournament.

### ✅ Request

* **Authentication**: Optional (for testing)
* **Method**: `GET`
* **URL**: `/api/tournaments/1`

### ✅ Response

* **200 OK**

```json
{
  "id": 1,
  "status": "waiting",
  "winner_player_id": null,
  "created_at": "2025-06-29T13:10:49.074Z",
  "ended_at": null,
  "participants": [
    {
      "id": 1,
      "display_name": "mgd",
      "user_id": 4,
      "type": "user"
    }
  ]
}
```

* **404 Not Found**

```json
{
  "message": "Tournament not found"
}
```

---

## 📌 `GET /api/tournaments/user/history`

**Description**:
Retrieves tournament history for the currently authenticated user.

### ✅ Request

* **Authentication**: Required (`authenticate`)
* **Method**: `GET`
* **Headers**: `Authorization: Bearer <token>`

### ✅ Response

* **200 OK**

```json
[
  {
    "id": 1,
    "status": "waiting",
    "created_at": "2025-06-29T13:10:49.074Z",
    "ended_at": null,
    "winner_player_id": null,
    "participants": [
      {
        "id": 1,
        "display_name": "mgd",
        "user_id": 4,
        "type": "user"
      }
    ]
  }
]
```

* **401 Unauthorized**

```json
{
  "message": "Unauthorized"
}
```

* **500 Internal Server Error**

```json
{
  "message": "Internal server error"
}
```

---

## 📌 `GET /api/tournaments/history/user/:userId`

**Description**:
Retrieves tournament history for a specific user (Admin/Management API).

### ✅ Request

* **Authentication**: Optional (for testing)
* **Method**: `GET`
* **URL**: `/api/tournaments/history/user/4`

### ✅ Response

* **200 OK**

```json
[
  {
    "id": 1,
    "status": "waiting",
    "created_at": "2025-06-29T13:10:49.074Z",
    "ended_at": null,
    "winner_player_id": null,
    "participants": [
      {
        "id": 1,
        "display_name": "mgd",
        "user_id": 4,
        "type": "user"
      }
    ]
  }
]
```

* **404 Not Found**

```json
{
  "message": "User not found"
}
```

* **500 Internal Server Error**

```json
{
  "message": "Internal server error"
}
```

---

## 📌 `GET /api/tournaments/:tournamentId/matches`

**Description**:
Retrieves the bracket/matches for a specific tournament.

### ✅ Request

* **Authentication**: Optional (for testing)
* **Method**: `GET`
* **URL**: `/api/tournaments/1/matches`

### ✅ Response

* **200 OK**

```json
[
  {
    "id": 1,
    "round_number": 1,
    "status": "waiting",
    "participants": [
      {
        "id": 1,
        "display_name": "mgd",
        "user_id": 4,
        "type": "user",
        "score": 0
      },
      {
        "id": 2,
        "display_name": "Guest1",
        "user_id": null,
        "type": "guest",
        "score": 0
      }
    ],
    "winner_id": null,
    "started_at": null
  }
]
```

* **404 Not Found**

```json
{
  "message": "Tournament not found"
}
```

---

## 📌 `GET /api/tournaments/:tournamentId/progress`

**Description**:
Retrieves the current progress and status of a tournament.

### ✅ Request

* **Authentication**: Optional (for testing)
* **Method**: `GET`
* **URL**: `/api/tournaments/1/progress`

### ✅ Response

* **200 OK**

```json
{
  "tournament_id": 1,
  "status": "waiting",
  "current_match": null,
  "next_matches": [
    {
      "id": 1,
      "round_number": 1,
      "status": "waiting",
      "participants": [
        {
          "id": 1,
          "display_name": "mgd",
          "user_id": 4
        }
      ],
      "winner_id": null,
      "started_at": null
    }
  ],
  "completed_matches": [],
  "participants": [
    {
      "id": 1,
      "display_name": "mgd",
      "user_id": 4,
      "eliminated": false
    }
  ]
}
```

---

## 📌 `POST /api/tournaments/:tournamentId/matches/:matchId/start`

**Description**:
Starts a specific match in a tournament.

### ✅ Request

* **Authentication**: Optional (for testing)
* **Method**: `POST`
* **URL**: `/api/tournaments/1/matches/1/start`

### ✅ Response

* **200 OK**

```json
{
  "message": "Match started successfully",
  "gameId": "tournament-1-match-1"
}
```

* **404 Not Found**

```json
{
  "message": "Match not found"
}
```

* **409 Conflict**

```json
{
  "message": "Match is not in waiting status"
}
```

---

## 📌 `POST /api/tournaments/:tournamentId/matches/:matchId/end`

**Description**:
Ends a specific match and records the winner.

### ✅ Request

* **Authentication**: Optional (for testing)
* **Method**: `POST`
* **URL**: `/api/tournaments/1/matches/1/end`
* **Body**:

```json
{
  "winnerId": 1
}
```

### ✅ Response

* **200 OK**

```json
{
  "message": "Match ended successfully",
  "nextMatchId": 3
}
```

* **404 Not Found**

```json
{
  "message": "Match not found"
}
```

* **409 Conflict**

```json
{
  "message": "Match is not in playing status"
}
```

---

## 📌 `PATCH /api/tournaments/:tournamentId/cancel`

**Description**:
Cancels a tournament that hasn't started yet.

### ✅ Request

* **Authentication**: Optional (for testing)
* **Method**: `PATCH`
* **URL**: `/api/tournaments/1/cancel`

### ✅ Response

* **200 OK**

```json
{
  "message": "Tournament canceled successfully"
}
```

* **404 Not Found**

```json
{
  "message": "Tournament not found"
}
```

* **400 Bad Request**

```json
{
  "message": "Cannot cancel tournament that is already ended or canceled"
}
```

---

## 📌 `GET /api/tournaments/:tournamentId/participants`

**Description**:
Retrieves the list of participants for a specific tournament.

### ✅ Request

* **Authentication**: Optional (for testing)
* **Method**: `GET`
* **URL**: `/api/tournaments/1/participants`

### ✅ Response

* **200 OK**

```json
[
  {
    "id": 1,
    "display_name": "mgd",
    "user_id": 4,
    "type": "user",
    "created_at": "2025-06-29T13:10:49.080Z"
  }
]
```

---

## 🔧 Internal Components Summary

| Component | Purpose |
|-----------|---------|
| `tournamentsRepository` | Handles CRUD for tournaments table |
| `matchesRepository` | Manages tournament matches and brackets |
| `playersRepository` | Manages tournament participants |
| `gameParticipantsRepository` | Links games with participants |

---

## 🎮 Tournament Flow

1. **Tournament Creation**: 4 participants → waiting status
2. **Bracket Generation**: 4강 → 결승 자동 생성
3. **Match Progression**: waiting → playing → completed
4. **Winner Advancement**: 승자 → 다음 라운드 진출
5. **Tournament Completion**: 최종 우승자 결정

---

## 📊 Tournament States

| State | Description |
|-------|-------------|
| `waiting` | 토너먼트 생성됨, 대기 중 |
| `in-progress` | 토너먼트 진행 중 |
| `ended` | 토너먼트 완료 |
| `canceled` | 토너먼트 취소됨 |

---

## 🏆 Match States

| State | Description |
|-------|-------------|
| `waiting` | 매치 대기 중 |
| `playing` | 매치 진행 중 |
| `completed` | 매치 완료 |

---

## 📋 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/tournaments` | Create tournament | ❌ |
| `GET` | `/api/tournaments` | Get all tournaments | ❌ |
| `GET` | `/api/tournaments/:id` | Get tournament details | ❌ |
| `GET` | `/api/tournaments/user/history` | Get current user history | ✅ |
| `GET` | `/api/tournaments/history/user/:userId` | Get specific user history | ❌ |
| `GET` | `/api/tournaments/:id/matches` | Get tournament matches | ❌ |
| `GET` | `/api/tournaments/:id/participants` | Get tournament participants | ❌ |
| `POST` | `/api/tournaments/:id/participants` | Add participant | ❌ |
| `POST` | `/api/tournaments/:id/bracket` | Generate bracket | ❌ |
| `PATCH` | `/api/tournaments/:id/cancel` | Cancel tournament | ❌ |
| `POST` | `/api/tournaments/:id/matches/:matchId/start` | Start match | ❌ |
| `POST` | `/api/tournaments/:id/matches/:matchId/end` | End match | ❌ |

---

## 🚧 Planned Features

* **Real-time Updates**: WebSocket integration for live tournament progress
* **Tournament Statistics**: Win/loss ratios, rankings
* **Tournament Types**: Single elimination, double elimination
* **Spectator Mode**: Watch ongoing matches
* **Tournament Chat**: Real-time communication between participants 