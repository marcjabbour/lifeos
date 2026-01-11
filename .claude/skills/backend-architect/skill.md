---
name: backend-architect
description: Backend architecture reference patterns. Contains API, database, and auth pattern documentation. For active architecture decisions, use the backend-architect agent instead.
---

# Backend Architecture Reference

This skill contains reference documentation for backend patterns. For active architecture decisions and implementation, use the **backend-architect agent**.

## Reference Files

- `references/api-patterns.md` - REST API design, versioning, error handling
- `references/database-patterns.md` - Schema design, indexing, migrations
- `references/auth-patterns.md` - JWT, sessions, OAuth implementation

## Quick Reference

### API Response Shaping

```typescript
// Bad: Leaking database structure
{ "user_id": 1, "created_at": "2024-01-15T10:30:00.000Z", "_internal_flags": 3 }

// Good: Clean, frontend-friendly response
{ "id": "usr_abc123", "createdAt": "2024-01-15T10:30:00Z" }
```

### Project Structure

```
src/
├── api/           # Route handlers
├── services/      # Business logic (when warranted)
├── models/        # Data models
├── middleware/    # Request processing
├── lib/           # Shared utilities
└── config/        # Configuration
```

### When to Add Complexity

| Pattern | Default | Use When |
|---------|---------|----------|
| Repository pattern | No | Multiple data sources |
| Service layer | Inline | Complex business logic |
| Microservices | Monolith | Clear domains + team scale |
