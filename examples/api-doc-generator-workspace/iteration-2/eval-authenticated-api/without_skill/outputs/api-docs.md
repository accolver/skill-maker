# Blog API Documentation

## Endpoints

### Posts

#### GET /api/posts

Get a list of blog posts. Supports pagination with `page` and `per_page`
parameters.

Optional filters: `tag`, `author_id`, `published_only`.

#### GET /api/posts/{post_id}

Get a single post by ID.

#### POST /api/posts

Create a new post. Requires authentication.

Body fields:

- title (string, required, 5-200 chars)
- content (string, required, min 20 chars)
- tags (array of strings, optional)
- published (boolean, optional, default false)

#### PUT /api/posts/{post_id}

Update a post. Requires authentication. Must be the author or admin.

#### DELETE /api/posts/{post_id}

Delete a post. Requires authentication. Must be the author or admin.

### Comments

#### GET /api/posts/{post_id}/comments

List comments for a post. Supports pagination.

#### POST /api/posts/{post_id}/comments

Add a comment. Requires authentication.

Body:

- body (string, required)
- parent_id (string, optional)

#### DELETE /api/posts/{post_id}/comments/{comment_id}

Delete a comment. Requires moderator role.

## Authentication

The API uses JWT tokens. Pass the token in the Authorization header:

```
Authorization: Bearer <token>
```

Some endpoints are public (GET requests), others require authentication.
