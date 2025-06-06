## 📌 `/register` [POST]

Endpoint for user registration.

---

### ✅ Request

- **Content-Type**: `multipart/form-data`
- **Request Type**: FormData
- **Fields**:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | ✅ | User email address |
| `password` | string | ✅ | User password |
| `name` | string | ✅ | User display name (nickname) |
| `avatar` | file | ⭕ | Avatar image file (optional) |

> The frontend must use a FormData object to send the request.
> 

---

### 🔸 Example (JavaScript - FormData)

```
const formData = new FormData();
formData.append('email', 'test@example.com');
formData.append('password', '12345678');
formData.append('name', 'JohnDoe');
formData.append('avatar', selectedFile); // File object

const res = await fetch('/register', {
  method: 'POST',
  body: formData
});
const data = await res.json();
```

---

### ✅ Response

### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Registration completed successfully."
}
```

---

### ▶ Failure – Invalid Email Format (HTTP 200)

```json
{
  "success": false,
  "msg": "Invalid email format."
}
```

---

### ▶ Failure – Email Already Exists (HTTP 200)

```json
{
  "success": false,
  "msg": "This email is already registered."
}
```

---

### ▶ Failure – Name Already Exists (HTTP 200)

```json
{
  "success": false,
  "msg": "This nickname is already in use."
}
```

---

### ▶ Server Error (HTTP 500)

```json
{
  "success": false,
  "msg": "An internal server error occurred during registration."
}
```

---

## 🧩 Additional Notes

- **Rate limiting**: Maximum of 5 requests per minute per client (based on `rateLimit` configuration).
- **Avatar upload path**: The avatar file will be saved in a directory composed of `UPLOAD_DIRNAME` + `UPLOAD_AVATAR_DIRNAME`, or defaults to `uploads/avatars` if not set.