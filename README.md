# LifeOS

AI-powered personal life dashboard with Nova reasoning engine for intelligent content capture, processing, and insights delivery.

## Overview

LifeOS is a two-part system: **iOS Share Sheet gatherer** + **Web dashboard hub** powered by Nova, a reasoning-first AI assistant that dynamically processes any content without predefined categories.

**Core Innovation:** Nova reasons about what to do with your content, not pattern-matching to categories.

## Quick Start

### Prerequisites

- Node.js 19.x or later
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/marcjabbour/lifeos.git
cd lifeos

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Configure your environment variables (see Configuration section)

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

### Configuration

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Langfuse (observability)
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
```

## Project Structure

```
lifeos/
├── app/                    # Legacy API routes (being migrated)
│   └── api/               # Backend API endpoints
├── src/
│   ├── app/               # Next.js 15 App Router
│   │   ├── api/          # New API routes
│   │   └── (pages)       # Page components
│   ├── components/       # React components
│   │   ├── chat/        # Chat interface
│   │   ├── error/       # Error handling components
│   │   ├── feed/        # Items feed
│   │   ├── icons/       # SVG icon components
│   │   ├── layout/      # Layout components
│   │   ├── providers/   # Context providers
│   │   └── ui/          # UI components
│   └── lib/             # Shared utilities (frontend)
├── lib/                   # Core libraries (backend)
│   ├── analytics/       # Web Vitals monitoring
│   ├── auth/            # Authentication middleware
│   ├── db/              # Database clients
│   ├── jobs/            # Background job functions
│   ├── push/            # Push notifications
│   ├── pwa/             # PWA utilities
│   ├── realtime/        # Supabase Realtime
│   └── validation/      # Input validation schemas
├── types/                # TypeScript type definitions
├── public/               # Static assets
│   ├── icons/           # App icons
│   ├── manifest.json    # PWA manifest
│   └── sw.js            # Service worker
├── e2e/                  # End-to-end tests
└── docs/                 # Documentation
```

## Available Scripts

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run inngest-dev    # Start Inngest dev server
npm run test:e2e       # Run Playwright E2E tests
npm run test:e2e:ui    # Run tests with UI
npm run test:e2e:headed # Run tests with browser visible
npm run test:e2e:report # View test report
```

## Key Features

### Nova AI Assistant
- **Perception Engine**: Quick content analysis via GPT-4o-mini
- **Reasoning Engine**: Complex decision-making with GPT-4o
- **Planning System**: Dynamic action plans with durable execution
- **RAG Integration**: Semantic search via pgvector

### Progressive Web App
- Installable on iOS/Android
- Offline support with service worker caching
- Web Push notifications
- iOS Share Sheet integration

### Real-time Updates
- Supabase Realtime subscriptions
- Live job status updates
- Instant feed synchronization

## Performance

Performance budgets are enforced:
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **Bundle size**: < 200KB gzipped

Web Vitals monitoring is built-in and reports to `/api/analytics/vitals`.

## Testing

E2E tests are written with Playwright:

```bash
# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/feed.spec.ts

# Run in UI mode
npm run test:e2e:ui
```

## Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

Quick Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system architecture details.

See [docs/AI-ARCHITECTURE.md](docs/AI-ARCHITECTURE.md) for Nova AI system design.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## License

ISC License - see LICENSE file for details.
