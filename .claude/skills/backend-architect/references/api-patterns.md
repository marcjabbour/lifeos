# API Patterns Reference

## REST Conventions

### Resource Naming
```
GET    /users              # List users
POST   /users              # Create user
GET    /users/:id          # Get single user
PATCH  /users/:id          # Update user (partial)
PUT    /users/:id          # Replace user (full)
DELETE /users/:id          # Delete user

# Nested resources (limit to one level)
GET    /users/:id/posts    # User's posts
POST   /users/:id/posts    # Create post for user

# Actions (when CRUD doesn't fit)
POST   /users/:id/activate
POST   /orders/:id/cancel
```

### Response Structure

**Success (single resource):**
```json
{
  "id": "123",
  "name": "Example",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Success (collection):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

## Pagination

### Offset-based (simple, allows jumping to pages)
```
GET /users?page=2&perPage=20
```

### Cursor-based (better for large datasets, real-time)
```
GET /users?cursor=abc123&limit=20
```

## Filtering and Sorting

```
GET /users?status=active&role=admin    # Filtering
GET /users?sort=createdAt&order=desc   # Sorting
GET /users?fields=id,name,email        # Field selection
```

## Error Handling

| Status | Use Case |
|--------|----------|
| 200 | Success |
| 201 | Created |
| 204 | No content (successful DELETE) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (authenticated but not allowed) |
| 404 | Not found |
| 409 | Conflict (duplicate, state conflict) |
| 422 | Unprocessable entity (semantic error) |
| 429 | Rate limited |
| 500 | Server error |

## Rate Limiting Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Versioning (when necessary)

Prefer URL versioning for clarity:
```
/v1/users
/v2/users
```

Only version when making breaking changes. Non-breaking additions don't require new versions.
