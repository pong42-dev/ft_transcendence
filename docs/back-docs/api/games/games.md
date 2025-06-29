# Games API Specification

This document describes the endpoints for managing game sessions.

---

## POST `/api/games`

**Description**  
Creates a new game session.

### Request

- **Method**: `POST`
- **Path**: `/api/games`
- **Content-Type**: `application/json`
- **Body Schema**: `CreateGameRequestDtoSchema`
  - Defines the parameters required to create a game (e.g., game mode, player information).

### Responses

- **201 Created**
  ```json
  {
    "gameId": "string",
    "status": "waiting",
    "type": "string",
    "players": [
      {
        "id": "number",
        "type": "string",
        "name": "string"
      }
    ]
  }
  ```
  Returns the created game details.

- **400 Bad Request**
  ```json
  {
    "message": "Invalid input data: <error details>"
  }
  ```
  Validation errors (e.g., wrong player count for selected mode).

- **500 Internal Server Error**
  ```json
  {
    "message": "Internal server error"
  }
  ```

### Notes

- Validates player counts based on game mode (`local_1v1`, `ai_1v1`, etc.).
- Injects `gameRepository` into `GameManager`.
- Authentication is planned but currently disabled for testing.

### Expected Form Fields

| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `type`      | string | ✅        | Game mode (`local_1v1`, `ai_1v1`, `tournament`) |
| `players`   | array  | ✅        | Array of player objects         |

#### Player Object
| Field         | Type   | Required | Description                     |
|---------------|--------|----------|---------------------------------|
| `type`        | string | ✅        | Player type (`user`, `guest`, `ai`) |
| `userId`      | number | Optional | User ID (required for `user` type) |
| `displayName` | string | Optional | Display name (required for `guest` type) |

---

## GET `/api/games/:gameId`

**Description**  
Retrieves the current status of a game session.

### Request

- **Method**: `GET`
- **Path**: `/api/games/:gameId`
- **Path Parameters**:
  - `gameId` (string) – ID of the game session to retrieve.

### Responses

- **200 OK**
  ```json
  {
    "gameId": "string",
    "status": "string",
    "type": "string",
    "players": [
      {
        "id": "number",
        "type": "string",
        "name": "string"
      }
    ]
  }
  ```
  Returns session details including:
  - `gameId` (string)
  - `status` (string)
  - `type` (string)
  - `players` (array)

- **404 Not Found**
  ```json
  {
    "message": "Game not found"
  }
  ```

- **500 Internal Server Error**
  ```json
  {
    "message": "Internal server error"
  }
  ```

### Notes

- Checks active session in `GameManager`. Falls back to database lookup if absent.
- Authentication is planned but currently disabled.

---

## POST `/api/games/:gameId/cancel`

**Description**  
Cancels an existing game session.

### Request

- **Method**: `POST`
- **Path**: `/api/games/:gameId/cancel`
- **Content-Type**: `application/json`
- **Path Parameters**:
  - `gameId` (string) – ID of the game session to cancel.
- **Body Schema**:
  ```ts
  {
    reason?: 'user_exit' | 'page_unload' | 'network_error' | 'manual_cancel'
  }
  ```

### Responses

- **200 OK**
  ```json
  {
    "gameId": "string",
    "status": "canceled",
    "type": "string",
    "players": [
      {
        "id": "number",
        "type": "string",
        "name": "string"
      }
    ]
  }
  ```
  Returns the updated game session details.

- **404 Not Found**
  ```json
  {
    "message": "Game not found"
  }
  ```

- **500 Internal Server Error**
  ```json
  {
    "message": "Internal server error"
  }
  ```

### Notes

- Optional `reason` is logged for auditing.
- Ensures the session exists before cancellation.
- Authentication is planned but currently disabled.

### Expected Form Fields

| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `gameId`    | string | ✅        | ID of the game session          |
| `reason`    | string | Optional | Reason for cancellation (`user_exit`, `page_unload`, `network_error`, `manual_cancel`) |

---
