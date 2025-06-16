---

## 📌 `/api/users/me/friends` \[GET]

Endpoint for **retrieving the list of friends** for the authenticated user.

---

### ✅ Request

* **Content-Type**: `application/json`
* **Method**: `GET`
* **Authentication**: ✅ Required (`Bearer <token>`)

---

### 📥 Expected Headers

| Header          | Value            | Required | Description |
| --------------- | ---------------- | -------- | ----------- |
| `Authorization` | `Bearer <token>` | ✅        | JWT token   |

---

### ✅ Response

### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Friend list successfully retrieved.",
  "data": {
    "friends": [
      {
        "user_id": "string",
        "name": "string",
        "avatar": "string",
		"status": "boolean",
      }
    ]
  }
}
```

### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while retrieving friend list."
}
```

---

### 🧩 Additional Notes

* Only friends with valid profiles are returned.
* Uses `friendsRepository.getRowsByColumnValue()` internally.
* Returns enriched profile data via `userProfilesRepository`.

---

## 📌 `/api/users/me/friends` \[POST]

Endpoint for **following a user** by their display name.

---

### ✅ Request

* **Content-Type**: `application/json`
* **Method**: `POST`
* **Authentication**: ✅ Required

---

### 📥 Expected Body

```json
{
  "friend_name": "username"
}
```

| Field         | Type   | Required | Description                        |
| ------------- | ------ | -------- | ---------------------------------- |
| `friend_name` | string | ✅        | Display name of the user to follow |

---

### ✅ Response

### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Successfully followed the user."
}
```

### ▶ Conflict (HTTP 409)

```json
{ "msg": "User does not exist." }
```

```json
{ "msg": "You are already following this user." }
```

### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while following the user."
}
```

---

### 🧩 Additional Notes

* Checks if the user exists before following.
* Prevents duplicate follow actions.

---

## 📌 `/api/users/me/friends/:id` \[GET]

Endpoint for **retrieving a friend's profile** with stats by their ID.

---

### ✅ Request

* **Method**: `GET`
* **Authentication**: ✅ Required

---

### 📥 Expected Path Params

| Param | Type   | Required | Description      |
| ----- | ------ | -------- | ---------------- |
| `id`  | string | ✅        | Friend’s user ID |

---

### ✅ Response

### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Friend list successfully retrieved.",
  "data": {
    "friends": [
      {
        "user_id": 3,
        "name": "6666",
        "avatar": "uploads/avatar/07d4fd03-a4ca-4704-9bcf-1c12ef4095ec.png",
        "status": true
      }
    ]
  }
}
```

### ▶ Not Found (HTTP 404)

```json
{
  "msg": "User not found."
}
```

### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while retrieving the user profile."
}
```

---

## 📌 `/api/users/me/friends/:id` \[DELETE]

Endpoint for **unfollowing a user** by their ID.

---

### ✅ Request

* **Method**: `DELETE`
* **Authentication**: ✅ Required

---

### 📥 Expected Path Params

| Param | Type   | Required | Description                  |
| ----- | ------ | -------- | ---------------------------- |
| `id`  | string | ✅        | Friend’s user ID to unfollow |

---

### ✅ Response

### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Successfully unfollowed the user."
}
```

### ▶ Conflict (HTTP 409)

```json
{ "msg": "Invalid friend ID." }
```

```json
{ "msg": "You are not following this user." }
```

### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while unfollowing the user."
}
```

---

### 🧩 Additional Notes

* Validates follow status before deletion.
* Ensures the user is not unfollowing themselves.

---

