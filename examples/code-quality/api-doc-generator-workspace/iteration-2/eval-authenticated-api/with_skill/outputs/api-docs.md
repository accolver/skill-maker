# Blog API Reference

## Overview

RESTful API for managing blog posts and comments. Version 2.0.0.

Base URL: `https://api.example.com`

## Authentication

This API uses JWT Bearer tokens for authentication.

Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

**Token payload contains:** `sub` (user ID), `email`, `role`
(reader/admin/moderator).

**Public endpoints** (no auth required): Listing and reading posts and comments.
**Authenticated endpoints** (auth required): Creating, updating, and deleting
posts and comments.

### Auth Errors

| Status | Condition         | Body                                                |
| ------ | ----------------- | --------------------------------------------------- |
| 401    | No token provided | `{ "detail": "Authentication required" }`           |
| 401    | Token expired     | `{ "detail": "Token has expired" }`                 |
| 401    | Invalid token     | `{ "detail": "Invalid authentication token" }`      |
| 403    | Insufficient role | `{ "detail": "Requires moderator role or higher" }` |

## Rate Limiting

All endpoints are rate limited:

| User Type     | Limit        | Window   |
| ------------- | ------------ | -------- |
| Authenticated | 100 requests | 1 minute |
| Anonymous     | 20 requests  | 1 minute |

When rate limited, the API returns `429 Too Many Requests` with a `Retry-After`
header.

## Endpoints

### Blog Posts

#### GET /api/posts

List blog posts with pagination and filtering. **Public - no auth required.**

**Query Parameters:**

| Name           | Type    | Required | Default | Description               |
| -------------- | ------- | -------- | ------- | ------------------------- |
| page           | integer | No       | 1       | Page number (minimum: 1)  |
| per_page       | integer | No       | 20      | Items per page (1-100)    |
| tag            | string  | No       | -       | Filter by tag             |
| author_id      | string  | No       | -       | Filter by author ID       |
| published_only | boolean | No       | true    | Only show published posts |

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "post_abc123",
      "title": "Getting Started with FastAPI",
      "content": "FastAPI is a modern Python web framework...",
      "tags": ["python", "fastapi", "tutorial"],
      "published": true,
      "author_id": "user_xyz789",
      "author_name": "Alice Chen",
      "created_at": "2025-02-20T10:00:00Z",
      "updated_at": "2025-02-21T14:30:00Z",
      "comment_count": 12
    }
  ],
  "total": 87,
  "page": 1,
  "per_page": 20,
  "has_more": true
}
```

**Example:**

```bash
curl "https://api.example.com/api/posts?page=1&per_page=10&tag=python"
```

---

#### GET /api/posts/{post_id}

Get a single blog post. **Public for published posts.** Authors can view their
own drafts when authenticated.

**Path Parameters:**

| Name    | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| post_id | string | Yes      | Post ID     |

**Response (200 OK):**

```json
{
  "id": "post_abc123",
  "title": "Getting Started with FastAPI",
  "content": "FastAPI is a modern Python web framework...",
  "tags": ["python", "fastapi", "tutorial"],
  "published": true,
  "author_id": "user_xyz789",
  "author_name": "Alice Chen",
  "created_at": "2025-02-20T10:00:00Z",
  "updated_at": "2025-02-21T14:30:00Z",
  "comment_count": 12
}
```

**Error Responses:**

| Status | Condition      | Body                        |
| ------ | -------------- | --------------------------- |
| 404    | Post not found | `{ "detail": "Not Found" }` |

**Example:**

```bash
curl "https://api.example.com/api/posts/post_abc123"
```

---

#### POST /api/posts

Create a new blog post. **Requires authentication.**

**Request Body:**

| Field     | Type     | Required | Constraints                     |
| --------- | -------- | -------- | ------------------------------- |
| title     | string   | Yes      | 5-200 characters                |
| content   | string   | Yes      | Minimum 20 characters, Markdown |
| tags      | string[] | No       | Up to 10 tags                   |
| published | boolean  | No       | Default: false                  |

```json
{
  "title": "My New Blog Post",
  "content": "This is the content of my blog post with enough detail...",
  "tags": ["python", "tutorial"],
  "published": false
}
```

**Response (201 Created):** Returns the created post object.

**Error Responses:**

| Status | Condition         | Body                                             |
| ------ | ----------------- | ------------------------------------------------ |
| 401    | Not authenticated | `{ "detail": "Authentication required" }`        |
| 422    | Validation failed | `{ "detail": [{ "loc": [...], "msg": "..." }] }` |

**Example:**

```bash
curl -X POST https://api.example.com/api/posts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"title":"My New Post","content":"This is a detailed blog post about...","tags":["python"]}'
```

---

#### PUT /api/posts/{post_id}

Update a blog post. **Requires authentication.** Only the author or admin can
update.

**Path Parameters:**

| Name    | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| post_id | string | Yes      | Post ID     |

**Request Body:** Same fields as POST, all optional.

**Error Responses:**

| Status | Condition           | Body                                             |
| ------ | ------------------- | ------------------------------------------------ |
| 401    | Not authenticated   | `{ "detail": "Authentication required" }`        |
| 403    | Not author or admin | `{ "detail": "Requires author role or higher" }` |
| 404    | Post not found      | `{ "detail": "Not Found" }`                      |

**Example:**

```bash
curl -X PUT https://api.example.com/api/posts/post_abc123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","published":true}'
```

---

#### DELETE /api/posts/{post_id}

Delete a blog post. **Requires authentication.** Only the author or admin can
delete.

**Response:** 204 No Content.

**Error Responses:**

| Status | Condition           | Body                                             |
| ------ | ------------------- | ------------------------------------------------ |
| 401    | Not authenticated   | `{ "detail": "Authentication required" }`        |
| 403    | Not author or admin | `{ "detail": "Requires author role or higher" }` |
| 404    | Post not found      | `{ "detail": "Not Found" }`                      |

---

### Comments

#### GET /api/posts/{post_id}/comments

List comments for a post. **Public - no auth required.**

**Query Parameters:**

| Name     | Type    | Required | Default | Description            |
| -------- | ------- | -------- | ------- | ---------------------- |
| page     | integer | No       | 1       | Page number            |
| per_page | integer | No       | 50      | Items per page (1-200) |

---

#### POST /api/posts/{post_id}/comments

Add a comment. **Requires authentication.**

**Request Body:**

| Field     | Type   | Required | Constraints                   |
| --------- | ------ | -------- | ----------------------------- |
| body      | string | Yes      | 1-2000 characters             |
| parent_id | string | No       | Parent comment ID for replies |

---

#### DELETE /api/posts/{post_id}/comments/{comment_id}

Delete a comment. **Requires moderator role or higher.**

**Error Responses:**

| Status | Condition           | Body                                                |
| ------ | ------------------- | --------------------------------------------------- |
| 401    | Not authenticated   | `{ "detail": "Authentication required" }`           |
| 403    | Not moderator/admin | `{ "detail": "Requires moderator role or higher" }` |
| 404    | Comment not found   | `{ "detail": "Not Found" }`                         |
