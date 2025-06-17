## 📌 `/google` [GET]

Redirects the user to the **Google OAuth2 login** page.

---

### ✅ Request

- **Method**: `GET`
- **Rate Limit**: 5 requests per minute
- **Query Parameters**: None

---

### ✅ Response

### ▶ Redirect – Google OAuth2 (HTTP 302)

- The user is redirected to Google's OAuth2 authorization URL.


### ▶ Conflict - Account already used (HTTP 409)

```json
{
  "msg": "This account is already in use. Please log out and try again."
}
```

### ▶ Internal Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during Google login redirection."
}
```

---

### 🧩 Additional Notes

- The redirect URL is generated via `googleOAuth2Manager.getGoogleOAuthUrl()`.
- Errors are logged using the Fastify logger.

---

## 📌 `/google/callback` [GET]

Handles the **OAuth2 callback** from Google and performs user login or registration.

---

### ✅ Request

- **Method**: `GET`
- **Query Parameters**:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | ✅ | Authorization code from Google |

---

### ✅ Response

### ▶ Unauthorized – Name or Email Conflict (HTTP 200)

```json
{
  "success": false,
  "msg": "This name is already registered."
}
```

```json
{
  "success": false,
  "msg": "This email is already registered."
}
```

### ▶ Redirect – Login Successful (HTTP 302)

- Redirects after successful login.
- `accessToken` and session-related data are handled internally by `loginManager.login()`.

### ▶ Internal Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during OAuth2 callback."
}
```

---

### 🧩 Additional Notes

- Uses `googleOAuth2Manager.getTokenFromCode()` to retrieve the token.
- Retrieves the user’s profile using the access token.
- If the user does not exist:
    - Registers the user using `usersRepository.insertRow()` and `userProfilesRepository.insertRow()`.
    - Downloads the profile image via `downloadImageFromUrl()`.
- If the email exists but the provider is not `"google"`, login is rejected.
- If the name already exists in the system, registration is blocked to avoid conflicts.
- Errors are logged via the Fastify logger.

---