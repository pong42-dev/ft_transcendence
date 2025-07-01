
---

# 👤 User Friends API Summary (Fastify Plugin)

This plugin provides user friend management functionality, including:

* Retrieving friend list
* Following a user (adding a friend)
* Getting a friend's profile
* Unfollowing a user (removing a friend)

---

## 📌 `GET /api/users/me/friends`

**Description**:
Retrieves the authenticated user's friend list with their profiles.

### ✅ Request

* **Authentication required** (`Bearer` token)

### ✅ Response

* **200 OK**

```json
{
  "success": true,
  "msg": "Friend list successfully retrieved.",
  "data": 
  {
  {
      "success": true,
      "msg": "Friend Profile successfully retrieved.",
      "data": {
          "friendInfo": {
              "name": "1",
              "avatar": "http://localhost:3000/public/1.png"
          },
          "gameStats": {
              "totalGames": 2,
              "totalWins": 1,
              "winRate": 50
          },
          "oneOnOneHistory": [
              {
                  "endedAt": "2025-07-01T03:00:56.890Z",
                  "opponent": {
                      "id": 3,
                      "type": "user",
                      "name": "User 2"
                  },
                  "myScore": 1,
                  "opponentScore": 2,
                  "winnerId": 3
              },
              {
                  "endedAt": "2025-07-01T03:00:56.890Z",
                  "opponent": {
                      "id": 1,
                      "type": "ai",
                      "name": "AI"
                  },
                  "myScore": 0,
                  "opponentScore": 3,
                  "winnerId": 1
              }
          ],
          "tournHistory": [
              {
                  "tournament_id": 1,
                  "tournament_date": "2025-07-01 02:59:56",
                  "participants": [
                      "User1",
                      "User2",
                      "User3",
                      "User4"
                  ],
                  "rounds": [
                      {
                          "endedAt": "2025-07-01T03:00:56.890Z",
                          "opponent": {
                              "id": 3,
                              "type": "user",
                              "name": "User2"
                          },
                          "myScore": 2,
                          "opponentScore": 1,
                          "winnerId": 2
                      },
                      {
                          "endedAt": "2025-07-01T03:00:56.890Z",
                          "opponent": {
                              "id": 5,
                              "type": "user",
                              "name": "User4"
                          },
                          "myScore": 2,
                          "opponentScore": 1,
                          "winnerId": 2
                      }
                  ],
                  "final_rank": 1
              }
          ]
      }
  },
  }
}
```

* **401 Unauthorized**

```json
{
  "msg": "Unauthorized"
}
```

* **500 Internal Server Error**

```json
{
  "msg": "An internal server error occurred while retrieving friend list."
}
```

---

## 📌 `POST /api/users/me/friends`

**Description**:
Follow another user by their display name.

### ✅ Request

```json
{
  "friend_name": "FriendName"
}
```

* **Authentication required**

### ✅ Response

* **200 OK**

```json
{
  "success": true,
  "msg": "Successfully followed the user."
}
```

* **401 Unauthorized**

```json
{
  "msg": "Unauthorized"
}
```

* **409 Conflict**

```json
{
  "msg": "User does not exist."
}
```

or

```json
{
  "msg": "You are already following this user."
}
```

* **500 Internal Server Error**

```json
{
  "msg": "An internal server error occurred while following the user."
}
```

---

## 📌 `GET /api/users/me/friends/:id`

**Description**:
Retrieve profile and stats of a friend by their user ID.

### ✅ Request

* **Authentication required**
* URL parameter: `id` (friend's user ID)

### ✅ Response

* **200 OK**

```json
{
  "success": true,
  "msg": "Friend Profile successfully retrieved.",
  "data": {
    "userInfo": {
      "name": "username",
      "avatar": "http://localhost:3000/public/2345260e-635c-47e5-9648-2597fb864860.png",
    }
  }
}
```

* **401 Unauthorized**

```json
{
  "msg": "Unauthorized"
}
```

* **404 Not Found**

```json
{
  "msg": "User not found."
}
```

* **409 Conflict**

```json
{
  "msg": "Invalid friend ID."
}
```

or

```json
{
  "msg": "You are not following this user."
}
```

* **500 Internal Server Error**

```json
{
  "msg": "An internal server error occurred while retrieving the user profile."
}
```

---

## 📌 `DELETE /api/users/me/friends/:id`

**Description**:
Unfollow (remove) a friend by their user ID.

### ✅ Request

* **Authentication required**
* URL parameter: `id` (friend's user ID)

### ✅ Response

* **200 OK**

```json
{
  "success": true,
  "msg": "Successfully unfollowed the user."
}
```

* **401 Unauthorized**

```json
{
  "msg": "Unauthorized"
}
```

* **409 Conflict**

```json
{
  "msg": "Invalid friend ID."
}
```

or

```json
{
  "msg": "You are not following this user."
}
```

* **500 Internal Server Error**

```json
{
  "msg": "An internal server error occurred while unfollowing the user."
}
```

---

## 🔧 Internal Components Summary

| Component                | Purpose                                                 |
| ------------------------ | ------------------------------------------------------- |
| `userProfilesRepository` | Retrieves user profiles and statistics                  |
| `friendsRepository`      | Manages friend relationships (follow/unfollow, queries) |
| `authenticate`           | Middleware to verify user authentication                |

---
