## 📌 `/me` [GET]

Endpoint for **retrieving the authenticated user's profile** along with statistics.

---

### ✅ Request

- **Content-Type**: `application/json`
- **Method**: `GET`
- **Authentication**: ✅ Required (JWT or session-based via `preHandler: authenticate`)

---

### 📥 Expected Headers

| Header | Value | Required | Description |
| --- | --- | --- | --- |
| `Authorization` | `Bearer <token>` | ✅ | JWT access token for user authentication |

---

### ✅ Response

### ▶ Success (HTTP 200)

```json
{
    "success": true,
    "msg": "User Profile successfully retrieved.",
    "data": {
        "me": {
            "name": "6666",
            "avatar": "uploads/avatar/07d4fd03-a4ca-4704-9bcf-1c12ef4095ec.png"
        }
    }
}
```

> Returns the profile information of the authenticated user along with activity statistics.
> 

---

### ▶ Not Found (HTTP 404)

```json
{
  "msg": "User not found."
}
```

> Returned when the user does not exist in the system (e.g., deleted or invalid user ID).
> 

---

### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred while retrieving the user profile.'"
}
```

> Returned when an unexpected error occurs on the server (e.g., DB failure). The message is logged internally.
> 

---

### 🧩 Additional Notes

- **Authentication Required**: The route is protected via a `preHandler` that ensures a valid user session.
- **Error Logging**: All server-side errors are logged using Fastify’s built-in logger.
- **Profile Stats**: Includes post/comment/follow metrics calculated in `getUserProfileWithStats()` repository function.