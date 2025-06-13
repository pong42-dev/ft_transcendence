## 📌 `/register` [POST]

Endpoint for **user registration** with multipart form data (name, email, password, avatar).

---

### ✅ Request

- **Content-Type**: `multipart/form-data`
- **Method**: `POST`

### 📥 Expected Form Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | ✅ | User's email address |
| `password` | string | ✅ | User's password |
| `name` | string | ✅ | User's display name |
| `avatar` | File | ✅ | Profile image (avatar) file |

---

### ✅ Response

### ▶ Success (HTTP 200)

```json
{
  "success": true,
  "msg": "Registration completed successfully."
}

```

### ▶ Validation Failure / Duplication (HTTP 200)

```json
{ "success": false, "msg": "Invalid email format." }
{ "success": false, "msg": "Password must be 8–15 characters, contain upper and lower case letters, digits, and special characters (@#%&!$*)." }
{ "success": false, "msg": "Name must be 2–16 characters, using letters, numbers, or Korean characters." }
{ "success": false, "msg": "Profile image must be JPEG, PNG, WEBP, or GIF, and <= 5MB." }
```

```json
{
  "success": false,
  "msg": "This email is already registered."
}
```

```json
{
  "success": false,
  "msg": "This name is already registered."
}
```

### ▶ Server Error (HTTP 500)

```json
{
  "success": false,
  "msg": "An internal server error occurred during registration."
}
```

---

### 🧩 Additional Notes

- **Rate Limiting**: Max 5 requests per minute
- **Avatar Directory**: Configurable via `config.UPLOAD_*`
- **User Provider**: Defaults to `'local'`
- **Logging**: Errors are logged using Fastify’s logger
- **Password Hashing**: Secure via `passwordManager`

---