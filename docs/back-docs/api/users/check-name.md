## 📌 `/check-name` [POST]

Endpoint for checking if a user name is already registered.

---

### ✅ Request

- **Content-Type**: `application/json`
- **Method**: `POST`
- **Request Body**:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | ✅ | User name to check |

> This API validates the name format and checks for duplicates in the user profile repository.
> 

---

### 🔸 Example (JavaScript - `fetch`)

```
const res = await fetch('/check-name', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'john_doe' })
});
const data = await res.json();

```

---

### ✅ Response

### ▶ Valid and Available Name (HTTP 200)

```json
{
  "success": true,
  "msg": "Name is available."
}
```

---

### ▶ Invalid Name Format (HTTP 200)

```json
{
  "success": false,
  "msg": "Invalid name format."
}
```

---

### ▶ Duplicate Name (HTTP 200)

```json
{
  "success": false,
  "msg": "Name already exists."
}
```

---

### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during name duplication check."
}
```

---

## 🧩 Additional Notes

- **Rate Limiting**: Maximum 5 requests per minute per client.
- **Validation**: Uses backend `isValidName(name)` function.
- **Schema**: Backend expects the body to follow `UserName` format (`{ name: string }`).
- **Error Handling**: Custom error handler for "name duplication check" is implemented.