
---

# 👤 User API Summary (Fastify Plugin)

This plugin provides user-related functionality including:

* User Registration (with avatar upload)
* Local Login (with 2FA integration)
* Logout (with cookie clearing and token revocation)

---

## 📌 `POST /register`

**Description**:
Registers a new user using form-data. Accepts email, password, name, and avatar file.

### ✅ Request

* **No authentication required**
* **Content-Type**: `multipart/form-data`

| Field      | Type   | Required | Description              |
| ---------- | ------ | -------- | ------------------------ |
| `email`    | string | ✅        | User's email             |
| `password` | string | ✅        | User's password          |
| `name`     | string | ✅        | Display name             |
| `avatar`   | file   | ✅        | Avatar image file upload |

### ✅ Response

* **200 OK** – Validation failed

```json
{
  "success": false,
  "msg": "Validation error message"
}
```

* **201 Created**

```json
{
  "msg": "Registration completed successfully."
}
```

* **500 Internal Server Error**

```json
{
  "msg": "An internal server error occurred during registration."
}
```

### 🧩 Notes

* Validates for duplicate email and name
* Saves avatar to configured directory
* Password is securely hashed before saving
* Status is set to `false` by default

---

## 📌 `POST /local`

**Description**:
Authenticates a user using local credentials. If 2FA is enabled, returns a temporary token for OTP validation.

### ✅ Request

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

### ✅ Response

* **200 OK**

  * If 2FA is **not required**:

  ```json
  {
    "success": true,
    "msg": "Login successful.",
    "data": {
      "token": "access-token"
    }
  }
  ```

  * If 2FA **is required**:

  ```json
  {
    "success": true,
    "requires2FA": true,
    "msg": "Two-factor authentication is required.",
    "data": {
      "token": "temporary-token"
    }
  }
  ```

* **401 Unauthorized**

```json
{
  "msg": "Email or password is incorrect."
}
```

* **409 Conflict**

```json
{
  "msg": "Conflict error."
}
```

* **500 Internal Server Error**

```json
{
  "msg": "An internal server error occurred during login."
}
```

### 🧩 Notes

* Checks for existence of user and provider type
* Verifies password match
* Invokes `require2FA()` to determine if 2FA is needed
* Calls `loginManager.login()` if no 2FA required

---

## 📌 `POST /logout`

**Description**:
Logs out an authenticated user. Validates refresh token cookie, revokes tokens, and clears session.

### ✅ Request

* **Authentication required** (`authenticate`)
* **Required cookie**: `refresh_token`
* **Authorization header** required: `Bearer <access-token>`

### ✅ Response

* **200 OK**

```json
{
  "success": true,
  "msg": "Successfully logged out."
}
```

* **404 Not Found**

```json
{
  "msg": "user not found"
}
```

* **500 Internal Server Error**

```json
{
  "msg": "An internal server error occurred during logout."
}
```

### 🧩 Notes

* Compares refresh token from cookie with hashed token in DB
* If user used Google OAuth2, the refresh token is revoked
* Deletes server tokens and temporary 2FA tokens from DB
* Calls `clearCookie()` to remove cookie from client
* Updates user status to `false`

---

## 🔧 Internal Components Summary

| Component                   | Purpose                                         |
| --------------------------- | ----------------------------------------------- |
| `usersRepository`           | Handles CRUD for users table                    |
| `userProfilesRepository`    | Manages display name, avatar, and status info   |
| `userTokensRepository`      | Stores refresh tokens (server + Google)         |
| `passwordManager`           | Hashes and compares passwords and tokens        |
| `tmpTokenRepository`        | Stores temporary tokens used for 2FA login flow |
| `loginManager`              | Issues access/refresh JWT tokens                |
| `googleOAuth2Manager`       | Revokes Google refresh tokens                   |
| `authenticate`              | Auth middleware to ensure valid access token    |
| `saveFile()`                | Handles file saving (avatar)                    |
| `isValidRegisterFormData()` | Validates user registration form fields         |

---
