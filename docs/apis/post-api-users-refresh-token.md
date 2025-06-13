## 📌 `/refresh-token` [POST]

Endpoint for refreshing the access token using a valid refresh token stored in cookies.

---

### ✅ Request

- **Content-Type**: `application/json`
- **Method**: `POST`
- **Authentication**: Requires valid `refresh_token` in cookie

---

### 🔸 Example (JavaScript – `fetch`)

```jsx
const res = await fetch('/refresh-token', {
  method: 'POST',
  credentials: 'include', // Required to send cookies
});
const data = await res.json();
```

---

### ✅ Response

### ▶ Success – Token Refreshed (HTTP 200)

```json
{
  "msg": "Token refreshed successfully.",
	"data" : {
	  "accessToken": "..." // returned internally by loginManager
	}
}
```

### ▶ Unauthorized – Invalid or Expired Token (HTTP 401)

```json
{
  "msg": "Invalid or expired token."
}
```

### ▶ Server Error – Internal Failure (HTTP 500)

```json
{
  "msg": "An internal server error occurred while refreshing the token."
}
```

---

### 🧩 Additional Notes

- **Rate Limiting**: Max 5 requests per minute.
- **Token Verification**: Verifies JWT from `refresh_token` cookie.
- **Token Validation**: Compares against hashed token in DB using `passwordManager`.
- **New Access Token**: Issued via `fastify.jwt.sign({ user_id })`.
- **Security**: JWT and refresh tokens should be stored securely (e.g., `HttpOnly` cookies).