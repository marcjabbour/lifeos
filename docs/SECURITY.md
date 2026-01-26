# LifeOS Security Documentation

## Overview

LifeOS implements defense-in-depth security with multiple layers of protection.

## Authentication

### Dual Authentication System

LifeOS supports two authentication methods:

#### 1. Session Authentication (Web/PWA)
- JWT tokens stored in httpOnly cookies
- Automatic token refresh
- Used for browser-based access

#### 2. API Key Authentication (iOS/Mobile)
- Bearer token format: `Authorization: Bearer lifeos_...`
- SHA256 hashed key storage
- Expiration date enforcement
- Scope-based permissions

### API Key Management

```bash
# Generate new API key (via dashboard)
# Keys are prefixed: lifeos_xxxxxxxx...

# Key rotation process:
1. Generate new key in dashboard
2. Update iOS Shortcut with new key
3. Revoke old key after confirming new key works
```

## Authorization

### Row Level Security (RLS)

All user data is protected by Supabase RLS policies:

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Protected Tables:**
- `items` - User content
- `jobs` - Processing jobs
- `conversations` - Chat history
- `embeddings` - Vector data
- `push_subscriptions` - Notification tokens
- `user_profile` - User preferences

### Service Role Key

The service role key bypasses RLS and is:
- **NEVER** exposed to clients
- Only used in backend jobs and admin operations
- Stored securely in environment variables

## Input Validation

### URL Validation
- Maximum length: 2,048 characters
- Allowed protocols: HTTP, HTTPS only
- Blocked: `file://`, localhost, private IPs
- SSRF protection: Rejects internal network addresses

### Text Validation
- Maximum length: 50,000 characters
- Control characters sanitized
- Empty content rejected

### Image Validation
- Maximum size: 10MB
- Allowed types: JPEG, PNG, WebP, GIF
- Maximum dimensions: 4096x4096
- Base64 format validation

## Security Headers

### HTTP Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| `Content-Security-Policy` | See below | Prevent XSS/injection |
| `Permissions-Policy` | Restrictive | Limit browser features |

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com;
frame-ancestors 'none';
form-action 'self';
base-uri 'self';
upgrade-insecure-requests;
```

## Rate Limiting

### Endpoint Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/share` | 30 | 1 minute |
| `POST /api/conversation` | 60 | 1 minute |
| `GET /api/items` | 100 | 1 minute |
| `GET /api/jobs/:id` | 120 | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1704067260
```

## XSS Protection

### Content Sanitization

User-generated content is sanitized before rendering:

```typescript
import { sanitizeHtml } from '@/lib/security/sanitize';

// Sanitize user content before display
const safeContent = sanitizeHtml(userContent);
```

### Safe Rendering

React's JSX automatically escapes content:

```tsx
// Safe - content is escaped
<p>{userContent}</p>

// Dangerous - avoid unless sanitized
<div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```

## SQL Injection Protection

Supabase client uses parameterized queries:

```typescript
// Safe - parameters are escaped
const { data } = await supabase
  .from('items')
  .select('*')
  .eq('user_id', userId)
  .ilike('content', `%${searchTerm}%`);
```

## CORS Configuration

API routes are same-origin by default. Cross-origin requests require explicit configuration.

**Current Policy:**
- Same-origin requests: Allowed
- Cross-origin requests: Blocked by default
- iOS Shortcuts: Use API key authentication

## Secrets Management

### Environment Variables

All secrets are stored in environment variables:

```bash
# Required secrets
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Never commit:
# - API keys
# - Database credentials
# - JWT secrets
```

### Secret Rotation

1. **Supabase Keys:** Rotate via Supabase dashboard
2. **API Keys:** Users can regenerate in app settings
3. **OpenAI Keys:** Rotate monthly or on suspected compromise

## Vulnerability Reporting

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to the maintainers
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Checklist

### Development
- [ ] Never log sensitive data
- [ ] Use parameterized queries
- [ ] Validate all user input
- [ ] Sanitize output for display
- [ ] Use HTTPS for all external requests

### Deployment
- [ ] All secrets in environment variables
- [ ] RLS policies enabled
- [ ] Rate limiting configured
- [ ] Security headers verified
- [ ] HTTPS enforced
- [ ] Error messages don't leak sensitive info

### Ongoing
- [ ] Monitor for suspicious activity
- [ ] Rotate API keys regularly
- [ ] Keep dependencies updated
- [ ] Review access logs
- [ ] Test RLS policies periodically
