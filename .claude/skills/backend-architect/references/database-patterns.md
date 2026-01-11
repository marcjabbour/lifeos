# Database Patterns Reference

## Schema Design Principles

### Naming Conventions
- Tables: plural, snake_case (`users`, `order_items`)
- Columns: snake_case (`created_at`, `user_id`)
- Primary keys: `id` (prefer UUIDs for distributed systems, integers for simplicity)
- Foreign keys: `<singular_table>_id` (`user_id`, `order_id`)

### Standard Columns
```sql
id            -- Primary key
created_at    -- Timestamp, default NOW()
updated_at    -- Timestamp, updated on modification
```

Add `deleted_at` only if soft deletes are required.

## Relationship Patterns

### One-to-Many
```sql
-- users (one) -> posts (many)
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
```

### Many-to-Many
```sql
-- users <-> roles
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
```

### Self-Referential (Trees)
```sql
-- categories with parent
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES categories(id),
  name TEXT NOT NULL
);
```

## Indexing Strategy

### When to Add Indexes
- Foreign keys (always)
- Columns in WHERE clauses (frequent queries)
- Columns in ORDER BY (if pagination is common)
- Unique constraints (automatic index)

### When NOT to Add Indexes
- Low-cardinality columns (boolean, status with few values)
- Rarely queried columns
- Small tables (< 1000 rows)

### Composite Indexes
```sql
-- Order matters: leftmost columns can be used alone
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Supports: WHERE user_id = ? AND status = ?
-- Supports: WHERE user_id = ?
-- Does NOT support: WHERE status = ?
```

## Migration Patterns

### Safe Migrations (No Downtime)
1. Add nullable column (safe)
2. Backfill data (safe)
3. Make column NOT NULL with default (safe)
4. Add index CONCURRENTLY (safe, Postgres)

### Dangerous Migrations
- Renaming columns (breaks running code)
- Changing column types (locks table)
- Dropping columns (breaks running code)

**Strategy:** Deploy code that handles both states, then migrate, then remove old code path.

## Query Patterns

### Avoiding N+1
```sql
-- Bad: N+1 queries
SELECT * FROM users;
-- Then for each user:
SELECT * FROM posts WHERE user_id = ?;

-- Good: Single query with JOIN
SELECT u.*, p.*
FROM users u
LEFT JOIN posts p ON p.user_id = u.id;

-- Or: Two queries with IN
SELECT * FROM users WHERE id IN (...);
SELECT * FROM posts WHERE user_id IN (...);
```

### Pagination
```sql
-- Offset (simple, but slow for large offsets)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 40;

-- Cursor (better for large datasets)
SELECT * FROM posts
WHERE created_at < '2024-01-15T10:00:00Z'
ORDER BY created_at DESC
LIMIT 20;
```

## Data Types

| Use Case | Type |
|----------|------|
| Primary key | UUID or BIGINT |
| Money | DECIMAL(19,4) or INTEGER (cents) |
| Timestamps | TIMESTAMP WITH TIME ZONE |
| JSON data | JSONB (Postgres) |
| Enums | VARCHAR with CHECK constraint or native ENUM |
| Text | TEXT (no VARCHAR limit unless truly needed) |
