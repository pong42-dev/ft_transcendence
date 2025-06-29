# Game WebSocket DTO Documentation

## Overview
This document provides detailed information about the WebSocket DTOs (Data Transfer Objects) used for communication between the client and server.

---

## 📌 WSPlayerInputMessage

### ✅ Description
Message sent from the client to the server to indicate player input.

### 📥 Fields
| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `type`      | string | ✅        | Fixed value: `player_input`     |
| `data`      | object | ✅        | Contains player input details   |
| `data.playerId` | number | ✅        | ID of the player                |
| `data.input`    | object | ✅        | Player input (e.g., `UP`, `DOWN`) |

---

## 📌 WSPlayerReadyMessage

### ✅ Description
Message sent from the client to the server to indicate player readiness.

### 📥 Fields
| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `type`      | string | ✅        | Fixed value: `player_ready`     |
| `data`      | object | ✅        | Contains readiness details      |
| `data.playerId` | number | ✅        | ID of the player                |

---

## 📌 WSGameStateMessage

### ✅ Description
Message sent from the server to the client to provide the current game state.

### 📥 Fields
| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `type`      | string | ✅        | Fixed value: `game_state`       |
| `data`      | object | ✅        | Contains game state details     |
| `data.ball` | object | ✅        | Ball position                   |
| `data.paddles` | object | ✅        | Paddle positions                |
| `data.scores` | object | ✅        | Player scores                   |

---

## 📌 WSGameEventMessage

### ✅ Description
Message sent from the server to the client to indicate game events.

### 📥 Fields
| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `type`      | string | ✅        | Fixed value: `game_event`       |
| `data`      | object | ✅        | Contains event details          |
| `data.event` | string | ✅        | Event type (e.g., `game_end`)   |
| `data.data` | object | Optional | Additional event data           |

---

## 📌 WSErrorMessage

### ✅ Description
Message sent from the server to the client to indicate errors.

### 📥 Fields
| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `type`      | string | ✅        | Fixed value: `error`            |
| `data`      | object | ✅        | Contains error details          |
| `data.message` | string | ✅        | Error message                   |
| `data.code` | string | Optional | Error code                      |

---

## 📌 WSConnectionStatusMessage

### ✅ Description
Message sent from the server to the client to indicate connection status.

### 📥 Fields
| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `type`      | string | ✅        | Fixed value: `connection_status`|
| `data`      | object | ✅        | Contains connection details     |
| `data.status` | string | ✅        | Connection status (`connected`, `disconnected`, `reconnected`) |
| `data.gameId` | string | ✅        | ID of the game session          |
| `data.playerId` | number | Optional | ID of the player                |
| `data.message` | string | Optional | Additional connection message   |

---

## 📌 WSClientMessage

### ✅ Description
Union type for all client-to-server messages.

### 📥 Fields
| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `type`      | string | ✅        | Message type (`player_input`, `player_ready`) |
| `data`      | object | ✅        | Message-specific data           |

---

## 📌 WSServerMessage

### ✅ Description
Union type for all server-to-client messages.

### 📥 Fields
| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `type`      | string | ✅        | Message type (`game_state`, `game_event`, `error`, `connection_status`) |
| `data`      | object | ✅        | Message-specific data           |

---