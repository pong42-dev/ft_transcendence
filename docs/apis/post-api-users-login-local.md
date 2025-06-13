## 📌 `/local` [POST]

Endpoint for user login with **local** credentials (email and password).

---

### ✅ Request

- **Content-Type**: `application/json`
- **Method**: `POST`
- **Request Body**:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | ✅ | User email address |
| `password` | string | ✅ | User password |

---

### 🔸 Example (JavaScript - `fetch`)

```jsx
const res = await fetch('/local', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const data = await res.json();
```

---

### ✅ Response

### ▶ Success – Login Completed (HTTP 200)

```json
{
  "success": true,
  "msg": "Successfully logged in.",
  "accessToken": "..." // returned internally by loginManager
}
```

### ▶ Unauthorized – Email Not Found or Incorrect Password (HTTP 401)

```json
{
  "success": false,
  "msg": "Email or password is incorrect."
}
```

### ▶ Server Error – Internal Failure (HTTP 500)

```json
{
  "success": false,
  "msg": "An internal server error occurred during login."
}
```

---

### 🧩 Additional Notes

- **Rate Limiting**: Max 5 requests per minute.
- **Provider Check**: Only allows users with `provider === 'local'`.
- **Password Check**: Uses secure `passwordManager.comparePassword`.
- **Login Logic**: Delegated to `loginManager.login()`.
- **Error Logging**: Server-side errors are logged via Fastify logger.