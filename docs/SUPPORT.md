# LifeOS Support Process

## Getting Help

### Self-Service Resources

1. **Documentation**
   - [README.md](../README.md) - Quick start guide
   - [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
   - [PWA-INSTALL.md](PWA-INSTALL.md) - Mobile installation guide

2. **In-App Help**
   - Use the chat interface to ask Nova for help
   - Access settings for configuration options

### Reporting Issues

#### GitHub Issues
Report bugs and request features at:
https://github.com/marcjabbour/lifeos/issues

When reporting an issue, include:

```markdown
**Environment:**
- Browser: (e.g., Safari 17, Chrome 120)
- Device: (e.g., iPhone 15, Pixel 8)
- OS: (e.g., iOS 17.2, Android 14)

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Screenshots/Videos:**
(if applicable)

**Additional Context:**
Any other relevant information
```

#### Bug Categories

| Priority | Description | Response Time |
|----------|-------------|---------------|
| Critical | App unusable, data loss | < 24 hours |
| High | Major feature broken | 2-3 days |
| Medium | Minor feature issue | 1 week |
| Low | Enhancement request | Backlog |

## For Developers

### Debug Mode

Enable verbose logging in development:
```bash
DEBUG=lifeos:* npm run dev
```

### Checking Logs

1. **Browser Console**
   - Open DevTools (F12 or Cmd+Option+I)
   - Check Console tab for errors

2. **Server Logs**
   - Check Vercel dashboard for deployment logs
   - Monitor Langfuse for LLM issues

3. **Database**
   - Check Supabase dashboard for query issues
   - Review RLS policy violations

### Common Debug Steps

1. **API Issues**
   - Check Network tab for failed requests
   - Verify authentication token is present
   - Check Supabase logs for errors

2. **Performance Issues**
   - Run Lighthouse audit
   - Check Web Vitals in Performance tab
   - Review Langfuse for slow LLM calls

3. **PWA Issues**
   - Check Application > Service Workers
   - Clear cache and re-register SW
   - Verify manifest.json is loading

## Contact

### Project Maintainer
- GitHub: [@marcjabbour](https://github.com/marcjabbour)
- Issues: [GitHub Issues](https://github.com/marcjabbour/lifeos/issues)

### Response Expectations
- Issue acknowledgment: Within 48 hours
- Critical bugs: Fix deployed within 1 week
- Feature requests: Reviewed in next planning cycle

## FAQ

### Why isn't my shared content being enriched?

Check the following:
1. Verify OPENAI_API_KEY is configured
2. Check Inngest dashboard for job status
3. Review Langfuse for LLM errors
4. Ensure daily budget hasn't been exceeded

### Why aren't push notifications working?

1. Verify VAPID keys are configured
2. Check browser notification permissions
3. Ensure service worker is registered
4. Test subscription in Application > Service Workers

### How do I reset my data?

Currently, data must be manually deleted from Supabase:
1. Access Supabase dashboard
2. Navigate to Table Editor
3. Delete records as needed

### Why is the app slow?

1. Check network connectivity
2. Review Web Vitals metrics
3. Check for large payloads in Network tab
4. Monitor LLM latency in Langfuse

### Can I use LifeOS offline?

Yes! The PWA supports offline mode:
1. Install as PWA (see PWA-INSTALL.md)
2. Previously viewed content is cached
3. New items queue and sync when online
