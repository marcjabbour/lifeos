# LifeOS Project Task List

> AI-powered personal life dashboard with Nova reasoning engine for intelligent content capture, processing, and insights delivery

## Project Overview

LifeOS is a two-part system: **iOS Share Sheet gatherer** + **Web dashboard hub** powered by Nova, a reasoning-first AI assistant that dynamically processes any content without predefined categories.

**Core Innovation:** Nova reasons about what to do with your content, not pattern-matching to categories.

---

## Workstream Structure

This project is organized into **4 parallel workstreams** with clear sync points:

| Terminal | Workstream | Focus | Duration |
|----------|------------|-------|----------|
| **1** | Infrastructure & Backend | Supabase setup, API routes, auth, database schema | Weeks 1-2 |
| **2** | Frontend Foundation | Next.js 15 setup, design system, layouts, components | Weeks 1-2 |
| **3** | AI/LLM Integration | Nova cognitive loop, Langfuse, model routing, RAG | Weeks 1-3 |
| **4** | Real-time & PWA | Push notifications, Supabase realtime, PWA config, iOS integration | Weeks 2-3 |

**Sync Points:**
- **Sync 1 (End Week 1):** API routes + frontend foundation ready for integration
- **Sync 2 (End Week 2):** Nova perception working + frontend can display items
- **Sync 3 (End Week 3):** Full cognitive loop + PWA + push notifications operational

---

## Progress Overview

| Epic | Progress | Status |
|------|----------|--------|
| **Infrastructure & Backend** | 0/8 | Not Started |
| **Frontend Foundation** | 0/7 | Not Started |
| **AI/LLM Integration** | 0/10 | Not Started |
| **Real-time & PWA** | 0/8 | Not Started |
| **Integration & Polish** | 0/6 | Not Started |

**Overall:** 0/39 tasks complete (0%)

---

# Workstream 1: Infrastructure & Backend

**Branch:** `feature/backend/infrastructure`
**Status:** Not Started
**Target Duration:** Week 1-2

Core backend services, database, and API foundation.

---

### TASK-101: Supabase Project Setup & Configuration
**Status:** [ ] Not Started
**Workstream:** Terminal 1
**Dependencies:** None
**Branch:** `feat/task-101-supabase-setup`

**Description:**
Initialize Supabase project with proper configuration for LifeOS. Set up authentication, realtime subscriptions, and storage buckets.

**Acceptance Criteria:**
- [ ] Supabase project created and configured
- [ ] Database connected to Next.js app via environment variables
- [ ] Supabase Auth enabled with JWT configuration
- [ ] Realtime subscriptions enabled for production
- [ ] S3 bucket configured for media storage
- [ ] Environment files (.env.local, .env.example) created with all required keys

---

### TASK-102: Database Schema - Core Tables
**Status:** [ ] Not Started
**Workstream:** Terminal 1
**Dependencies:** TASK-101
**Branch:** `feat/task-102-db-schema-core`

**Description:**
Create core database tables with proper indexing and constraints: items, jobs, conversations, push_subscriptions, api_keys.

**Acceptance Criteria:**
- [ ] `items` table with JSONB metadata/enrichment, user_id FK, indexes on (user_id, created_at)
- [ ] `jobs` table with JSONB plan/results, status field, step tracking
- [ ] `conversations` table with message array, summary JSONB, user_id FK
- [ ] `push_subscriptions` table with endpoint, keys JSONB, is_active flag
- [ ] `api_keys` table for iOS Shortcut/external auth
- [ ] All tables have user_id FK and created_at timestamps
- [ ] RLS policies enabled (not yet implemented - done in 103)
- [ ] Migrations file generated and tested locally

---

### TASK-103: Database Schema - Vector & User Profile
**Status:** [ ] Not Started
**Workstream:** Terminal 1
**Dependencies:** TASK-102
**Branch:** `feat/task-103-db-schema-vectors`

**Description:**
Create vector embeddings table and user profile table. Enable pgvector extension and set up semantic search infrastructure.

**Acceptance Criteria:**
- [ ] pgvector extension enabled on Supabase
- [ ] `embeddings` table with vector(1536), source_type, source_id, content_hash fields
- [ ] HNSW index created for fast similarity search (m=16, ef_construction=64)
- [ ] `user_profile` table with preferences JSONB, summary TEXT, last_update
- [ ] `usage_tracking` table for LLM cost tracking
- [ ] Deduplication index on (user_id, content_hash) for embeddings
- [ ] SQL migration file created and tested
- [ ] Document index configuration in README

---

### TASK-104: Row Level Security (RLS) Policies
**Status:** [ ] Not Started
**Workstream:** Terminal 1
**Dependencies:** TASK-102, TASK-103
**Branch:** `feat/task-104-rls-policies`

**Description:**
Implement RLS policies for all user-facing tables to enforce multi-tenant isolation at the database level.

**Acceptance Criteria:**
- [ ] RLS enabled on: items, jobs, conversations, push_subscriptions, embeddings, user_profile
- [ ] SELECT policy: users can only view own records (auth.uid() = user_id)
- [ ] INSERT policy: users can only insert own records
- [ ] UPDATE policy: users can only update own records
- [ ] DELETE policy: users can only delete own records
- [ ] Service role key can bypass RLS (for background jobs)
- [ ] Test RLS policies work correctly with test user
- [ ] Document service role key usage restrictions

---

### TASK-105: Authentication Middleware & JWT
**Status:** [ ] Not Started
**Workstream:** Terminal 1
**Dependencies:** TASK-101, TASK-104
**Branch:** `feat/task-105-auth-middleware`

**Description:**
Set up authentication middleware for Next.js API routes supporting both Supabase sessions and API key auth.

**Acceptance Criteria:**
- [ ] Auth middleware created (lib/auth/middleware.ts)
- [ ] Session-based auth: parse JWT from httpOnly cookie
- [ ] API key auth: parse Bearer token from Authorization header
- [ ] Middleware validates auth and injects user context into requests
- [ ] Rate limiting middleware created (per-endpoint limits)
- [ ] Error handling: return 401 for invalid auth, 403 for unauthorized
- [ ] Export useAuth hook for client-side auth state
- [ ] Write tests for middleware with valid/invalid tokens

---

### TASK-106: Core API Routes - Items Endpoints
**Status:** [ ] Not Started
**Workstream:** Terminal 1
**Dependencies:** TASK-105
**Branch:** `feat/task-106-api-items`

**Description:**
Create RESTful API routes for items: GET list, GET single, POST create (async), DELETE, with pagination and filtering.

**Acceptance Criteria:**
- [ ] `GET /api/items` - list user items with pagination (cursor-based)
- [ ] `GET /api/items` - query params: search, has_enrichment, is_archived, limit, cursor
- [ ] `GET /api/items/:id` - fetch single item by ID
- [ ] `POST /api/items` - create item (called internally from share endpoint)
- [ ] `DELETE /api/items/:id` - archive/soft delete item
- [ ] Response includes item.metadata, item.enrichment, timestamps
- [ ] Pagination cursor implementation tested with >20 items
- [ ] Error handling for missing items (404), unauthorized (403)
- [ ] Write integration tests for endpoints

---

### TASK-107: Content Ingestion Pipeline - POST /api/share
**Status:** [ ] Not Started
**Workstream:** Terminal 1
**Dependencies:** TASK-106
**Branch:** `feat/task-107-api-share`

**Description:**
Create POST /api/share endpoint for iOS Share Sheet, Siri Shortcuts, and PWA direct input. Validates content and queues for async processing.

**Acceptance Criteria:**
- [ ] `POST /api/share` endpoint accepts {content, content_type, source, callback_url}
- [ ] Input validation: content_type in ['url', 'text', 'image']
- [ ] URL validation: max 2048 chars, reject localhost/internal IPs, reject file://
- [ ] Text validation: max 50K chars, sanitize control chars
- [ ] Image validation: JPEG/PNG/WebP/GIF, max 10MB, max 4096x4096
- [ ] Quick perception call to GPT-4o-mini (< 3s timeout)
- [ ] Create item + job records in database
- [ ] Enqueue job to Inngest/Trigger.dev
- [ ] Return {success, action, item_id, job_id, message} immediately
- [ ] Support streaming responses (SSE) if Accept: text/event-stream
- [ ] Rate limiting: 30 requests/min per user

---

### TASK-108: Inngest Job Queue Setup
**Status:** [ ] Not Started
**Workstream:** Terminal 1
**Dependencies:** TASK-107
**Branch:** `feat/task-108-inngest-setup`

**Description:**
Configure Inngest/Trigger.dev for durable background job execution with step-level persistence and automatic retries.

**Acceptance Criteria:**
- [ ] Inngest SDK installed and configured
- [ ] Inngest functions endpoint created (lib/inngest/functions.ts)
- [ ] Sample job function with multiple durable steps
- [ ] Step-level state persistence implemented
- [ ] Retry logic configured: exponential backoff for transient errors
- [ ] Error tracking: failed step details logged
- [ ] Local testing with Inngest CLI verified
- [ ] Environment variables for Inngest API keys configured
- [ ] Job status queryable via /api/jobs/:id endpoint

---

# Workstream 2: Frontend Foundation

**Branch:** `feature/frontend/foundation`
**Status:** Not Started
**Target Duration:** Week 1-2

Core frontend setup, design system, and component library.

---

### TASK-201: Next.js 15 Project Setup
**Status:** [ ] Not Started
**Workstream:** Terminal 2
**Dependencies:** None
**Branch:** `feat/task-201-nextjs-setup`

**Description:**
Initialize Next.js 15 project with React 19, TypeScript, Tailwind, and project structure.

**Acceptance Criteria:**
- [ ] Next.js 15 app created with app directory
- [ ] TypeScript configured with strict mode
- [ ] Tailwind CSS 4 installed and configured
- [ ] Framer Motion installed for animations
- [ ] Project structure: app/, lib/, components/, styles/, types/
- [ ] .env.example created with all required vars
- [ ] ESLint and Prettier configured
- [ ] Git hooks setup (pre-commit linting)
- [ ] README with dev setup instructions
- [ ] Local dev server runs without errors

---

### TASK-202: Design System & Style Variables
**Status:** [ ] Not Started
**Workstream:** Terminal 2
**Dependencies:** TASK-201
**Branch:** `feat/task-202-design-system`

**Description:**
Create comprehensive design system with colors, typography, spacing, animations, and theme variables per DESIGN.md.

**Acceptance Criteria:**
- [ ] Tailwind config extends with custom colors: purple (#8b5cf6), amber (#f59e0b), dark bg (#0f172a)
- [ ] Create lib/styles/design-system.ts with exported theme object
- [ ] Define typography: font families, sizes, weights, line heights
- [ ] Define spacing scale (8px base unit)
- [ ] Define elevation/shadow system (3-4 levels)
- [ ] Define animations: glow effects, fade-in, slide-up (via tailwind.config.js)
- [ ] Create Tailwind component classes (.btn, .card, .input) in globals.css
- [ ] Document all design tokens in DESIGN-SYSTEM.md
- [ ] Create design system reference components page (localhost:3000/design)

---

### TASK-203: Layout Components - Shell & Navigation
**Status:** [ ] Not Started
**Workstream:** Terminal 2
**Dependencies:** TASK-202
**Branch:** `feat/task-203-layout-shell`

**Description:**
Create main layout shell with sidebar, mobile nav, and header. Implement responsive design (mobile-first).

**Acceptance Criteria:**
- [ ] `RootLayout` component with navigation structure
- [ ] Desktop: 68px icon-only sidebar (left) with hover labels
- [ ] Mobile: bottom navigation bar with 4-5 main routes
- [ ] Header with user profile dropdown and settings
- [ ] Dark theme by default, smooth color transitions
- [ ] Responsive breakpoints: mobile (< 640px), tablet (640-1024px), desktop (> 1024px)
- [ ] Navigation links: Dashboard, Conversations, Settings, Profile
- [ ] Active route indicator with visual feedback
- [ ] Create layout.tsx and test on mobile device
- [ ] Verify responsive behavior at all breakpoints

---

### TASK-204: Core Components Library
**Status:** [ ] Not Started
**Workstream:** Terminal 2
**Dependencies:** TASK-202
**Branch:** `feat/task-204-core-components`

**Description:**
Build reusable component library: Button, Input, Card, Badge, Modal, Spinner, Toast.

**Acceptance Criteria:**
- [ ] `Button` component with variants (primary, secondary, ghost), sizes (sm, md, lg)
- [ ] `Input` component (text, textarea) with error state and labels
- [ ] `Card` component with rounded corners, dark bg, subtle border
- [ ] `Badge` component for tags/labels with color variants
- [ ] `NovaActivity` badge (purple glow, amber accent) for Nova work indication
- [ ] `Modal` component with backdrop, close button, animations
- [ ] `Spinner`/loading component with smooth rotation
- [ ] `Toast` notification component (success, error, info)
- [ ] All components documented with Storybook or examples
- [ ] TypeScript types for all props exported

---

### TASK-205: Items Feed Display Component
**Status:** [ ] Not Started
**Workstream:** Terminal 2
**Dependencies:** TASK-204, TASK-106
**Branch:** `feat/task-205-items-feed`

**Description:**
Create infinite-scrolling feed component displaying items with metadata, enrichment, and Nova indicators.

**Acceptance Criteria:**
- [ ] `ItemsFeed` component with infinite scroll (cursor pagination)
- [ ] `ItemCard` component showing: thumbnail, title, metadata, creation date
- [ ] Display enrichment (summary, insights) if available, with Nova badge
- [ ] Show content type indicator (URL, text, image)
- [ ] Click to view full item detail modal
- [ ] Loading states (skeleton cards while fetching)
- [ ] Pull-to-refresh on mobile
- [ ] Fetch items via GET /api/items with cursor
- [ ] Filter buttons: All, Has Enrichment, Archived
- [ ] Search input field (filters client-side or queries API)
- [ ] Responsive layout (1 col mobile, 2 col tablet, 3 col desktop)

---

### TASK-206: Item Detail View & Modal
**Status:** [ ] Not Started
**Workstream:** Terminal 2
**Dependencies:** TASK-204, TASK-106
**Branch:** `feat/task-206-item-detail`

**Description:**
Create detail modal/page for viewing full item content, enrichment, and interaction options.

**Acceptance Criteria:**
- [ ] `ItemDetailModal` component displaying:
  - Full content (URL preview, text, or image)
  - Metadata (source, timestamp, content type)
  - Enrichment (summary, key insights, discussions) if available
  - Nova activity indicator showing job status
- [ ] Close button and back navigation
- [ ] Share, archive, delete buttons
- [ ] "Chat with Nova about this" button linking to conversation
- [ ] Smooth open/close animations
- [ ] Mobile-optimized layout (full-screen modal)
- [ ] Test with various content types
- [ ] Loading state while fetching item details

---

### TASK-207: Chat/Conversation Interface
**Status:** [ ] Not Started
**Workstream:** Terminal 2
**Dependencies:** TASK-204
**Branch:** `feat/task-207-chat-interface`

**Description:**
Build conversational UI for chat with Nova: message display, input, message history.

**Acceptance Criteria:**
- [ ] `ConversationView` component with message history
- [ ] `MessageBubble` component for user and assistant messages
- [ ] Message bubbles: distinct styling (user right, assistant left)
- [ ] Display timestamps and Nova thinking indicators
- [ ] Scroll to latest message on new message
- [ ] `MessageInput` component with send button
- [ ] Support markdown formatting in messages
- [ ] Show "Nova is thinking..." indicator during processing
- [ ] Responsive: full-width on mobile, sidebar-constrained on desktop
- [ ] Create conversation routes (app/conversations/[id]/page.tsx)
- [ ] Test message rendering with long/short content

---

# Workstream 3: AI/LLM Integration

**Branch:** `feature/ai/nova-cognitive-loop`
**Status:** Not Started
**Target Duration:** Week 1-3

Nova's reasoning engine, model routing, RAG system, and memory architecture.

---

### TASK-301: LLM Client Setup & Configuration
**Status:** [ ] Not Started
**Workstream:** Terminal 3
**Dependencies:** None
**Branch:** `feat/task-301-llm-client`

**Description:**
Set up OpenAI SDK integration with Langfuse tracing for cost tracking and observability.

**Acceptance Criteria:**
- [ ] OpenAI SDK installed and configured (lib/llm/client.ts)
- [ ] Langfuse SDK installed and configured (lib/observability/langfuse.ts)
- [ ] LLM config created (lib/llm/config.ts) with model routing:
  - Perception: gpt-4o-mini
  - Reasoning: gpt-4o
  - Execution: gpt-4o-mini
  - Embeddings: text-embedding-3-small
- [ ] NovaLLMClient class with methods: perceive(), reason(), execute(), embed()
- [ ] All calls wrapped with Langfuse tracing (trace/span creation)
- [ ] Token usage extraction from responses
- [ ] Cost calculation per call
- [ ] Error handling with retry logic for rate limits
- [ ] Environment variables for API keys configured

---

### TASK-302: Nova Perception Engine
**Status:** [ ] Not Started
**Workstream:** Terminal 3
**Dependencies:** TASK-301
**Branch:** `feat/task-302-perception`

**Description:**
Implement Nova's PERCEIVE stage: quick content analysis via GPT-4o-mini to understand what user shared.

**Acceptance Criteria:**
- [ ] `perceive()` function in lib/nova/perception.ts
- [ ] Model: GPT-4o-mini, token budget: 1000, latency target: <2s
- [ ] System prompt that instructs Nova to analyze content type and purpose
- [ ] Input: content (string), content_type (url|text|image), optional context
- [ ] Output: {contentType, summary, confidence, suggestedActions[]}
- [ ] For URLs: extract title, description, detect content type
- [ ] For images: perform OCR/description
- [ ] For text: identify topic and intent
- [ ] Langfuse tracing: span with input/output tokens, latency
- [ ] Error handling: fallback to generic summary on failure
- [ ] Unit tests with sample content (URL, text, image)

---

### TASK-303: Context Assembly & RAG Retrieval
**Status:** [ ] Not Started
**Workstream:** Terminal 3
**Dependencies:** TASK-301
**Branch:** `feat/task-303-context-assembly`

**Description:**
Implement context assembly from memory tiers: working memory, session summaries, vector search (RAG), user profile.

**Acceptance Criteria:**
- [ ] `assembleContext()` function in lib/rag/context.ts
- [ ] Retrieve working memory: last 10-15 conversation messages
- [ ] Retrieve session summary from conversations.summary if > 15 messages
- [ ] Perform semantic search via pgvector:
  - Generate query embedding
  - Call match_embeddings() RPC function
  - Retrieve top-5 similar items (threshold: 0.7)
- [ ] Load user profile summary (user_profile.summary)
- [ ] Format context for prompt injection: clear sections
- [ ] Token counting: verify total < 6600 hard limit
- [ ] Return formatted context string ready for prompt
- [ ] Parallel fetches with Promise.all()
- [ ] Langfuse: log retrieval results and token usage
- [ ] Test context assembly with sample conversation

---

### TASK-304: Embedding Generation & Vector Storage
**Status:** [ ] Not Started
**Workstream:** Terminal 3
**Dependencies:** TASK-301, TASK-103
**Branch:** `feat/task-304-embeddings`

**Description:**
Implement embedding generation for items and conversations, store in pgvector for semantic search.

**Acceptance Criteria:**
- [ ] `generateEmbedding()` function for text-embedding-3-small (lib/embeddings/generate.ts)
- [ ] Batch embedding generation for multiple items
- [ ] `storeEmbedding()` function to insert into embeddings table
- [ ] Deduplication: check content_hash before storing
- [ ] Extract embedding content: for items (title + description), for conversations (summary)
- [ ] Chunking for long content (>8000 chars): overlap 200, chunk size 1000
- [ ] Langfuse tracing: input tokens, output tokens, cost
- [ ] Error handling: retry on rate limit
- [ ] Set up database function: match_embeddings(query_embedding, threshold, limit)
- [ ] Test end-to-end: generate embedding -> store -> retrieve similar

---

### TASK-305: Nova Reasoning Engine
**Status:** [ ] Not Started
**Workstream:** Terminal 3
**Dependencies:** TASK-301, TASK-303
**Branch:** `feat/task-305-reasoning`

**Description:**
Implement Nova's REASON stage: complex decision-making about what to do using GPT-4o.

**Acceptance Criteria:**
- [ ] `reason()` function in lib/nova/reasoning.ts
- [ ] Model: GPT-4o, token budget: 2000, latency target: <5s
- [ ] Input: perception result + context assembly + user message
- [ ] System prompt instructs Nova to reason about helpful actions
- [ ] Output: {
    reasoning: string,
    confidence: number (0-1),
    suggestedActions: Array<{action, reasoning, params}>,
    estimatedDuration: string
  }
- [ ] Confidence scoring: HIGH (>0.8), MEDIUM (0.5-0.8), LOW (<0.5)
- [ ] Consider: what user has done before, similar items, user preferences
- [ ] Langfuse span: input/output tokens, latency, cost
- [ ] Error handling: degrade to LOW confidence on failure
- [ ] Unit tests with sample inputs (different confidence levels)

---

### TASK-306: Decision & Planning Stage
**Status:** [ ] Not Started
**Workstream:** Terminal 3
**Dependencies:** TASK-305
**Branch:** `feat/task-306-planning`

**Description:**
Implement DECIDE and PLAN stages: choose action confidence level and generate durable step plan.

**Acceptance Criteria:**
- [ ] `decideAction()` function: given confidence, return action level (HIGH/MEDIUM/LOW)
- [ ] `planJob()` function in lib/nova/planning.ts for HIGH confidence:
  - Generate dynamic plan with reasoning
  - Break into steps with tool choices (fetch, summarize, search, etc.)
  - Estimate tokens per step
  - Output: {reasoning, steps[], estimatedTokens, estimatedDuration}
- [ ] For MEDIUM confidence: generate natural question prompt
- [ ] For LOW confidence: generic "I'm not sure..." response
- [ ] Plan validation:
  - Action allowlist check (only fetch, summarize, search, analyze_image, synthesize, extract_metadata)
  - Step count <= 10
  - Estimated tokens <= per_job budget (50k)
  - No internal IP URLs
- [ ] Langfuse: log decision and plan details
- [ ] Unit tests: valid plans, rejected invalid plans

---

### TASK-307: Streaming Response Handler
**Status:** [ ] Not Started
**Workstream:** Terminal 3
**Dependencies:** TASK-302
**Branch:** `feat/task-307-streaming`

**Description:**
Implement streaming response generation via Server-Sent Events (SSE) for real-time user feedback.

**Acceptance Criteria:**
- [ ] Streaming response handler in lib/nova/streaming.ts
- [ ] Support streaming from OpenAI API (text/event-stream)
- [ ] Send SSE events:
  - status: {phase: 'perceiving'|'reasoning'|'responding'}
  - thinking: individual tokens from thinking phase
  - message: {delta: string} for response streaming
  - done: {item_id, action, ...}
  - error: {message}
- [ ] Collect full response from stream chunks
- [ ] Store message in database when complete
- [ ] Handle stream interruption gracefully
- [ ] Langfuse: trace full streaming interaction
- [ ] Client-side: handle SSE stream and render incrementally
- [ ] Test with browser SSE client (fetch with streaming)

---

### TASK-308: Tool Definitions & Execution Framework
**Status:** [ ] Not Started
**Workstream:** Terminal 3
**Dependencies:** TASK-301
**Branch:** `feat/task-308-tools`

**Description:**
Define available tools for Nova execution and create framework for durable step execution.

**Acceptance Criteria:**
- [ ] Tool definitions in lib/jobs/tools.ts:
  - fetch_content: retrieve URL/file, timeout 15s
  - summarize: generate summary, timeout 30s
  - web_search: Tavily/Serper search, timeout 10s
  - analyze_image: vision model analysis, timeout 20s
  - extract_metadata: structured extraction, timeout 10s
  - synthesize: combine results, timeout 30s
- [ ] Each tool has: name, description, timeout, execute function
- [ ] Tool execution: call appropriate lib/tools/[tool-name].ts
- [ ] Error handling per tool: retry logic, fallbacks
- [ ] Langfuse tracing: tool invocation, latency, cost
- [ ] Action allowlist enforced (only above tools allowed)
- [ ] Unit tests for each tool with sample inputs

---

### TASK-309: Cost Control & Token Budgets
**Status:** [ ] Not Started
**Workstream:** Terminal 3
**Dependencies:** TASK-301, TASK-306
**Branch:** `feat/task-309-cost-control`

**Description:**
Implement token budgets, cost tracking, and spending limits per user/request.

**Acceptance Criteria:**
- [ ] Token budget constants in lib/cost-control.ts:
  - per_request: 8,000 tokens (~$0.10)
  - per_job: 50,000 tokens (~$0.50)
  - per_user_daily: 200,000 tokens (~$2.00)
  - per_user_monthly: 2,000,000 tokens (~$20)
- [ ] `checkBudget()` function before job execution
- [ ] Cost calculation per model:
  - gpt-4o-mini: $0.15/1M input, $0.60/1M output
  - gpt-4o: $2.50/1M input, $10/1M output
- [ ] Track usage in usage_tracking table
- [ ] Prevent jobs exceeding daily/monthly limits
- [ ] Return budget info to client: {allowed, remaining_daily, remaining_monthly}
- [ ] Log budget exhaustion events
- [ ] Unit tests: budget enforcement with various scenarios

---

### TASK-310: User Profile Learning & Summarization
**Status:** [ ] Not Started
**Workstream:** Terminal 3
**Dependencies:** TASK-301
**Branch:** `feat/task-310-user-profile`

**Description:**
Implement user profile learning: extract preferences from interactions and generate compact summary for context.

**Acceptance Criteria:**
- [ ] Profile extraction logic in lib/user-profile/extract.ts
- [ ] Track: content patterns, interaction style, topic preferences, action preferences
- [ ] Generate profile summary every 25 interactions (GPT-4o-mini, target 300 tokens)
- [ ] Summary format: natural language compact representation
- [ ] Example: "Prefers detailed analysis. Often shares AI papers and music. Usually wants immediate action. Casual tone."
- [ ] Update user_profile.summary and user_profile.preferences JSONB
- [ ] Export `loadUserProfile()` function for context assembly
- [ ] Langfuse: trace profile update events
- [ ] Unit tests: profile extraction and summarization

---

# Workstream 4: Real-time & PWA

**Branch:** `feature/frontend/realtime-pwa`
**Status:** Not Started
**Target Duration:** Week 2-3

Real-time subscriptions, push notifications, and progressive web app configuration.

---

### TASK-401: Supabase Realtime Subscriptions Setup
**Status:** [ ] Not Started
**Workstream:** Terminal 4
**Dependencies:** TASK-102, TASK-108
**Branch:** `feat/task-401-realtime-subs`

**Description:**
Enable and configure Supabase Realtime for live updates to items, jobs, and conversations.

**Acceptance Criteria:**
- [ ] Enable Realtime publication on: items, jobs, conversations tables
- [ ] SQL: ALTER PUBLICATION supabase_realtime ADD TABLE [table]
- [ ] Create realtime hooks in lib/realtime/subscriptions.ts
- [ ] Subscribe to job updates: listen for status changes, log progress
- [ ] Subscribe to item updates: listen for new items in user's feed
- [ ] Subscribe to conversation updates: listen for new messages
- [ ] Handle connection: connect/disconnect/reconnect logic
- [ ] Test subscriptions locally: verify events received in real-time
- [ ] Implement subscription cleanup on component unmount
- [ ] Handle offline/online transitions gracefully

---

### TASK-402: Web Push Notifications Setup
**Status:** [ ] Not Started
**Workstream:** Terminal 4
**Dependencies:** TASK-101, TASK-105
**Branch:** `feat/task-402-web-push`

**Description:**
Set up Web Push API infrastructure: VAPID keys, service worker, subscription management.

**Acceptance Criteria:**
- [ ] Generate VAPID key pair for Web Push
- [ ] Store public key in NEXT_PUBLIC_VAPIR_PUBLIC_KEY
- [ ] Store private key in VAPID_PRIVATE_KEY (server-only)
- [ ] Create service worker (public/sw.js) for handling push events
- [ ] Service worker registers notification event listeners
- [ ] POST /api/push/subscribe endpoint:
  - Accept {endpoint, keys}
  - Store in push_subscriptions table
  - Verify user authenticated
- [ ] `sendPushNotification()` function in lib/push/send.ts
- [ ] Use web-push npm library for sending
- [ ] Error handling: mark invalid subscriptions as inactive
- [ ] Test with sample notification: send and verify on mobile

---

### TASK-403: Push Notification Triggered Workflow
**Status:** [ ] Not Started
**Workstream:** Terminal 4
**Dependencies:** TASK-108, TASK-402
**Branch:** `feat/task-403-push-workflow`

**Description:**
Integrate push notifications into job completion workflow: notify user when Nova finishes work.

**Acceptance Criteria:**
- [ ] Inngest job function sends push on completion:
  - Fetch user's push_subscriptions (is_active = true)
  - Generate notification title/body from job result
  - Call sendPushNotification() for each subscription
  - Handle failed sends gracefully
- [ ] Push notification includes:
  - Title: "Nova completed your request"
  - Body: brief summary of what was done
  - Tag: job_id (for grouping)
  - Click action: navigate to item detail
- [ ] Support push notification replies (conversation-based)
- [ ] Test end-to-end: trigger job -> receive push on mobile
- [ ] Log notification sends in Langfuse

---

### TASK-404: PWA Configuration & Web App Manifest
**Status:** [ ] Not Started
**Workstream:** Terminal 4
**Dependencies:** TASK-202, TASK-203
**Branch:** `feat/task-404-pwa-manifest`

**Description:**
Configure PWA: manifest.json, theme colors, icons, and installation UX.

**Acceptance Criteria:**
- [ ] Create public/manifest.json with:
  - name: "LifeOS"
  - short_name: "LifeOS"
  - description: from PITCH.md
  - start_url: /
  - display: "standalone"
  - theme_color: #8b5cf6 (purple)
  - background_color: #0f172a (dark)
  - icons: [192x192, 384x384, 512x512] with src paths
- [ ] Generate/design app icons in lib/icons/
- [ ] Create favicons (16x16, 32x32, 192x192, 512x512)
- [ ] Add manifest link in HTML head
- [ ] Add meta tags for mobile web app: theme-color, apple-mobile-web-app-capable
- [ ] Test installation on iOS 17+ and Android
- [ ] Verify "Add to Home Screen" works

---

### TASK-405: Service Worker & Offline Support
**Status:** [ ] Not Started
**Workstream:** Terminal 4
**Dependencies:** TASK-404
**Branch:** `feat/task-405-service-worker`

**Description:**
Implement service worker for caching, offline support, and push notification handling.

**Acceptance Criteria:**
- [ ] Service worker registration in app/layout.tsx
- [ ] Cache strategy: Network-first for API, Cache-first for static assets
- [ ] Precache: app shell (HTML, CSS, JS)
- [ ] Cache invalidation on version bump
- [ ] Offline page: public/offline.html
- [ ] Handle push notification clicks:
  - Parse notification tag (job_id)
  - Navigate to item detail
  - Focus existing window if open
- [ ] Error logging: errors during cache/fetch logged to console
- [ ] Test offline: disconnect and verify app still loads
- [ ] Test push: receive notification in background

---

### TASK-406: iOS Share Sheet Integration & Deeplinks
**Status:** [ ] Not Started
**Workstream:** Terminal 4
**Dependencies:** TASK-105, TASK-107
**Branch:** `feat/task-406-ios-integration`

**Description:**
Configure iOS Share Sheet target and deeplink handling for seamless sharing from other apps.

**Acceptance Criteria:**
- [ ] Create iOS Share extension configuration
- [ ] Add web app metadata for iOS (UTI types, schemes)
- [ ] Implement deeplink handling in Next.js:
  - Route: /share?url=[url]&title=[title]&text=[text]
  - Parse params and call POST /api/share
  - Show confirmation UI
- [ ] Test Share Sheet with Safari, Twitter, News apps
- [ ] Handle URL scheme: lifeos://share?url=[url]
- [ ] Document: iOS Setup Guide in docs/ios-shortcut.md
- [ ] Create sample Siri Shortcut that uses API key auth
- [ ] Test shortcut on iOS device

---

### TASK-407: Mobile Responsive UI Polish & Testing
**Status:** [ ] Not Started
**Workstream:** Terminal 4
**Dependencies:** TASK-205, TASK-207
**Branch:** `feat/task-407-mobile-polish`

**Description:**
Polish mobile UI: responsive layouts, touch interactions, performance optimization.

**Acceptance Criteria:**
- [ ] Test on iOS Safari, Chrome, and Android browsers
- [ ] Verify responsive breakpoints (320px, 375px, 768px, 1024px+)
- [ ] Touch interactions: tap feedback, swipe gestures for navigation
- [ ] Keyboard handling: dismiss on scroll, tap outside input
- [ ] Safe area insets: respect notch and bottom safe areas
- [ ] Viewport configuration: proper viewport meta tags
- [ ] Font sizes: readable at mobile distance (≥16px for inputs)
- [ ] Tap targets: minimum 44x44px for buttons
- [ ] Performance: Lighthouse Mobile >90
- [ ] Battery: disable animations/reduce motion if user prefers
- [ ] Test with actual devices before launch

---

### TASK-408: Conversation over Push Notifications
**Status:** [ ] Not Started
**Workstream:** Terminal 4
**Dependencies:** TASK-403, TASK-207
**Branch:** `feat/task-408-push-replies`

**Description:**
Enable replying to Nova push notifications, continuing conversation from notification interaction.

**Acceptance Criteria:**
- [ ] Push notification includes action button: "Reply" or "View & Chat"
- [ ] Clicking notification navigates to conversation view
- [ ] Auto-focus message input when opened from push
- [ ] POST /api/conversation/reply endpoint:
  - Accept {conversation_id, message_content}
  - Append to conversation.messages
  - Trigger Nova reasoning
  - Return streaming response
- [ ] Service worker: handle action click, open app with conversation_id
- [ ] UI shows "Replying in background..." during Nova work
- [ ] Test: send push, tap Reply, type response, Nova responds
- [ ] Verify conversation history persists

---

# Workstream 5: Integration & Polish

**Status:** Not Started
**Target Duration:** Week 3

Cross-cutting concerns, testing, documentation, and final polish.

---

### TASK-501: End-to-End Integration Testing
**Status:** [ ] Not Started
**Workstream:** Cross-cutting
**Dependencies:** All core tasks (TASK-1xx through TASK-4xx)
**Branch:** `feat/task-501-e2e-tests`

**Description:**
Write comprehensive end-to-end tests covering full user workflows.

**Acceptance Criteria:**
- [ ] Test: Share URL -> Nova perceives -> Creates item -> Displays in feed
- [ ] Test: Share text -> Nova reasons -> Creates job -> Sends push
- [ ] Test: Receive push -> Reply -> Nova continues conversation
- [ ] Test: Infinite scroll feed -> Load more items
- [ ] Test: Search items -> Filter by has_enrichment
- [ ] Test: Click item -> View detail modal -> Archive
- [ ] Test: Open chat -> Type message -> Get Nova response
- [ ] Test: Offline -> Cached items visible -> Online -> Sync
- [ ] Test: Multiple browsers (iOS Safari, Chrome, Android)
- [ ] Use Playwright for automation tests
- [ ] Minimum 10 test scenarios passing

---

### TASK-502: Performance Optimization & Monitoring
**Status:** [ ] Not Started
**Workstream:** Cross-cutting
**Dependencies:** All tasks
**Branch:** `feat/task-502-performance`

**Description:**
Optimize performance and set up monitoring: Lighthouse scores, Core Web Vitals, API latency.

**Acceptance Criteria:**
- [ ] Lighthouse Mobile: >90 on performance
- [ ] Lighthouse Desktop: >90 on performance
- [ ] Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- [ ] API latency: P95 < 3s for /api/items, < 2s for /api/share perception
- [ ] Bundle size: main JS < 200KB gzipped
- [ ] Image optimization: next/image used throughout
- [ ] Code splitting: lazy load chat component
- [ ] Set up monitoring dashboard (Vercel Analytics, DataDog, or similar)
- [ ] Alert rules configured for performance regressions
- [ ] Document performance budgets in README

---

### TASK-503: Error Handling & User Feedback
**Status:** [ ] Not Started
**Workstream:** Cross-cutting
**Dependencies:** All core tasks
**Branch:** `feat/task-503-error-handling`

**Description:**
Comprehensive error handling and user-friendly error messages throughout the app.

**Acceptance Criteria:**
- [ ] Global error boundary component (catch React errors)
- [ ] API error handling: translate error codes to user messages
- [ ] Network errors: show offline message, retry option
- [ ] LLM rate limits: user message "Nova is busy, please wait"
- [ ] Budget limits: user message with reset time
- [ ] Form validation: inline error messages
- [ ] Toast notifications for errors, warnings, success messages
- [ ] Langfuse error tracking: all errors logged with context
- [ ] Sentry integration (optional): for production error tracking
- [ ] 404/500 pages created

---

### TASK-504: Documentation & Deployment Guide
**Status:** [ ] Not Started
**Workstream:** Cross-cutting
**Dependencies:** All tasks
**Branch:** `feat/task-504-documentation`

**Description:**
Comprehensive documentation for developers and users.

**Acceptance Criteria:**
- [ ] README.md: project overview, quick start, tech stack
- [ ] DEVELOPMENT.md: setup, architecture explanation, debugging
- [ ] DEPLOYMENT.md: Vercel setup, environment variables, secrets management
- [ ] API.md: endpoint documentation, request/response examples
- [ ] TROUBLESHOOTING.md: common issues and solutions
- [ ] CONTRIBUTING.md: code style, PR process, testing requirements
- [ ] docs/iOS-SETUP.md: iOS Shortcut setup guide
- [ ] docs/PWA-INSTALL.md: installation instructions per device
- [ ] Storybook or component documentation site
- [ ] Code comments on complex logic (Nova reasoning, etc.)

---

### TASK-505: Security Audit & Hardening
**Status:** [ ] Not Started
**Workstream:** Cross-cutting
**Dependencies:** All backend/auth tasks
**Branch:** `feat/task-505-security`

**Description:**
Security review and hardening: input validation, RLS verification, API key rotation, secrets management.

**Acceptance Criteria:**
- [ ] Input validation audit: all endpoints reject invalid input
- [ ] RLS policies verified: test data isolation between users
- [ ] API key rotation: document key management process
- [ ] Secrets management: all secrets in environment variables, never committed
- [ ] HTTPS everywhere: configured in Vercel
- [ ] CORS configuration: allow only frontend domain
- [ ] Rate limiting verified: test endpoints with burst requests
- [ ] SQL injection protection: parameterized queries (Supabase handles)
- [ ] XSS protection: sanitize user content before rendering
- [ ] CSRF tokens: if applicable for form submissions
- [ ] Security headers configured: X-Frame-Options, X-Content-Type-Options
- [ ] Penetration test: check for common vulnerabilities

---

### TASK-506: Launch Readiness & First User Testing
**Status:** [ ] Not Started
**Workstream:** Cross-cutting
**Dependencies:** All tasks
**Branch:** `feat/task-506-launch`

**Description:**
Final checks and user testing before MVP launch.

**Acceptance Criteria:**
- [ ] All critical bugs fixed (no blocker issues)
- [ ] Performance budgets met
- [ ] iOS 17+ testing completed
- [ ] Android Chrome testing completed
- [ ] Push notifications working on both platforms
- [ ] Offline functionality tested
- [ ] Share Sheet integration tested from Safari, Twitter, Reddit
- [ ] First user manual testing: full workflow from share to enrichment
- [ ] Feedback collection: gather user feedback on UX
- [ ] Rollout plan: staged rollout or full launch
- [ ] Analytics configured: track usage metrics
- [ ] Support process: docs and contact method for issues

---

## Sync Points & Critical Path

### Week 1 Goals
**Sync 1 (End of Week 1):** API Foundation + Frontend Shell Ready

- TASK-101 through TASK-108 (Terminal 1: Backend)
- TASK-201 through TASK-204 (Terminal 2: Foundation)
- TASK-301 through TASK-303 (Terminal 3: LLM Setup)
- Start TASK-401 (Terminal 4: Realtime)

**Status Check:**
- Can make POST /api/share calls
- Frontend renders items feed
- Nova can perceive content
- Database tables populated with test data

### Week 2 Goals
**Sync 2 (End of Week 2):** Full Perception + Responsive UI + Realtime

- Complete TASK-105 through TASK-108 (API completion)
- Complete TASK-205 through TASK-207 (Feed & chat UX)
- Complete TASK-305 through TASK-309 (Nova reasoning engine)
- Complete TASK-401 through TASK-406 (PWA & push)

**Status Check:**
- Share URL -> Nova perceives -> Item appears in feed
- Chat interface works with Nova responses
- PWA installs on iOS/Android
- Push notifications working
- Real-time updates visible

### Week 3 Goals
**Sync 3 (End of Week 3):** Full MVP Launch Ready

- Complete TASK-310 (User profile)
- Complete TASK-407 (Mobile polish)
- Complete TASK-501 through TASK-506 (Testing & launch)

**Status Check:**
- Full cognitive loop working: share -> perceive -> reason -> plan -> respond
- Async jobs execute with durable steps
- User testing completed, feedback incorporated
- Performance targets met
- Ready for production launch

---

## Blocking Dependencies

```
Terminal 1 (Backend) blocks:
  - Terminal 2 (need API endpoints)
  - Terminal 3 (need database for storage)
  - Terminal 4 (need realtime setup)

Terminal 3 (LLM) blocks:
  - Terminal 1 (TASK-107 needs Nova perception)
  - Terminal 2 (need to display enrichment)
  - Terminal 4 (need to send notifications from jobs)

Terminal 2 (Frontend) can mostly proceed in parallel
Terminal 4 (Real-time/PWA) mostly parallel, light dependency on Terminal 1
```

---

## Key Milestones

| Date | Milestone | Tasks | Criteria |
|------|-----------|-------|----------|
| **End Week 1** | API Foundation | 101-108, 201-204, 301-303 | POST /api/share works, frontend renders |
| **End Week 2** | Full Perception | 105-108, 205-207, 305-309, 401-406 | Share -> Nova -> Display -> Chat working |
| **End Week 3** | MVP Launch | 310, 407, 501-506 | All features working, tested, documented |

---

## Branch Naming Convention

All branches follow:
```
feat/task-XXX-brief-description

Example:
feat/task-101-supabase-setup
feat/task-305-reasoning-engine
feat/task-506-launch-readiness
```

---

## Notes

- **Parallel execution:** Teams can work independently on Terminals 1-4 until sync points
- **Small, completable tasks:** Each task targets 1-4 hours of focused work
- **Clear acceptance criteria:** Know when task is done
- **Regular sync meetings:** Check blockers at sync points
- **Leverage architecture docs:** Reference ARCHITECTURE.md and AI-ARCHITECTURE.md for implementation details

---

## Status Legend

| Symbol | Status |
|--------|--------|
| [ ] | Not Started |
| [x] | Complete |
| [~] | In Progress |
| [?] | Blocked |

Update status during daily standups. Move items to "In Progress" when starting work.
