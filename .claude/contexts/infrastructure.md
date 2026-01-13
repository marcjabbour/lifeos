# Infrastructure Context

Load this context for: CI/CD, Docker, deployment, cloud, monitoring, DevOps.

## Agent: infra-engineer

**Model:** Opus
**Responsibilities:** DevOps, CI/CD pipelines, Docker, cloud deployment, environment management, monitoring/observability

## Common Tasks

### Docker
- Dockerfile optimization (multi-stage builds, layer caching)
- Docker Compose for local development
- Container orchestration patterns
- Image security scanning

### CI/CD
- GitHub Actions workflows
- Build pipelines
- Test automation
- Deployment automation
- Environment promotion (dev → staging → prod)

### Cloud Deployment
- Vercel / Netlify (frontend)
- Railway / Render / Fly.io (backend)
- AWS / GCP / Azure (full control)
- Supabase (BaaS)

### Environment Management
- Environment variables
- Secrets management
- Configuration per environment
- Feature flags

### Monitoring & Observability
- Logging strategy
- Error tracking (Sentry, etc.)
- APM (Application Performance Monitoring)
- Alerting

## Best Practices

1. **Infrastructure as Code** - Everything version controlled
2. **Immutable deployments** - Don't modify running instances
3. **Environment parity** - Dev ≈ Staging ≈ Prod
4. **Secrets never in code** - Use environment variables or secret managers
5. **Rollback capability** - Every deploy should be reversible

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Secrets stored securely (not in repo)
- [ ] Health check endpoint exists
- [ ] Logging configured
- [ ] Error tracking enabled
- [ ] SSL/TLS configured
- [ ] Database migrations run
- [ ] Rollback plan documented

## Auto-Trigger

Invoke infra-engineer agent when:
- Setting up CI/CD
- Docker configuration
- Deployment questions
- Cloud architecture
- Environment setup
- Monitoring/alerting
