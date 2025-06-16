## 📌 `/me/avatar` [PUT]

Endpoint for updating the authenticated user's avatar image.

---

### ✅ Request

- **Method**: `PUT`
- **Content-Type**: `multipart/form-data`
- **Headers**:
    - Authorization: Bearer token (via `authenticate` preHandler)
- **Body**:
    - `avatar`: image file (profile avatar)

---

### 🔸 Example (JavaScript - `fetch` + FormData)

```jsx
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

const res = await fetch('/me/avatar', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer your_access_token',
  },
  body: formData,
});
const data = await res.json();
```

---

### ✅ Response

### ▶ Success – Avatar Updated (HTTP 200)

```json
{
  "success": true,
  "msg": "Avatar has been successfully updated."
}
```

### ▶ Invalid Avatar Format or Validation Failed (HTTP 200)

```json
{
  "success": false,
  "msg": "Invalid avatar format."
}
```

### ▶ Server Error – Internal Failure (HTTP 500)

```json
{
  "msg": "An internal server error occurred while updating the avatar."
}
```

---

### 🧩 Additional Notes

- **Rate Limiting**: Max 5 requests per minute.
- **Authentication**: Requires valid JWT token via `authenticate` preHandler.
- **Avatar Validation**: Validates the uploaded file format and size before saving.
- **File Management**: Deletes old avatar file if exists before updating.
- **Storage**: Saves the avatar file to configured upload directory.
- **Error Handling**: Logs server errors via Fastify logger.

---