# LifeOS Development Guide

This guide covers local development setup and best practices.

## Prerequisites

- Node.js 19.x or later
- npm 9.x or later
- Git
- VS Code (recommended)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/marcjabbour/lifeos.git
cd lifeos
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials.

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Project Architecture

### Directory Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   ├── (pages)/        # Page components
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   ├── providers.tsx   # Client providers
│   ├── error.tsx       # Error boundary
│   └── not-found.tsx   # 404 page
│
├── components/
│   ├── chat/           # Chat interface
│   ├── error/          # Error components
│   ├── feed/           # Items feed
│   ├── icons/          # SVG icons
│   ├── layout/         # Shell, nav
│   ├── providers/      # Context providers
│   └── ui/             # Reusable UI
│
└── lib/                # Frontend utilities
```

```
lib/                    # Backend utilities
├── analytics/          # Web Vitals
├── auth/               # Auth middleware
├── db/                 # Supabase client
├── jobs/               # Inngest functions
├── push/               # Push notifications
├── pwa/                # Service worker
├── realtime/           # Supabase Realtime
└── validation/         # Zod schemas
```

### Key Patterns

#### Server Components (Default)
```tsx
// app/page.tsx
export default function Page() {
  return <div>Server-rendered by default</div>
}
```

#### Client Components
```tsx
// components/interactive.tsx
"use client"

import { useState } from "react"

export function Interactive() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

#### API Routes
```tsx
// app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Hello" })
}
```

## Code Style

### TypeScript

- Strict mode enabled
- Explicit return types for exported functions
- Use `type` over `interface` when possible

### React

- Functional components only
- Hooks for state/effects
- Server components by default
- "use client" only when needed

### Styling

- Tailwind CSS for all styling
- CSS custom properties for theme values
- Mobile-first responsive design

## Testing

### E2E Tests with Playwright

```bash
# Run all tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test
npx playwright test e2e/feed.spec.ts

# View report
npm run test:e2e:report
```

### Writing Tests

```typescript
// e2e/example.spec.ts
import { test, expect } from "@playwright/test"

test("example test", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("h1")).toBeVisible()
})
```

## Git Workflow

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `chore/description` - Maintenance
- `refactor/description` - Code restructuring
- `docs/description` - Documentation

### Commit Messages

Use conventional commits:

```
feat: add user authentication
fix: resolve infinite scroll issue
chore: update dependencies
docs: add deployment guide
```

### Pull Requests

1. Create feature branch from `develop`
2. Make changes
3. Run tests: `npm run test:e2e`
4. Run lint: `npm run lint`
5. Push and create PR
6. Request review
7. Merge to `develop`

## Debugging

### Browser DevTools

- React DevTools for component inspection
- Network tab for API calls
- Application tab for PWA/Service Worker

### Server Logs

```bash
# View dev server logs
npm run dev
```

### Inngest Dev Server

```bash
# Run Inngest dev server
npm run inngest-dev
```

Visit `http://localhost:8288` for Inngest dashboard.

## Common Tasks

### Adding a New Page

1. Create file in `src/app/`:
```tsx
// src/app/new-page/page.tsx
export default function NewPage() {
  return <div>New Page</div>
}
```

### Adding a New API Route

1. Create file in `src/app/api/`:
```tsx
// src/app/api/new-endpoint/route.ts
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ data: "value" })
}
```

### Adding a New Component

1. Create component file:
```tsx
// src/components/ui/new-component.tsx
"use client"

export function NewComponent({ children }: { children: React.ReactNode }) {
  return <div className="...">{children}</div>
}
```

2. Export from index:
```tsx
// src/components/ui/index.ts
export { NewComponent } from "./new-component"
```

### Adding a New Icon

1. Add to icons file:
```tsx
// src/components/icons/index.tsx
export function NewIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...props}>
      {/* SVG path */}
    </svg>
  )
}
```

## Performance Tips

1. Use Server Components by default
2. Add "use client" only when needed
3. Use `next/image` for all images
4. Lazy load heavy components
5. Monitor bundle size with `npm run build`

## Troubleshooting

### Module not found

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### Type errors

```bash
# Check types
npx tsc --noEmit
```

### Hot reload not working

```bash
# Restart dev server
# Kill process and run again
npm run dev
```
