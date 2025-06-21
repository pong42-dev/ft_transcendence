# 🧾 User Authentication API

This document outlines the API endpoints related to user authentication and session management. Includes local login, OAuth2 (Google) login, logout, and user registration.

---

## 📌 `/register` \[POST]

**📝 Register a new user account using email, password, display name, and avatar (multipart).**

---

### ✅ Request

* **Method**: `POST`
* **Content-Type**: `multipart/form-data`

---

### 📥 Expected Form Fields

| Field      | Type   | Required | Description                                    |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `email`    | string | ✅        | User's email address                           |
| `password` | string | ✅        | User's password                                |
| `name`     | string | ✅        | User's display name                            |
| `avatar`   | File   | ✅        | Profile image (JPEG, PNG, WEBP, or GIF; ≤ 5MB) |

---

### ✅ Response

#### ▶ Success – Registration Complete (HTTP 201)

```json
{
  "msg": "Registration completed successfully."
}
```

#### ▶ Validation or Duplication Error (HTTP 200)

```json
{ "success": false, "msg": "Invalid email format." }
```

```json
{ "success": false, "msg": "Password must be 8–15 characters, contain upper and lower case letters, digits, and special characters (@#%&!$*)." }
```

```json
{ "success": false, "msg": "Name must be 2–16 characters, using letters, numbers, or Korean characters." }
```

```json
{ "success": false, "msg": "Profile image must be JPEG, PNG, WEBP, or GIF, and <= 5MB." }
```

```json
{ "success": false, "msg": "This email is already registered." }
```

```json
{ "success": false, "msg": "This name is already registered." }
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during registration."
}
```

---

### 🧩 Additional Notes

* **Rate Limiting**: Max 5 requests per minute
* **Avatar Storage**: Path defined via `config.UPLOAD_*`
* **Provider**: Automatically set to `'local'`
* **Security**: Passwords hashed with `passwordManager`
* **Logging**: All failures logged via Fastify logger

---

## 📌 `/local` \[POST]

**🔐 Login with email and password**

---

### ✅ Request

* **Method**: `POST`
* **Content-Type**: `application/json`

---

### 📥 Body Schema

| Field      | Type   | Required | Description        |
| ---------- | ------ | -------- | ------------------ |
| `email`    | string | ✅        | User email address |
| `password` | string | ✅        | User password      |

---

### ✅ Response

#### ▶ Success – Login Completed (HTTP 200)

```json
{
  "success": true,
  "msg": "Successfully logged in.",
  "data": {
    "accessToken": "..." // Returned internally by loginManager
  }
}
```

#### ▶ Unauthorized – Invalid Credentials (HTTP 401)

```json
{
  "msg": "Email or password is incorrect."
}
```

#### ▶ Conflict – Already Logged In (HTTP 409)

```json
{
  "msg": "This account is already in use. Please log out and try again."
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during login."
}
```

---

### 🧩 Additional Notes

* **Rate Limiting**: Max 5 requests per minute
* **Provider Restriction**: Only accepts `provider === 'local'`
* **Validation**: Uses `passwordManager.comparePassword`
* **Session Handling**: Delegated to `loginManager.login()`
* **Logging**: Via Fastify logger

---

## 📌 `/google` \[GET]

**🌐 Redirect to Google OAuth2 login**

---

### ✅ Request

* **Method**: `GET`
* **Query Parameters**: None

---

### ✅ Response

#### ▶ Redirect – Google Login Page (HTTP 302)

* Redirects to the Google OAuth2 authorization URL.

#### ▶ Conflict – Already Logged In (HTTP 409)

```json
{
  "msg": "This account is already in use. Please log out and try again."
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during Google login redirection."
}
```

---

### 🧩 Additional Notes

* Redirect URL generated via `googleOAuth2Manager.getGoogleOAuthUrl()`
* Rate limited to 5 requests per minute
* Logs errors via Fastify logger

---

## 📌 `/google/callback` \[GET]

**📬 Handle callback from Google OAuth2 and log the user in**

---

### ✅ Request

* **Method**: `GET`

---

### 📥 Query Parameters

| Field  | Type   | Required | Description                        |
| ------ | ------ | -------- | ---------------------------------- |
| `code` | string | ✅        | Authorization code from Google API |

---

### ✅ Response

#### ▶ Conflict – Email or Name Already Exists (HTTP 200)

```json
{ "success": false, "msg": "This name is already registered." }
```

```json
{ "success": false, "msg": "This email is already registered." }
```

#### ▶ Redirect – OAuth2 Login Success (HTTP 302)

* Redirects to the client application.
* Tokens and session handled internally.

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during OAuth2 callback."
}
```

---

### 🧩 Additional Notes

* Retrieves token using `googleOAuth2Manager.getTokenFromCode()`
* If user does not exist:

  * Registers user in `usersRepository` and `userProfilesRepository`
  * Downloads and saves avatar using `downloadImageFromUrl()`
* Rejects if existing email belongs to different provider
* Logs everything via Fastify logger

---

## 📌 `/logout` \[POST]

**🚪 Log the user out and clear session/token**

---

### ✅ Request

* **Method**: `POST`
* **Headers**:

  * `Authorization`: Bearer access token
  * `Cookie`: Must include valid `refresh_token`

---

### 🔸 Example (JavaScript - `fetch`)

```js
const res = await fetch('/logout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <access_token>'
  },
  credentials: 'include'
});
const data = await res.json();
```

---

### ✅ Response

#### ▶ Success – Logout Complete (HTTP 200)

```json
{
  "success": true,
  "msg": "Successfully logged out."
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during logout."
}
```

---

### 🧩 Additional Notes

* **Rate Limiting**: Max 5 requests per minute
* **Logout Logic**:

  * Google users: revoke token via `revokeGoogleToken()`
  * All users: clear tokens from `userTokensRepository`
  * Set `status = false` in `userProfilesRepository`
  * Delete cookie via `config.COOKIE_NAME`
* Errors logged via Fastify logger

---
