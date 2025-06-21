
# 🧾 Friends API

**Authenticated user’s friend management endpoints**
Provides functionality to follow users, retrieve friend lists, view friend profiles, and unfollow users.

---

## 📌 `/api/users/me/friends` \[GET]

**🔍 Retrieve the list of friends for the authenticated user**

---

### ✅ Request

* **Method**: `GET`
* **Content-Type**: `application/json`
* **Authentication**: ✅ Required (`Bearer <token>`)

---

### 📥 Expected Headers

| Header        | Value            | Required | Description      |
| ------------- | ---------------- | -------- | ---------------- |
| Authorization | `Bearer <token>` | ✅        | JWT access token |

---

### ✅ Response

#### ▶ Success (HTTP 200)

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
        "status": true
      }
    ]
  }
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while retrieving friend list."
}
```

---

### 🧩 Additional Notes

* Only valid friend profiles are returned.
* Uses `friendsRepository.getRowsByColumnValue()` internally.
* Enriched with user profile info from `userProfilesRepository`.

---

## 📌 `/api/users/me/friends` \[POST]

**➕ Follow a user by their display name**

---

### ✅ Request

* **Method**: `POST`
* **Content-Type**: `application/json`
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

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Successfully followed the user."
}
```

#### ▶ Conflict – User Not Found (HTTP 409)

```json
{
  "msg": "User does not exist."
}
```

#### ▶ Conflict – Already Following (HTTP 409)

```json
{
  "msg": "You are already following this user."
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while following the user."
}
```

---

### 🧩 Additional Notes

* Verifies user existence before following.
* Prevents duplicate follow attempts.

---

## 📌 `/api/users/me/friends/:id` \[GET]

**👁️ View a specific friend’s profile and status**

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

#### ▶ Success (HTTP 200)

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

#### ▶ Not Found (HTTP 404)

```json
{
  "msg": "User not found."
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while retrieving the user profile."
}
```

---

## 📌 `/api/users/me/friends/:id` \[DELETE]

**❌ Unfollow a user by their ID**

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

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Successfully unfollowed the user."
}
```

#### ▶ Conflict – Invalid ID (HTTP 409)

```json
{
  "msg": "Invalid friend ID."
}
```

#### ▶ Conflict – Not Following (HTTP 409)

```json
{
  "msg": "You are not following this user."
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while unfollowing the user."
}
```

---

### 🧩 Additional Notes

* Validates that the user is currently following the target before deletion.
* Prevents self-unfollow scenarios.

---