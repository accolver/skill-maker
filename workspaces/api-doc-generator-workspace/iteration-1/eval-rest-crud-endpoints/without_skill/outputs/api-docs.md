# User API

## Endpoints

### GET /api/users

Returns a list of users. Supports pagination with `page` and `limit` query
params.

**Response:**

```json
{
  "users": [...],
  "pagination": { "page": 1, "limit": 25, "total": 100, "totalPages": 4 }
}
```

### GET /api/users/:id

Returns a single user by ID.

**Response:**

```json
{
  "user": { "id": "...", "email": "...", "name": "...", "role": "..." }
}
```

Returns 404 if user not found.

### POST /api/users

Creates a new user.

**Body:**

- `email` (string, required) - user email
- `name` (string, required) - user name
- `password` (string, required) - password
- `role` (string, optional) - user role
- `bio` (string, optional) - user bio

**Response:** 201 with created user object.

Returns 409 if email already exists.

### PUT /api/users/:id

Updates a user.

**Body:** Same fields as POST but all optional.

**Response:** 200 with updated user.

### DELETE /api/users/:id

Deletes a user by ID.

**Response:** 204 No Content.

Returns 404 if not found.
