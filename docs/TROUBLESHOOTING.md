# LifeOS Troubleshooting Guide

## Common Issues

### Authentication Issues

#### "Unauthorized" Error (401)
**Symptoms:** API calls fail with 401 status, redirected to login

**Solutions:**
1. Clear browser cookies and log in again
2. Check if session has expired (24h timeout)
3. Verify Supabase auth configuration:
   ```bash
   # Check environment variables
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

#### OAuth Login Fails
**Symptoms:** Google/GitHub login redirects but doesn't complete

**Solutions:**
1. Verify OAuth redirect URLs in Supabase dashboard match your domain
2. Check that OAuth providers are enabled in Supabase Auth settings
3. Ensure callback URL is `https://your-domain.com/auth/callback`

### Database Issues

#### "Row Level Security" Errors
**Symptoms:** Queries return empty or fail with RLS errors

**Solutions:**
1. Ensure user is authenticated before querying
2. Check RLS policies in Supabase dashboard
3. Verify the user owns the resource being accessed

#### Migration Failures
**Symptoms:** Database schema out of sync, missing tables

**Solutions:**
```bash
# Reset local database
npx supabase db reset

# Push migrations to remote
npx supabase db push
```

### AI/Nova Issues

#### "Budget Exceeded" Error
**Symptoms:** Nova requests fail with budget error

**Solutions:**
1. Check current usage: Settings > Usage
2. Wait for monthly reset or upgrade plan
3. Reduce AI usage by disabling auto-enrichment

#### Slow AI Responses
**Symptoms:** Nova takes >30 seconds to respond

**Solutions:**
1. Check OpenAI status: https://status.openai.com
2. Reduce content size being processed
3. Check background job queue for backlog

### Performance Issues

#### Slow Initial Load
**Symptoms:** First page load takes >5 seconds

**Solutions:**
1. Check Web Vitals in browser DevTools
2. Verify CDN caching is working:
   ```bash
   curl -I https://your-domain.com | grep -i cache
   ```
3. Review bundle size: `npm run build` and check output

#### Memory Issues in Development
**Symptoms:** Node.js crashes with heap allocation errors

**Solutions:**
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

### PWA Issues

#### Service Worker Not Updating
**Symptoms:** Old content shown after deployment

**Solutions:**
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Clear service worker:
   - Open DevTools > Application > Service Workers
   - Click "Unregister"
3. Check for SW update errors in console

#### Push Notifications Not Working
**Symptoms:** No notifications received

**Solutions:**
1. Check browser notification permissions
2. Verify VAPID keys are configured
3. Test subscription endpoint is valid

### Build Issues

#### TypeScript Errors
**Symptoms:** Build fails with type errors

**Solutions:**
```bash
# Check types without building
npm run type-check

# Clear Next.js cache
rm -rf .next
npm run build
```

#### Missing Environment Variables
**Symptoms:** Build fails or app crashes on load

**Solutions:**
1. Copy example env file:
   ```bash
   cp .env.example .env.local
   ```
2. Verify all required variables are set
3. For Vercel: Add variables in project settings

### Testing Issues

#### E2E Tests Failing Locally
**Symptoms:** Playwright tests fail with timeout errors

**Solutions:**
```bash
# Install browsers
npx playwright install

# Run with headed mode to debug
npm run test:e2e -- --headed

# Run single test file
npm run test:e2e -- e2e/feed.spec.ts
```

#### Tests Pass Locally, Fail in CI
**Symptoms:** Green locally, red in GitHub Actions

**Solutions:**
1. Check CI logs for specific error
2. Ensure test database is seeded
3. Verify environment variables are set in CI

## Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `NEXT_REDIRECT` | Invalid redirect attempt | Check middleware configuration |
| `PGRST116` | No rows returned | Verify RLS policies |
| `rate_limit_exceeded` | Too many API calls | Wait and implement backoff |
| `invalid_api_key` | Bad OpenAI key | Verify OPENAI_API_KEY |
| `quota_exceeded` | OpenAI quota hit | Check billing or wait for reset |

## Getting Help

1. **Search existing issues:** https://github.com/your-org/lifeos/issues
2. **Check logs:**
   ```bash
   # Local logs
   npm run dev 2>&1 | tee dev.log

   # Vercel logs
   vercel logs your-deployment-url
   ```
3. **Community:** Join our Discord for community support
4. **File a bug:** Use the issue template with reproduction steps

## Debug Mode

Enable debug logging:
```bash
# Enable all debug output
DEBUG=* npm run dev

# Enable specific modules
DEBUG=lifeos:* npm run dev
```

Browser debug:
```javascript
// In browser console
localStorage.setItem('debug', 'lifeos:*');
location.reload();
```
