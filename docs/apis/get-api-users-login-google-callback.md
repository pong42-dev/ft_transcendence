## 📌 `/google/callback` [GET]

Endpoint to handle the **Google OAuth2 callback** after user authorization.

---

### ✅ Request

- **Method**: `GET`
- **Query Parameters**:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | ✅ | Authorization code from Google |

---

### 🔸 Example (Typical Callback URL)

```
/google/callback?code=AUTH_CODE_HERE
```

---

### ✅ Response

### ▶ Success – New or Existing Google User Login (HTTP 200)

```json
{
  "success": true,
  "msg": "Successfully logged in.",
  "accessToken": "..." // returned from loginManager
}
```

### ▶ Unauthorized – Name or Email Conflict (HTTP 401)

```json
{
  "success": false,
  "msg": "This name is already registered." // or "This email is already registered."
}
```

### ▶ Server Error – Internal Failure (HTTP 500)

```json
{
  "success": false,
  "msg": "An internal server error occurred during OAuth2 callback."
}
```

---

### 🧩 Additional Notes

- **Token Exchange**: Uses `googleOAuth2Manager.getTokenFromCode()` to obtain access token.
- **User Profile Retrieval**: Google user info fetched using `getUserProfileFromToken`.
- **User Validation**:
    - If email doesn't exist and name is available → create new user.
    - If email exists with different provider → reject login.
    - If user exists with provider === `'google'` → login.
- **Avatar Handling**: Downloads and stores the profile picture using `downloadImageFromUrl`.
- **Login**: Performed via `loginManager.login()`.
- **Error Logging**: Handled via Fastify's built-in logger.