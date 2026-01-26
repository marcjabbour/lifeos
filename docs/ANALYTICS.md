# Analytics Configuration

LifeOS includes built-in analytics infrastructure for monitoring performance and user activity.

## Performance Monitoring

### Web Vitals
The app automatically tracks Core Web Vitals:

- **LCP** (Largest Contentful Paint) - Target: < 2500ms
- **INP** (Interaction to Next Paint) - Target: < 200ms
- **CLS** (Cumulative Layout Shift) - Target: < 0.1
- **FCP** (First Contentful Paint) - Target: < 1800ms
- **TTFB** (Time to First Byte) - Target: < 800ms

Configuration: `lib/analytics/web-vitals.ts`

### Performance Budgets
Budgets are defined for:
- Page load time
- JavaScript bundle size
- API response times

When budgets are exceeded, alerts are logged for investigation.

## LLM Observability

### Langfuse Integration
All LLM calls are traced through Langfuse for:
- Token usage tracking
- Latency monitoring
- Cost analysis
- Debug traces

**Required Environment Variables:**
```
LANGFUSE_SECRET_KEY=your-secret-key
LANGFUSE_PUBLIC_KEY=your-public-key
LANGFUSE_HOST=https://cloud.langfuse.com
```

### Cost Control
Per-user cost tracking is implemented in `lib/llm/cost-control.ts`:
- Daily budget: $1.00/user
- Alert threshold: 80%
- Hard cap at budget limit

## User Analytics (Optional)

### Option 1: Vercel Analytics
If deploying to Vercel, enable Vercel Analytics in your dashboard:
1. Go to Project Settings > Analytics
2. Enable Web Analytics
3. Optionally enable Speed Insights

### Option 2: Custom Analytics
Add a custom analytics provider in `lib/analytics/`:

```typescript
// lib/analytics/track.ts
export function track(event: string, properties?: Record<string, unknown>) {
  // Send to your analytics provider
  // e.g., PostHog, Mixpanel, Amplitude
}
```

### Key Events to Track
```typescript
// User actions
track('item_created', { source: 'share_sheet' })
track('item_enriched', { category: 'article' })
track('nova_chat_started')
track('pwa_installed')

// Performance
track('web_vital', { metric: 'LCP', value: 1234 })

// Errors
track('error', { type: 'api_error', endpoint: '/api/share' })
```

## Error Tracking (Recommended)

### Sentry Integration
For production error tracking, add Sentry:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Configure in `sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

## Dashboard Options

### Option 1: Langfuse Dashboard
Access your Langfuse dashboard at `cloud.langfuse.com` for:
- LLM usage statistics
- Cost breakdown by model
- Trace debugging

### Option 2: Build Custom Dashboard
Query data from your analytics provider to build custom dashboards showing:
- Daily active users
- Items processed
- Nova conversations
- Error rates

## Monitoring Checklist

- [ ] Langfuse API keys configured
- [ ] Web Vitals reporting active
- [ ] Performance budgets set
- [ ] Error tracking enabled
- [ ] Cost alerts configured
- [ ] Dashboard access verified
