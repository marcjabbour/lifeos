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

### Optional: WhatsApp Integration

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | [Twilio Console](https://console.twilio.com/) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | [Twilio Console](https://console.twilio.com/) |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp sender number | Twilio WhatsApp Senders (format: `whatsapp:+1234567890`) |

See [WHATSAPP_INTEGRATION.md](./WHATSAPP_INTEGRATION.md) for full setup instructions.

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

Inngest handles background job processing for content extraction and AI processing.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `INNGEST_EVENT_KEY` | Yes | API key for sending events to Inngest |
| `INNGEST_SIGNING_KEY` | Production only | Webhook signature verification |

### Local Development

For local development, you have two options:

**Option A: Use Inngest Dev Server (Recommended)**

No API keys required. Run the local dev server:

```bash
npx inngest-cli@latest dev
```

This starts a local Inngest dashboard at `http://localhost:8288`. Your app will automatically connect to it when running locally.

**Option B: Use Inngest Cloud**

1. Go to [app.inngest.com](https://app.inngest.com)
2. Create an account and app
3. Go to **Settings** > **Keys**
4. Copy your **Event Key** (for development environment)
5. Add to `.env.local`:
   ```
   INNGEST_EVENT_KEY=your_event_key_here
   ```

### Production Deployment

1. **Create Inngest Account**
   - Go to [app.inngest.com](https://app.inngest.com)
   - Create a new app (or use existing)

2. **Get Production Keys**
   - Go to **Settings** > **Keys**
   - Copy your **Event Key** (production environment)
   - Copy your **Signing Key** (for webhook verification)

3. **Set Environment Variables in Vercel**
   ```
   INNGEST_EVENT_KEY=<production-event-key>
   INNGEST_SIGNING_KEY=<production-signing-key>
   ```

4. **Configure Webhook URL**
   - In Inngest Dashboard, add your app URL
   - Webhook endpoint: `https://yourdomain.com/api/inngest`

### Verify Functions

Inngest functions are automatically deployed when you deploy to Vercel.
The webhook endpoint is `/api/inngest`.

In Inngest Dashboard, verify your functions are registered:
- `lifeos/job.created` - Content processing trigger
- `lifeos/job.failed` - Job failure handler

## WhatsApp Integration (Production)

To enable WhatsApp messaging in production:

1. **Get a WhatsApp Business Number** from Twilio (requires approval)
2. **Set environment variables** (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`)
3. **Configure webhook URL** in Twilio to `https://yourdomain.com/api/whatsapp/webhook`

See [WHATSAPP_INTEGRATION.md](./WHATSAPP_INTEGRATION.md) for detailed instructions.

## Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test authentication flow
- [ ] Test content sharing via iOS Share Sheet
- [ ] Test push notifications
- [ ] Verify Inngest functions are running
- [ ] Check Langfuse for observability data
- [ ] Test PWA installation
- [ ] Verify offline functionality
- [ ] (Optional) Configure WhatsApp webhook URL in Twilio

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

### Inngest "Event key not found" Error

If you see `Inngest API Error: 401 Event key not found`:

1. **Missing Event Key**: Ensure `INNGEST_EVENT_KEY` is set in your environment
2. **Wrong Environment**: Make sure you're using the correct key for your environment (dev vs production)
3. **Key Rotation**: If you rotated keys in Inngest dashboard, update your environment variables
4. **Local Dev**: For local development, either:
   - Run `npx inngest-cli@latest dev` (no key needed)
   - Or add a valid event key from Inngest Cloud
