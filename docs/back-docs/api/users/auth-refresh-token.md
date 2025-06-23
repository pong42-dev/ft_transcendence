
---

# 👤 User API Summary (Fastify Plugin)

This plugin provides user-related functionality including:

* Refreshing access tokens using refresh tokens stored in cookies

---

## 📌 `POST /refresh-token`

**Description**:
Refreshes the JWT access token using a valid refresh token sent in the cookies.

### ✅ Request

* **No authentication header required**

* **Requires cookie**: `refresh_token=abc123;`

* **Headers**

| Name   | Type   | Required | Description                                                     |
| ------ | ------ | -------- | --------------------------------------------------------------- |
| cookie | string | ✅        | Contains the refresh token cookie in `refresh_token=...` format |

### ✅ Response

* **200 OK**

```json
{
  "success": true,
  "msg": "Token refreshed successfully.",
  "data": {
    "accessToken": "<new-access-token>"
  }
}
```

* **401 Unauthorized**

```json
{
  "msg": "Invalid or expired token."
}
```

### 🧩 Notes

* Extracts the `refresh_token` from the request cookies.
* Verifies the refresh token JWT payload.
* Compares the refresh token (plaintext) with the stored hashed token in the database using `passwordManager.comparePassword()`.
* Signs and returns a new access token if validation passes.
* Returns 401 if token is missing, invalid, expired, or does not match stored hash.
* Rate limited to 5 requests per minute.

---

## 🔧 Internal Components Summary

| Component              | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `userTokensRepository` | Fetches stored hashed refresh tokens from DB  |
| `passwordManager`      | Compares plaintext and hashed tokens securely |
| `fastify.jwt`          | Verifies and signs JWT tokens                 |

---
