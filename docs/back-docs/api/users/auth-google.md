
---

# 👤 Google OAuth2 API Summary (Fastify Plugin)

This plugin provides Google OAuth2 login functionality including:

* Redirecting to Google OAuth2 consent screen
* Handling Google OAuth2 callback to login or register user

---

## 📌 `GET /google`

**Description**:
Redirects the client to Google’s OAuth2 authorization page.

### ✅ Request

* No authentication required
* No parameters

### ✅ Response

* **302 Redirect** – Redirect to Google OAuth2 consent page
* **500 Internal Server Error**

```json
{
  "msg": "An internal server error occurred during Google login redirection."
}
```

### 🧩 Notes

* Uses `googleOAuth2Manager.getGoogleOAuthUrl()` to generate the redirect URL.
* Rate limited to 5 requests per minute.

---

## 📌 `GET /google/callback`

**Description**:
Processes the OAuth2 callback by exchanging authorization code for tokens, retrieving Google profile, and logging in or registering the user.

### ✅ Request

* Query parameters:

| Name | Type   | Required | Description                    |
| ---- | ------ | -------- | ------------------------------ |
| code | string | ✅        | Authorization code from Google |

### ✅ Response

* **200 OK** – If the username is already taken:

```json
{
  "success": false,
  "msg": "This name is already registered."
}
```

* **302 Redirect** – Successful login (handled internally by `loginManager.login()`)

* **409 Conflict** – Email registered with a different provider:

```json
{
  "msg": "This email is already registered."
}
```

* **500 Internal Server Error**

```json
{
  "msg": "An internal server error occurred during OAuth2 callback."
}
```

### 🧩 Notes

* Exchanges the code for access and refresh tokens using `googleOAuth2Manager.getTokenFromCode()`.
* Fetches user profile via Google API.
* If the email does not exist:

  * Checks if the name is already registered; rejects if yes.
  * Creates new user and profile, downloads avatar image.
  * Logs in user via `loginManager.login()`.
* If the email exists:

  * Rejects if provider is not Google.
  * Logs in user if provider is Google.

---

## 🔧 Internal Components Summary

| Component                | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `googleOAuth2Manager`    | Handles OAuth2 URL generation and token/profile fetching |
| `usersRepository`        | User data CRUD operations                                |
| `userProfilesRepository` | User profile management (name, avatar, status)           |
| `loginManager`           | Login handling, token issuance                           |
| `downloadImageFromUrl()` | Downloads and saves avatar image                         |

---
