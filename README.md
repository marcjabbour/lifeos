# LifeOS

AI-powered personal life dashboard with intelligent content capture, processing, and insights delivery.

## Architecture

LifeOS is a production-ready monorepo with clear separation of concerns:

```
lifeos/
├── packages/
│   ├── shared/          # Shared types, contracts, utilities
│   └── db/              # Database client & queries
├── frontend/            # Next.js 15 web application
├── backend/             # Hono API & Inngest orchestration
└── services/
    └── adk-agent/       # Google ADK AI microservice
```

## Quick Start

### Prerequisites

- Node.js 20.x or later
- pnpm 9.x
- Docker & Docker Compose (for containerized deployment)
- Supabase account
- OpenAI API key

### Development Setup

```bash
# Clone the repository
git clone https://github.com/marcjabbour/lifeos.git
cd lifeos

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Build shared packages
pnpm build:packages

# Start all services in development mode
pnpm dev
```

### Docker Development

```bash
# Start all services with hot reloading
docker-compose -f docker-compose.dev.yml up

# Or start specific services
docker-compose -f docker-compose.dev.yml up frontend backend
```

### Docker Production

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js 15 PWA |
| Backend | 4000 | Hono API + Inngest |
| ADK Agent | 4001 | AI processing service |
| Inngest Dev | 8288 | Job queue dashboard (dev only) |

## Available Scripts

```bash
# Development
pnpm dev              # Start all services in dev mode
pnpm dev:frontend     # Start frontend only
pnpm dev:backend      # Start backend only
pnpm dev:adk          # Start ADK agent only

# Building
pnpm build            # Build all packages and services
pnpm build:packages   # Build shared packages only
pnpm build:frontend   # Build frontend only
pnpm build:backend    # Build backend only

# Quality
pnpm lint             # Run ESLint across all packages
pnpm typecheck        # Run TypeScript type checking
pnpm format           # Format code with Prettier

# Testing
pnpm test             # Run all tests
```

## Configuration

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_ai_key

# Langfuse (observability)
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_HOST=https://cloud.langfuse.com

# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# Twilio/WhatsApp
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=your_whatsapp_number

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

## System Flow

```
WhatsApp/Web/Share → Backend (Hono) → Inngest → ADK Agent → Database → Frontend
                                                    ↓
                                              Langfuse (tracing)
```

1. Content arrives via WhatsApp webhook, web app, or iOS share sheet
2. Backend immediately acknowledges and triggers Inngest job
3. Inngest calls ADK Agent service for AI processing
4. Results are persisted to Supabase
5. Frontend receives real-time updates via Supabase Realtime

## Key Features

- **Multi-Agent AI System**: Input analyzer, action decider, and action executor
- **Progressive Web App**: Installable, offline-capable, push notifications
- **WhatsApp Integration**: Send content via WhatsApp for processing
- **Real-time Updates**: Live synchronization via Supabase Realtime
- **Durable Jobs**: Inngest-powered background processing with retries

## Deployment

### CI/CD

GitHub Actions workflows handle:
- **build.yml**: Lint, typecheck, and build Docker images on PR/push
- **deploy.yml**: Build and push images to GHCR, trigger deployment

### Manual Deployment

```bash
# Build production images
docker-compose build

# Push to registry (configure registry in docker-compose.yml)
docker-compose push

# Deploy on server
docker-compose pull
docker-compose up -d
```

## Documentation

- [REFACTOR.md](REFACTOR.md) - Architecture decisions and refactoring plan
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture details
- [docs/AI-ARCHITECTURE.md](docs/AI-ARCHITECTURE.md) - AI system design

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

ISC License - see LICENSE file for details.
