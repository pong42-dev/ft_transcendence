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
  "msg": "An error occurred during Google login redirection."
}
```

---

### 🧩 Additional Notes

- The redirect URL is generated via `googleOAuth2Manager.getGoogleOAuthUrl()`.
- Errors are logged using the Fastify logger.

---