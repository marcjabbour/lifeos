# LifeOS API Documentation

## Authentication

All API endpoints require authentication via one of:

1. **Session Cookie** - For browser-based requests
2. **API Key** - Bearer token in Authorization header

```
Authorization: Bearer <api_key>
```

## Endpoints

### Items

#### GET /api/items

List user items with pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `cursor` | string | Pagination cursor |
| `limit` | number | Items per page (default: 20, max: 50) |
| `search` | string | Search query |
| `has_enrichment` | boolean | Filter by enrichment status |
| `is_archived` | boolean | Filter by archive status |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "content": "https://example.com",
      "content_type": "url",
      "metadata": { "title": "Example", "description": "..." },
      "enrichment": { "summary": "...", "insights": [...] },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "next_cursor": "cursor_string",
  "has_more": true
}
```

#### GET /api/items/:id

Get a single item by ID.

**Response:**
```json
{
  "item": {
    "id": "uuid",
    "content": "https://example.com",
    "content_type": "url",
    "metadata": {...},
    "enrichment": {...},
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### DELETE /api/items/:id

Archive/delete an item.

**Response:**
```json
{
  "success": true,
  "message": "Item archived"
}
```

### Share

#### POST /api/share

Create a new item from shared content.

**Request Body:**
```json
{
  "content": "https://example.com",
  "content_type": "url",
  "source": "ios_shortcut",
  "callback_url": "https://..."
}
```

**Content Types:**
- `url` - Web URLs (max 2048 chars)
- `text` - Plain text (max 50K chars)
- `image` - Base64 image (JPEG/PNG/WebP/GIF, max 10MB)

**Response:**
```json
{
  "success": true,
  "action": "Created item and started processing",
  "item_id": "uuid",
  "job_id": "uuid",
  "message": "Nova is analyzing your content"
}
```

### Jobs

#### GET /api/jobs/:id

Get job status.

**Response:**
```json
{
  "job": {
    "id": "uuid",
    "status": "completed",
    "step": 3,
    "total_steps": 3,
    "plan": {...},
    "results": {...},
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Status Values:**
- `pending` - Job queued
- `processing` - Job running
- `completed` - Job finished
- `failed` - Job failed

### Push Notifications

#### POST /api/push/subscribe

Register for push notifications.

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "subscription_id": "uuid"
}
```

#### POST /api/push/unsubscribe

Unregister from push notifications.

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/..."
}
```

**Response:**
```json
{
  "success": true
}
```

### Conversation

#### POST /api/conversation/reply

Send a message in a conversation.

**Request Body:**
```json
{
  "conversation_id": "uuid",
  "message_content": "What patterns do you see?"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Based on your recent items...",
    "timestamp": "..."
  }
}
```

### Analytics

#### POST /api/analytics/vitals

Report Web Vitals metrics.

**Request Body:**
```json
{
  "name": "LCP",
  "value": 2500,
  "rating": "good",
  "delta": 100,
  "id": "v3-1234",
  "page": "/",
  "timestamp": 1704067200000
}
```

**Response:**
```json
{
  "success": true
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST /api/share | 30/minute |
| GET /api/items | 60/minute |
| All others | 120/minute |

Rate limit headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1704067260
```

## Webhooks

### Inngest Webhook

`POST /api/inngest`

Inngest uses this endpoint to trigger background jobs.

## SDKs

### JavaScript/TypeScript

```typescript
// Using fetch
const response = await fetch('/api/items', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

### iOS Shortcut

Use the HTTP Request action:
1. URL: `https://your-domain.com/api/share`
2. Method: POST
3. Headers: `Authorization: Bearer <api_key>`
4. Request Body: JSON with content and content_type
