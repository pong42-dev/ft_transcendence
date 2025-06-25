
# 🧾 User Profile API

**User Profile APIs**
Endpoints for retrieving and managing user profile information — change nickname, avatar image, and display avatar image.

---

## 📌 `/me` \[GET]

**🔍 Retrieve authenticated user’s profile and activity statistics**

---

### ✅ Request

* **Method**: `GET`
* **URL**: `/api/users/me`
* **Headers**:

  * `Authorization`: `Bearer <token>` ✅ *Required*

---

### ✅ Response

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "User Profile successfully retrieved.",
  "data": {
    "userInfo": {
      "email": "user@example.com",
      "name": "username",
      "avatar": "http://localhost:3000/public/2345260e-635c-47e5-9648-2597fb864860.png",
      "twoFA": true
    }
  }
}
```

#### ▶ Unauthorized (HTTP 401)

```json
{
  "msg": "Unauthorized"
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

### 🧩 Additional Notes

* **Authentication Required**: Uses `preHandler: authenticate`
* **Avatar URL**: Automatically generated using user ID
* **2FA Status**: Returns `twoFA: true` if enabled in DB
* **Stats / Match History**: (🚧 *Planned*) Data like games, wins, 1v1 and tournament history is prepared but commented in current implementation
* **Logging**: All server errors are logged via Fastify logger
* **Schema Validation**: Fastify uses TypeBox for schema enforcement

---

## 📌 `/me/name` \[PATCH]

**✏️ Update authenticated user’s display name (nickname)**

---

### ✅ Request

* **Method**: `PATCH`
* **Content-Type**: `application/json`
* **Headers**:

  * `Authorization`: `Bearer <token>` (✅ required)
* **Body**:

| Field  | Type   | Required | Description             |
| ------ | ------ | -------- | ----------------------- |
| `name` | string | ✅        | New display name to set |

---

### 🔸 Example (JavaScript – `fetch`)

```js
const res = await fetch('/me/name', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_access_token'
  },
  body: JSON.stringify({ name: 'NewNickname' })
});
const data = await res.json();
```

---

### ✅ Response

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Name has been updated."
}
```

#### ▶ Duplicate Name (HTTP 200)

```json
{
  "success": false,
  "msg": "This name is already registered"
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while processing the nickname update."
}
```

---

### 🧩 Additional Notes

* **Rate Limiting**: Max 5 requests per minute
* **Authentication**: Required via `authenticate` preHandler
* **Duplicate Check**: `userProfilesRepository.checkDupRow("name", newName)`
* **Update Logic**: Updates via `userProfilesRepository.updateRowByColumn()`
* **Error Logging**: Uses Fastify’s built-in logger

---

## 📌 `/me/avatar` \[PUT]

**🖼️ Update authenticated user’s avatar (profile image)**

---

### ✅ Request

* **Method**: `PUT`
* **Content-Type**: `multipart/form-data`
* **Headers**:

  * `Authorization`: `Bearer <token>` (✅ required)
* **Body**:

  * `avatar`: image file (png, jpeg, etc.)

---

### 🔸 Example (JavaScript – `fetch` + FormData)

```js
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

const res = await fetch('/me/avatar', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer your_access_token'
  },
  body: formData
});
const data = await res.json();
```

---

### ✅ Response

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Avatar has been successfully updated."
}
```

#### ▶ Invalid Format (HTTP 200)

```json
{
  "success": false,
  "msg": "Invalid avatar format."
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while updating the avatar."
}
```

---

### 🧩 Additional Notes

* **Rate Limiting**: Max 5 requests per minute
* **Authentication**: Required via `authenticate` preHandler
* **Validation**:

  * File type and size checked
  * Only image formats allowed
* **Storage**:

  * Deletes existing avatar if present
  * Saves to configured upload directory
* **Error Logging**: Fastify logger handles internal logs

---

## 📌 `/avatar` \[GET]

**🖼️ Retrieve avatar image of the authenticated user**

---

### ✅ Request

* **Method**: `GET`
* **Headers**:

  * `Authorization`: `Bearer <token>` (✅ required)

---

### ✅ Response

#### ▶ Success (HTTP 200)

* Returns the user's avatar image as binary (e.g., PNG, JPEG)
* `Content-Type` will match the file type (`image/png`, `image/jpeg`, etc.)

```
<binary image stream>
```

#### ▶ Not Found (HTTP 404)

```json
{
  "msg": "User not found."
}
```

```json
{
  "msg": "Avatar image not found."
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while retrieving the avatar."
}
```

---

### 🧩 Additional Notes

* **Authentication**: Required via `authenticate` preHandler
* **Default Fallback**: If `avatar` field is `null`, defaults to `uploads/avatar.webp`
* **Validation**:

  * Checks whether the file exists on the file system
* **Streaming**: Uses `fs.createReadStream()` to stream the file
* **Logging**: Internal errors are logged via Fastify’s logger

---
