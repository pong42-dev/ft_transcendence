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
  <GameResponseDtoSchema>
  ```
  Returns the created game details.

- **400 Bad Request**
  ```json
  {
    "message": "Error message describing invalid input"
  }
  ```
  Validation errors (e.g., wrong player count for selected mode).

- **500 Internal Server Error**
  ```json
  {
    "message": "An internal server error occurred."
  }
  ```

### Notes

- Validates player counts based on game mode (`local_1v1`, `ai_1v1`, etc.).
- Injects `gameRepository` into `GameManager`.
- Authentication is planned but currently disabled for testing.

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
  <GameResponseDtoSchema>
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
    "message": "An internal server error occurred."
  }
  ```

### Notes

- Optional `reason` is logged for auditing.
- Ensures the session exists before cancellation.
- Authentication is planned but currently disabled.

---

## DELETE `/api/games/:gameId`

**Description**  
Deletes a game session and optionally updates its status in the database.

### Request

- **Method**: `DELETE`
- **Path**: `/api/games/:gameId`
- **Path Parameters**:
  - `gameId` (string) – ID of the game session to delete.

### Responses

- **200 OK**
  ```json
  {
    "message": "Game session has been deleted.",
    "gameId": "<deletedGameId>"
  }
  ```

- **404 Not Found**
  ```json
  {
    "message": "Game not found"
  }
  ```

- **500 Internal Server Error**
  ```json
  {
    "message": "An internal server error occurred."
  }
  ```

### Notes

- Removes session from `GameManager`.
- Optionally updates the game status to `'finished'` via `gameRepository`.

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
  <GameResponseDtoSchema>
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
    "message": "An internal server error occurred."
  }
  ```

### Notes

- Checks active session in `GameManager`. Falls back to database lookup if absent.
- Authentication is planned but currently disabled.
