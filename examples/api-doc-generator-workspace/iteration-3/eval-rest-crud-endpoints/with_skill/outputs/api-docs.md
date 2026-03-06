# API Reference - User Management

## Overview

RESTful API for managing user accounts. Base URL: `https://api.example.com`

All responses use JSON format (`Content-Type: application/json`).

## Endpoints

### Users

#### GET /api/users

List all users with optional filtering and pagination.

**Query Parameters:**

| Name   | Type    | Required | Default | Description                             |
| ------ | ------- | -------- | ------- | --------------------------------------- |
| page   | integer | No       | 1       | Page number (minimum: 1)                |
| limit  | integer | No       | 25      | Results per page (1-100)                |
| role   | string  | No       | -       | Filter by role: admin, user, editor     |
| search | string  | No       | -       | Search users by name (case-insensitive) |

**Response (200 OK):**

```json
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "jane.smith@example.com",
      "name": "Jane Smith",
      "role": "admin",
      "bio": "Senior engineer at Acme Corp",
      "createdAt": "2025-01-15T09:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "totalPages": 6
  }
}
```

**Error Responses:**

| Status | Condition                | Body                                                |
| ------ | ------------------------ | --------------------------------------------------- |
| 422    | Invalid query parameters | `{ "errors": [{ "param": "page", "msg": "..." }] }` |

**Example:**

```bash
curl "https://api.example.com/api/users?page=1&limit=10&role=admin"
```

---

#### GET /api/users/:id

Get a single user by their ID.

**Path Parameters:**

| Name | Type     | Required | Description                  |
| ---- | -------- | -------- | ---------------------------- |
| id   | ObjectId | Yes      | MongoDB ObjectId of the user |

**Response (200 OK):**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "jane.smith@example.com",
    "name": "Jane Smith",
    "role": "admin",
    "bio": "Senior engineer at Acme Corp",
    "createdAt": "2025-01-15T09:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition         | Body                                                                 |
| ------ | ----------------- | -------------------------------------------------------------------- |
| 404    | User not found    | `{ "error": "User not found" }`                                      |
| 422    | Invalid ID format | `{ "errors": [{ "param": "id", "msg": "Invalid user ID format" }] }` |

**Example:**

```bash
curl "https://api.example.com/api/users/507f1f77bcf86cd799439011"
```

---

#### POST /api/users

Create a new user account.

**Request Body:**

| Field    | Type   | Required | Constraints                                |
| -------- | ------ | -------- | ------------------------------------------ |
| email    | string | Yes      | Valid email format                         |
| name     | string | Yes      | 2-100 characters                           |
| password | string | Yes      | Minimum 8 characters                       |
| role     | string | No       | One of: admin, user, editor. Default: user |
| bio      | string | No       | Maximum 500 characters                     |

```json
{
  "email": "john.doe@example.com",
  "name": "John Doe",
  "password": "secureP@ss2025",
  "role": "editor",
  "bio": "Technical writer and API enthusiast"
}
```

**Response (201 Created):**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439012",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "editor",
    "bio": "Technical writer and API enthusiast",
    "createdAt": "2025-03-06T14:22:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition            | Body                                                                     |
| ------ | -------------------- | ------------------------------------------------------------------------ |
| 409    | Email already exists | `{ "error": "Email already registered" }`                                |
| 422    | Validation failed    | `{ "errors": [{ "param": "email", "msg": "Valid email is required" }] }` |

**Example:**

```bash
curl -X POST https://api.example.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@example.com","name":"John Doe","password":"secureP@ss2025","role":"editor"}'
```

---

#### PUT /api/users/:id

Update an existing user. All fields are optional but at least one must be
provided.

**Path Parameters:**

| Name | Type     | Required | Description                  |
| ---- | -------- | -------- | ---------------------------- |
| id   | ObjectId | Yes      | MongoDB ObjectId of the user |

**Request Body:**

| Field | Type   | Required | Constraints                 |
| ----- | ------ | -------- | --------------------------- |
| email | string | No       | Valid email format          |
| name  | string | No       | 2-100 characters            |
| role  | string | No       | One of: admin, user, editor |
| bio   | string | No       | Maximum 500 characters      |

```json
{
  "name": "Jane Smith-Johnson",
  "role": "admin"
}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "jane.smith@example.com",
    "name": "Jane Smith-Johnson",
    "role": "admin",
    "bio": "Senior engineer at Acme Corp",
    "createdAt": "2025-01-15T09:30:00.000Z"
  }
}
```

**Error Responses:**

| Status | Condition                 | Body                                                     |
| ------ | ------------------------- | -------------------------------------------------------- |
| 404    | User not found            | `{ "error": "User not found" }`                          |
| 409    | Email already in use      | `{ "error": "Email already in use by another account" }` |
| 422    | Invalid ID or body fields | `{ "errors": [{ "param": "...", "msg": "..." }] }`       |

**Example:**

```bash
curl -X PUT https://api.example.com/api/users/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Smith-Johnson","role":"admin"}'
```

---

#### DELETE /api/users/:id

Delete a user by ID.

**Path Parameters:**

| Name | Type     | Required | Description                  |
| ---- | -------- | -------- | ---------------------------- |
| id   | ObjectId | Yes      | MongoDB ObjectId of the user |

**Response (204 No Content):**

No response body.

**Error Responses:**

| Status | Condition         | Body                                                                 |
| ------ | ----------------- | -------------------------------------------------------------------- |
| 404    | User not found    | `{ "error": "User not found" }`                                      |
| 422    | Invalid ID format | `{ "errors": [{ "param": "id", "msg": "Invalid user ID format" }] }` |

**Example:**

```bash
curl -X DELETE https://api.example.com/api/users/507f1f77bcf86cd799439011
```
