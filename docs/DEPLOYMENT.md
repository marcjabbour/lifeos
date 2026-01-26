# LifeOS Deployment Guide

This guide covers deploying LifeOS to production.

## Prerequisites

- Vercel account (recommended) or other Node.js hosting
- Supabase project
- OpenAI API key
- Langfuse account (for observability)
- VAPID keys for push notifications

## Environment Variables

### Required Variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard > Settings > API |
| `OPENAI_API_KEY` | OpenAI API key | OpenAI Dashboard |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key | Langfuse Dashboard |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key | Langfuse Dashboard |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key | Generate with web-push |
| `VAPID_PRIVATE_KEY` | VAPID private key | Generate with web-push |
| `INNGEST_EVENT_KEY` | Inngest event key | Inngest Dashboard |
| `INNGEST_SIGNING_KEY` | Inngest signing key | Inngest Dashboard |

### Generating VAPID Keys

```bash
npx web-push generate-vapid-keys
```

This will output both public and private keys.

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the repository

### 2. Configure Environment Variables

In the Vercel project settings:

1. Go to Settings > Environment Variables
2. Add all required variables from the table above
3. Set appropriate environments (Production, Preview, Development)

### 3. Configure Build Settings

Default settings should work:
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 4. Deploy

Click "Deploy" and wait for the build to complete.

## Supabase Setup

### 1. Create Tables

Run the SQL migrations in order:

```bash
# From supabase/migrations directory
# Or use Supabase Dashboard > SQL Editor
```

Required tables:
- `items` - User content items
- `jobs` - Background job tracking
- `conversations` - Chat history
- `push_subscriptions` - Push notification endpoints
- `api_keys` - API authentication keys
- `embeddings` - Vector embeddings for RAG
- `user_profile` - User preferences and summaries
- `usage_tracking` - LLM cost tracking

### 2. Enable Extensions

```sql
-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Enable Realtime

In Supabase Dashboard > Database > Replication:
1. Enable Realtime for `items`, `jobs`, `conversations` tables

Or via SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

### 4. Configure RLS Policies

Ensure Row Level Security is enabled and policies are set for all tables.

## Inngest Setup

### 1. Create Inngest Account

1. Go to [inngest.com](https://inngest.com)
2. Create a new app
3. Copy your event key and signing key

### 2. Deploy Inngest Functions

Inngest functions are automatically deployed when you deploy to Vercel.
The webhook endpoint is `/api/inngest`.

### 3. Verify Functions

In Inngest Dashboard, verify your functions are registered:
- `nova/process-item` - Content processing
- `nova/send-notification` - Push notifications

## Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test authentication flow
- [ ] Test content sharing via iOS Share Sheet
- [ ] Test push notifications
- [ ] Verify Inngest functions are running
- [ ] Check Langfuse for observability data
- [ ] Test PWA installation
- [ ] Verify offline functionality

## Monitoring

### Vercel Analytics

Enable Vercel Analytics in your project settings for:
- Web Vitals monitoring
- Request metrics
- Error tracking

### Langfuse

Langfuse provides:
- LLM cost tracking
- Token usage analytics
- Latency monitoring
- Trace visualization

### Error Tracking

Consider adding Sentry for production error tracking:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

## Scaling Considerations

### Database

- Enable connection pooling in Supabase
- Add indexes for frequently queried columns
- Monitor query performance

### API Rate Limiting

Rate limits are configured in `lib/auth/rate-limit.ts`:
- 30 requests/minute for /api/share
- Adjust based on usage patterns

### LLM Costs

Token budgets are set in `lib/cost-control/index.ts`:
- Per request: 8,000 tokens
- Per job: 50,000 tokens
- Daily per user: 200,000 tokens
- Monthly per user: 2,000,000 tokens

## Troubleshooting

### Build Failures

1. Check environment variables are set
2. Verify Node.js version (19.x required)
3. Clear `.next` cache: `rm -rf .next`

### Database Connection Issues

1. Check Supabase service status
2. Verify connection strings
3. Check RLS policies

### Push Notifications Not Working

1. Verify VAPID keys are correct
2. Check service worker registration
3. Verify push subscription is stored

### Inngest Functions Not Running

1. Check webhook URL is accessible
2. Verify signing key is correct
3. Check Inngest dashboard for errors
