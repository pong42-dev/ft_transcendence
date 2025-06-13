## 📌 `/logout` [POST]

Endpoint to **log the user out** by revoking tokens, clearing cookies, and updating their status.

---

### ✅ Request

- **Method**: `POST`
- **Headers**:
    - `Cookie`: Must include a valid `refresh_token` cookie.
    - `Authorization`: Bearer token (handled by `authenticate` preHandler)
- **Body**: *None*

---

### 🔸 Example (JavaScript - `fetch`)

```jsx
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

### ▶ Success – Logout Completed (HTTP 200)

```json
{
  "msg": "Successfully logged out."
}
```

### ▶ Server Error – Internal Failure (HTTP 500)

```json
{
  "msg": "An internal server error occurred during logout."
}
```

---

### 🧩 Additional Notes

- **Rate Limiting**: Max 5 requests per minute.
- **Authentication Required**: Protected by `authenticate` preHandler.
- **Token Revocation**:
    - If user logged in with Google and has `google_refresh_token`, it is revoked via `revokeGoogleToken()`.
    - All related records are removed from `userTokensRepository`.
- **User Status**: Updated to `false` (logged out) in `userProfilesRepository`.
- **Cookie Clearance**: The `refresh_token` cookie (name from `config.COOKIE_NAME`) is removed from the client.
- **Error Logging**: All failures are caught and return HTTP 500.