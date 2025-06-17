
# 2FA API

This plugin provides Two-Factor Authentication (2FA) functionality for the Fastify server.
It supports enabling 2FA, verifying 2FA tokens, and disabling 2FA for users.

---

## 📌 `POST /2fa/enable`

Enable 2FA for the authenticated user.
Generates and returns a QR code URL for setting up 2FA.

---

### ✅ Request

* **Content-Type**: `application/json`
* **Method**: `POST`
* **Headers**:

  * Requires authentication (e.g., Bearer token)
* **Body**: None

---

### ✅ Response

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "QR code for 2FA setup has been generated.",
  "data": {
    "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

#### ▶ User Not Found (HTTP 404)

```json
{
  "msg": "User not found."
}
```

#### ▶ Unauthorized (HTTP 401)

```json
{
  "msg": "Unauthorized"
}
```

#### ▶ Internal Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during 2FA setup."
}
```

---

### 🧩 Notes

* User must be authenticated (`authenticate` middleware applied).
* If a previous 2FA secret exists, it will be deleted and replaced with a new one.
* The secret is generated using `speakeasy`, and a QR code image URL is created using `qrcode`.

---

## 📌 `POST /2fa`

Verify the provided 2FA token.

---

### ✅ Request

* **Content-Type**: `application/json`
* **Method**: `POST`
* **Headers**:

  * Requires authentication
* **Body**:

| Field | Type   | Required | Description             |
| ----- | ------ | -------- | ----------------------- |
| token | string | Yes      | The OTP token to verify |

---

### ✅ Response

#### ▶ Success - Valid Token (HTTP 200)

```json
{
  "success": true,
  "msg": "valid token"
}
```

#### ▶ Unauthorized (HTTP 401)

```json
{
  "msg": "Unauthorized"
}
```

#### ▶ Internal Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred."
}
```

---

### 🧩 Notes

* Both `authenticate` and `verify2FAToken` middlewares validate the token.
* Returns 200 if the token is valid, otherwise 401 Unauthorized.

---

## 📌 `POST /2fa/disable`

Disable 2FA for the authenticated user.

---

### ✅ Request

* **Content-Type**: `application/json`
* **Method**: `POST`
* **Headers**:

  * Requires authentication
* **Body**: None

---

### ✅ Response

#### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "2FA has been disabled successfully."
}
```

#### ▶ Internal Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during 2FA setup."
}
```
```json
{
  "msg": "An internal server error occurred during 2FA authentication."
}
```

---

### 🧩 Notes

* Requires authentication and valid 2FA token (`authenticate` and `verify2FAToken`).
* Deletes the 2FA secret from the database.

---