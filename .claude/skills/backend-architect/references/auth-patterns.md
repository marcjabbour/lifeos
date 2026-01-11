# Authentication Patterns Reference

## Choosing an Approach

| Approach | Best For | Trade-offs |
|----------|----------|------------|
| **JWT** | Mobile apps, SPAs with multiple backends, microservices | Stateless but can't revoke without blacklist |
| **Sessions** | Traditional web apps, simple SPAs | Simpler, revocable, requires session store |
| **OAuth2** | Third-party login (Google, GitHub) | Complex but standard, good UX |

## JWT Implementation

### Token Structure
```
Header.Payload.Signature
```

### Payload (keep minimal)
```json
{
  "sub": "user-uuid",
  "iat": 1640000000,
  "exp": 1640003600
}
```

Don't store sensitive data in JWT payload (it's base64, not encrypted).

### Token Flow
```
1. User logs in with credentials
2. Server validates, returns access token (+ refresh token)
3. Client stores tokens (httpOnly cookie or memory)
4. Client sends: Authorization: Bearer <token>
5. Server validates signature and expiry
```

### Token Refresh Pattern
```
Access token:  Short-lived (15min - 1hr)
Refresh token: Long-lived (7-30 days), stored securely

When access token expires:
1. Client sends refresh token to /auth/refresh
2. Server validates refresh token
3. Server issues new access token
4. Optionally rotate refresh token
```

### Security Considerations
- Store in httpOnly cookie (preferred) or memory (not localStorage)
- Use short expiry for access tokens
- Implement token blacklist for logout (if needed)
- Use RS256 (asymmetric) for distributed validation

## Session Implementation

### Session Flow
```
1. User logs in with credentials
2. Server creates session, stores in Redis/DB
3. Server sets session ID in httpOnly cookie
4. Client automatically sends cookie
5. Server looks up session on each request
```

### Session Storage
```
Redis: Fast, auto-expiry, good for distributed systems
Database: Simple, already have it, slower
Memory: Development only, not for production
```

### Cookie Settings
```
httpOnly: true      // Not accessible via JavaScript
secure: true        // HTTPS only
sameSite: 'lax'     // CSRF protection
maxAge: 86400000    // Expiry in ms
```

## Password Handling

### Hashing
```
Use: bcrypt, argon2, or scrypt
Never: MD5, SHA1, SHA256 (without salt/key stretching)

Cost factor: High enough to take ~100-300ms
```

### Password Requirements
- Minimum 8 characters
- Check against common passwords list
- Don't require special characters (encourages bad patterns)
- Support long passwords (up to 128 chars)

## OAuth2 / Social Login

### Flow (Authorization Code)
```
1. User clicks "Login with Google"
2. Redirect to Google's authorization endpoint
3. User authenticates with Google
4. Google redirects back with authorization code
5. Server exchanges code for tokens (server-side)
6. Server fetches user info from Google
7. Server creates/updates local user, starts session
```

### Provider Data to Store
```sql
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider VARCHAR(50),       -- 'google', 'github'
  provider_user_id VARCHAR,   -- ID from provider
  UNIQUE(provider, provider_user_id)
);
```

## Authorization Patterns

### Role-Based Access Control (RBAC)
```sql
-- Simple: role column on user
ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user';

-- Complex: separate roles table
CREATE TABLE roles (id, name);
CREATE TABLE user_roles (user_id, role_id);
CREATE TABLE role_permissions (role_id, permission);
```

### Permission Checking
```javascript
// Middleware approach
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage
app.delete('/users/:id', requireRole('admin'), deleteUser);
```

### Resource-Based Authorization
```javascript
// Check ownership
async function canEditPost(userId, postId) {
  const post = await Post.findById(postId);
  return post.authorId === userId;
}
```

## Security Checklist

- [ ] Passwords hashed with bcrypt/argon2
- [ ] Tokens stored in httpOnly cookies (not localStorage)
- [ ] HTTPS in production
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after failed attempts
- [ ] Secure password reset flow (time-limited tokens)
- [ ] CSRF protection for cookie-based auth
- [ ] Input validation on all auth endpoints
