## 📌 `/me/name` [PATCH]

Endpoint for updating the authenticated user's display name (nickname).

---

### ✅ Request

- **Method**: `PATCH`
- **Content-Type**: `application/json`
- **Headers**:
    - `Authorization`: Bearer token (required)
- **Body**:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | ✅ | New display name (nickname) |

---

### 🔸 Example (JavaScript – `fetch`)

```jsx
const res = await fetch('/me/name', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_access_token'
  },
  body: JSON.stringify({
    name: 'NewNickname'
  })
});
const data = await res.json();
```

---

### ✅ Response

### ▶ Success – Name Updated (HTTP 200)

```json
{
  "success": true,
  "msg": "Name has been updated."
}
```

### ▶ Duplicate Name – Name Already Registered (HTTP 200)

```json
{
  "success": false,
  "msg": "This name is already registered"
}
```

### ▶ Server Error – Internal Failure (HTTP 500)

```json
{
  "msg": "An internal server error occurred while processing the nickname update."
}

```

---

### 🧩 Additional Notes

- **Rate Limiting**: Max 5 requests per minute.
- **Authentication**: Required. Uses `authenticate` preHandler.
- **Duplicate Name Check**: Performed via `userProfilesRepository.checkDupRow("name", newName)`.
- **Update Logic**: Updates the `name` field for the authenticated user via `userProfilesRepository.updateRowByColumn()`.
- **Error Logging**: Server-side errors are logged using Fastify’s logger.
- **Request Body Handling**: Assumes name field is provided directly in `request.body`.

---