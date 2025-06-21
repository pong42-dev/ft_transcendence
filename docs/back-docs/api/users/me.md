
# 🧾 User Profile API

**User Profile APIs**
Endpoints for retrieving and updating user profile information, including display name (nickname) and avatar image.

---

## 📌 `/me` \[GET]

**🔍 Retrieve authenticated user’s profile and activity statistics**

---

### ✅ Request

* **Method**: `GET`
* **Content-Type**: `application/json`
* **Headers**:

  * `Authorization`: `Bearer <token>` (✅ required)

---

### ✅ Response

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "User Profile successfully retrieved.",
  "data": {
    "me": {
      "name": "6666",
      "avatar": "uploads/avatar/07d4fd03-a4ca-4704-9bcf-1c12ef4095ec.png"
    }
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
  "msg": "An internal server error occurred while retrieving the user profile.'"
}
```

---

### 🧩 Additional Notes

* **Authentication**: Required via `preHandler: authenticate`
* **Error Logging**: All errors are logged internally using Fastify logger
* **Includes Stats**: Follows logic in `getUserProfileWithStats()` repository method

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