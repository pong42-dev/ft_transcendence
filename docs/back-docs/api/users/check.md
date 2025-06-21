
# 🧾 User Duplication Check API

This document defines the API endpoints for checking user-related duplicates during sign-up, specifically email and user name. Both endpoints use POST methods and return standardized JSON responses with validation logic and rate limiting applied.

---

## 📌 `/check-email` \[POST]

**Endpoint to check if an email address is already registered.**

---

### ✅ Request

* **Content-Type**: `application/json`
* **Method**: `POST`
* **Body Schema**:

| Field   | Type   | Required | Description             |
| ------- | ------ | -------- | ----------------------- |
| `email` | string | ✅        | Email address to verify |

> Validates email format and checks duplication in the user repository.

---

### 🔸 Example (JavaScript - `fetch`)

```js
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

#### ▶ Valid and Available Email (HTTP 200)

```json
{
  "success": true,
  "msg": "Email is available."
}
```

#### ▶ Invalid Email Format (HTTP 200)

```json
{
  "success": false,
  "msg": "Invalid email format."
}
```

#### ▶ Duplicate Email (HTTP 200)

```json
{
  "success": false,
  "msg": "Email already exists."
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during email duplication check."
}
```

---

### 🧩 Additional Notes

* **Rate Limiting**: Max 5 requests per minute per client.
* **Validation**: Uses backend `isValidEmail(email)` function.
* **Schema**: `{ email: string }`
* **Error Handling**: Custom error handler for email duplication check is implemented.

---

## 📌 `/check-name` \[POST]

**Endpoint to check if a user name is already registered.**

---

### ✅ Request

* **Content-Type**: `application/json`
* **Method**: `POST`
* **Body Schema**:

| Field  | Type   | Required | Description         |
| ------ | ------ | -------- | ------------------- |
| `name` | string | ✅        | User name to verify |

> Validates name format and checks duplication in the user profile repository.

---

### 🔸 Example (JavaScript - `fetch`)

```js
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

#### ▶ Valid and Available Name (HTTP 200)

```json
{
  "success": true,
  "msg": "Name is available."
}
```

#### ▶ Invalid Name Format (HTTP 200)

```json
{
  "success": false,
  "msg": "Invalid name format."
}
```

#### ▶ Duplicate Name (HTTP 200)

```json
{
  "success": false,
  "msg": "Name already exists."
}
```

#### ▶ Server Error (HTTP 500)

```json
{
  "msg": "An internal server error occurred during name duplication check."
}
```

---

### 🧩 Additional Notes

* **Rate Limiting**: Max 5 requests per minute per client.
* **Validation**: Uses backend `isValidName(name)` function.
* **Schema**: `{ name: string }`
* **Error Handling**: Custom error handler for name duplication check is implemented.

---
