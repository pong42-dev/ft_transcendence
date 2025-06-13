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
	"data" : {
	  "accessToken": "..." // returned internally by loginManager
	}
}
```

### ▶ Unauthorized – Email Not Found or Incorrect Password (HTTP 401)

```json
{
  "msg": "Email or password is incorrect."
}
```

### ▶ Conflict - Account already used (HTTP 409)

```json
{
  "msg": "This account is already in use. Please log out and try again."
}
```

### ▶ Server Error – Internal Failure (HTTP 500)

```json
{
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

---