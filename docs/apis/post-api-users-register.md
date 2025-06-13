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

### ▶ Success (HTTP 201)

```json
{
  "msg": "Registration completed successfully."
}
```

### ▶ Validation Failure / Duplication (HTTP 200)

```json
{ 
  "msg": "Invalid email format." 
}
{ 
  "msg": "Password must be 8–15 characters, contain upper and lower case letters, digits, and special characters (@#%&!$*)."
}
{ 
  "msg": "Name must be 2–16 characters, using letters, numbers, or Korean characters."
}
{ 
  "msg": "Profile image must be JPEG, PNG, WEBP, or GIF, and <= 5MB."
}
```

```json
{
  "msg": "This email is already registered."
}
```

```json
{
  "msg": "This name is already registered."
}
```

### ▶ Server Error (HTTP 500)

```json
{
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