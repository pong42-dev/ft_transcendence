
# 🔐 2FA API Summary (Fastify Plugin)

This plugin provides Two-Factor Authentication (2FA) functionality for users, including:

* Initializing 2FA (QR code + secret + temporary token)
* Enabling 2FA
* Verifying OTP token
* Disabling 2FA

---

## 📌 `POST /2fa/enable/init`

**Description**:
Initializes 2FA setup by generating a QR code, a secret, and a hashed temporary token for the authenticated user.

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

* **409 Conflict**

```json
{ "msg": "This account already has 2FA enabled. Please disable it before setting up again." }
```

* **500 Internal Server Error**

```json
{ "msg": "An internal server error occurred during 2FA setup." }
```

---

## 📌 `POST /2fa/enable`

**Description**:
Validates the OTP code and hashed temporary token, and enables 2FA for the authenticated user.

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

---

## 📌 `POST /2fa`

**Description**:
Verifies the OTP and hashed temporary token during login and issues an access token.

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

```json
{
  "success": true,
  "msg": "Successfully logged in. Your previous session has been terminated.':'Successfully logged in.",
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

---

## 📌 `POST /2fa/disable`

**Description**:
Disables 2FA for the authenticated user using a real-time OTP (no temporary token used).

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

---

## 🔧 Internal Components Summary

| Component                                      | Purpose                                        |
| ---------------------------------------------- | ---------------------------------------------- |
| `authenticate`                                 | Validates that the user is logged in           |
| `verify2FATokenWithTmpToken`                   | Validates OTP + plain temporary token          |
| `verify2FATokenWithHashedTmpToken`             | Validates OTP + hashed temporary token         |
| `verify2FATokenWithoutTmpToken`                | Validates OTP only (no temporary token)        |
| `twoFAManager.init2FA()`                       | Generates QR code, secret, and temporary token |
| `twoFAManager.cleanExpired2FA()`               | Deletes expired temporary tokens               |
| `loginManager.login()`                         | Issues access token after login                |
| `user2FARepository`                            | Access to 2FA-related DB operations            |

---
