## 📌 `/check-email` [POST]

Endpoint for checking if an email address is already registered.

---

### ✅ Request

- **Content-Type**: `application/json`
- **Method**: `POST`
- **Request Body**:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | ✅ | Email address to check |

> This API validates the email format and checks for duplicate registration.
> 

---

### 🔸 Example (JavaScript - `fetch`)

```jsx
const res = await fetch('/check-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: 'test@example.com' })
});
const data = await res.json();
```

---

### ✅ Response

### ▶ Valid and Available Email (HTTP 200)

```json
{
  "success": true,
  "msg": "Email is available."
}
```

---

### ▶ Invalid Email Format (HTTP 200)

```json
{
  "success": false,
  "msg": "Invalid email format."
}
```

---

### ▶ Duplicate Email (HTTP 200)

```json
{
  "success": false,
  "msg": "Email already exists."
}
```

---

### ▶ Server Error (HTTP 500)

```json
{
  "success": false,
  "msg": "An internal server error occurred during email duplication check."
}
```

---

## 🧩 Additional Notes

- **Rate Limiting**: Maximum 5 requests per minute per client.
- **Validation**: Uses backend `isValidEmail(email)` function.
- **Schema**: Backend expects the body to follow `UserEmail` format (`{ email: string }`).
- **Error Handling**: Custom error handler for "email duplication check" is implemented.