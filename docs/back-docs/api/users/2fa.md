
---

# 🔐 2FA API Summary (Fastify Plugin)

This plugin provides Two-Factor Authentication (2FA) functionality for users, including:

* Initializing 2FA (QR code + secret + temporary token)
* Enabling 2FA
* Verifying OTP token
* Disabling 2FA

---

## 📌 `POST /2fa/enable/init`

**Description**:
Initializes 2FA setup by generating a QR code, a secret, and a temporary token for the authenticated user.

### ✅ Request

* **Authentication required** (`authenticate`)
* No body

### ✅ Response

* **200 OK**

  ```json
  {
    "success": true,
    "msg": "QR code for 2FA setup has been generated.",
    "data": {
      "qrCodeUrl": "data:image/png;base64,...",
      "secret": "xxxxxxxxxxxxxxxx",
      "token": "temp-token"
    }
  }
  ```
* **401 Unauthorized**

  ```json
  { "msg": "Unauthorized" }
  ```
* **404 Not Found**

  ```json
  { "msg": "User not found." }
  ```
* **500 Internal Server Error**

  ```json
  { "msg": "An internal server error occurred during 2FA setup." }
  ```

---

## 📌 `POST /2fa/enable`

**Description**:
Validates the OTP code and enables 2FA for the authenticated user.

### ✅ Request

```json
{
  "token": "123456",
  "tmpToken": "temp-token"
}
```

* **Authentication required**
* **OTP + temporary token required**

### ✅ Response

* **200 OK**

  ```json
  {
    "success": true,
    "msg": "2FA has been enabled successfully."
  }
  ```
* **401 Unauthorized**

  ```json
  { "msg": "Unauthorized" }
  ```
* **404 Not Found**

  ```json
  { "msg": "User not found." }
  ```
* **409 Conflict**

  ```json
  { "msg": "This account already has 2FA enabled. Please disable it before setting up again." }
  ```
* **500 Internal Server Error**

  ```json
  { "msg": "An internal server error occurred during 2FA setup." }
  ```

### 🧩 Notes

* Uses `verify2FAToken` pre-handler to validate both the OTP and the temporary token.
* Updates the database to set `is_enabled = true`.

---

## 📌 `POST /2fa`

**Description**:
Verifies the OTP and temporary token during login and issues an access token.

### ✅ Request

```json
{
  "token": "123456",
  "tmpToken": "temp-token"
}
```

### ✅ Response

* **200 OK**

  ```json
  {
    "success": true,
    "msg": "Successfully logged in.",
    "data": {
      "token": "<access-token>"
    }
  }
  ```
* **401 Unauthorized**

  ```json
  { "msg": "Unauthorized" }
  ```
* **404 Not Found**

  ```json
  { "msg": "User not found." }
  ```
* **409 Conflict**

  ```json
  { "msg": "2FA not enabled." }
  ```
* **500 Internal Server Error**

  ```json
  { "msg": "An internal server error occurred." }
  ```

### 🧩 Notes

* Uses `verify2FAToken` pre-handler.
* Issues new JWT access token using `loginManager.login()`.

---

## 📌 `POST /2fa/disable`

**Description**:
Disables 2FA for the authenticated user using a real-time OTP (no temporary token allowed).

### ✅ Request

```json
{
  "token": "123456"
}
```

* **Authentication required**
* **OTP only required (no tmpToken)**

### ✅ Response

* **200 OK**

  ```json
  {
    "success": true,
    "msg": "2FA has been disabled successfully."
  }
  ```
* **401 Unauthorized**

  ```json
  { "msg": "Unauthorized" }
  ```
* **404 Not Found**

  ```json
  { "msg": "User not found." }
  ```
* **409 Conflict**

  ```json
  { "msg": "This account already has 2FA disabled. Please enable it before setting up again." }
  ```
* **500 Internal Server Error**

  ```json
  { "msg": "An internal server error occurred during 2FA setup." }
  ```

### 🧩 Notes

* Uses `verify2FATokenWithoutTmpToken` pre-handler.
* Deletes user’s 2FA data from DB (disabling 2FA).

---

## 🔧 Internal Components Summary

| Component                       | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `authenticate`                  | Validates that the user is logged in           |
| `verify2FAToken`                | Validates OTP + temporary token                |
| `verify2FATokenWithoutTmpToken` | Validates OTP only (no temporary token)        |
| `twoFAManager.init2FA()`        | Generates QR code, secret, and temporary token |
| `loginManager.login()`          | Issues access token after login                |
| `user2FARepository`             | Access to 2FA-related DB operations            |

---

