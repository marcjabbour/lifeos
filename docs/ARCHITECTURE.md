# LifeOS Architecture Document

This document provides a comprehensive technical architecture for LifeOS, covering system design, backend infrastructure, AI/LLM integration, and operational patterns.

---

## Table of Contents

### System Overview
1. [High-Level Architecture](#high-level-architecture)
2. [Design Principles](#design-principles)
3. [Request Flow Patterns](#request-flow-patterns)

### Backend Architecture
4. [Database Architecture](#database-architecture)
5. [API Design](#api-design)
6. [Background Job System](#background-job-system)
7. [Real-time Infrastructure](#real-time-infrastructure)
8. [Security & Rate Limiting](#security--rate-limiting)

### AI/LLM Architecture
9. [Nova's Cognitive Loop](#novas-cognitive-loop)
10. [Model Routing Strategy](#model-routing-strategy)
11. [RAG System Architecture](#rag-system-architecture)
12. [Memory Architecture](#memory-architecture)
13. [AI Guardrails & Safety](#ai-guardrails--safety)

### Operations
14. [Observability & Monitoring](#observability--monitoring)
15. [Infrastructure & Deployment](#infrastructure--deployment)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  INPUT LAYER                                         │
│                                                                                      │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐              │
│   │  iOS Share Sheet │    │   PWA Direct     │    │   Siri Shortcut  │              │
│   │   (API Key Auth) │    │ (Session Auth)   │    │   (API Key Auth) │              │
│   └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘              │
│            │                       │                       │                         │
│   ┌────────┴─────────┐    ┌────────┴─────────┐                                      │
│   │  WhatsApp Bot    │    │  MCP Server      │                                      │
│   │   (Twilio)       │    │  (Claude Tools)  │                                      │
│   └────────┬─────────┘    └────────┬─────────┘                                      │
│            └───────────────────────┴───────────────────────┘                         │
│                                    │                                                 │
└────────────────────────────────────┼─────────────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (Next.js 15)                                  │
│                                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                         Route Handlers                                       │   │
│   │   /api/share ─────────▶ Content ingestion, Nova perception                  │   │
│   │   /api/conversation/reply ──▶ Conversation handling                         │   │
│   │   /api/items ─────────▶ CRUD operations                                     │   │
│   │   /api/jobs/:id ──────▶ Job status polling                                  │   │
│   │   /api/push/subscribe ▶ Push notification registration                      │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                                 │
│   ┌────────────────────────────────┼────────────────────────────────────────────┐   │
│   │              MIDDLEWARE STACK  │                                             │   │
│   │   Auth ──▶ Rate Limit ──▶ Validation ──▶ Handler                            │   │
│   └────────────────────────────────┼────────────────────────────────────────────┘   │
└────────────────────────────────────┼─────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│         NOVA (AI Engine)            │  │         DATA LAYER (Supabase)       │
│                                     │  │                                     │
│  ┌─────────────────────────────┐    │  │  ┌─────────┐ ┌─────────┐ ┌───────┐  │
│  │      COGNITIVE LOOP         │    │  │  │  items  │ │  jobs   │ │convos │  │
│  │                             │    │  │  └─────────┘ └─────────┘ └───────┘  │
│  │ Perceive → Reason → Decide  │    │  │                                     │
│  │     → Plan → Execute        │    │──│  ┌─────────────────────────────┐    │
│  └─────────────────────────────┘    │  │  │    pgvector (embeddings)    │    │
│                                     │  │  └─────────────────────────────┘    │
│  Tools: Summarize, Search, etc.    │  │                                     │
└─────────────────────────────────────┘  │  Realtime subscriptions for UI      │
                                         └─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│       DURABLE JOB QUEUE             │
│     (Inngest / Trigger.dev)         │
│                                     │
│  • Step-level persistence           │
│  • Automatic retries                │
│  • Long-running job support         │
│  • Built-in observability           │
└─────────────────────────────────────┘
```

---

## Design Principles

### Core Philosophy: Reasoning Over Matching

LifeOS is built on one fundamental belief: **Nova should reason, not match.**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    The Anti-Pattern (What We Avoid)                      │
└─────────────────────────────────────────────────────────────────────────┘

    Input ──▶ Classifier ──▶ Lookup Table ──▶ Predefined Workflow
              "type: X"      "if X, do Y"     "template_X_v2.json"

    Problems:
    • Rigid categories that don't fit messy reality
    • New content types require code changes
    • Output formats don't adapt to content


┌─────────────────────────────────────────────────────────────────────────┐
│                    Our Approach: Reasoning First                         │
└─────────────────────────────────────────────────────────────────────────┘

    Input ──▶ Nova Reasons ──▶ Dynamic Plan ──▶ Flexible Execution
              "What is this?   "Steps that     "Output shaped by
               What would       make sense      what's actually
               be useful?"      for THIS"       useful"

    Benefits:
    • Any content type works—Nova figures it out
    • Output structure emerges from the task
    • Gets smarter through conversation history
    • No enums, no rigid schemas, no lookup tables
```

### Architectural Principles

| Principle | Implementation |
|-----------|----------------|
| **Reasoning over matching** | No predefined categories, enums, or lookup tables |
| **Dynamic planning** | Plans stored as JSONB, structure emerges from content |
| **Flexible output** | No rigid schemas for enrichment results |
| **Context-aware** | 4-tier memory system informs every decision |
| **Durable execution** | Background jobs survive function restarts |
| **Security by default** | RLS enforced at database level |

---

## Request Flow Patterns

### Synchronous Request Flow (Items, Conversations)

```
Client ──▶ API Route ──▶ Auth Middleware ──▶ Rate Limit ──▶ Handler ──▶ Supabase ──▶ Response
                                                              │
                                                              └──▶ RLS enforced at DB level
```

### Asynchronous Job Flow (Content Processing)

```
Client ──▶ POST /api/share
              │
              ├──▶ Quick perception (GPT-4o-mini, < 3s)
              ├──▶ Create item + job record
              ├──▶ Enqueue to Inngest/Trigger.dev
              └──▶ Return immediately { job_id, status: 'working' }

                              │
                              ▼ (async)

           Inngest/Trigger.dev Worker
              │
              ├──▶ Step 1: fetch_content ──▶ persist
              ├──▶ Step 2: summarize ──▶ persist
              ├──▶ Step 3: web_search ──▶ persist
              ├──▶ Step 4: synthesize ──▶ persist
              │
              └──▶ Complete job
                      │
                      ├──▶ Update item.enrichment
                      ├──▶ Send push notification
                      └──▶ Emit Realtime event
```

---

## Database Architecture

### Supabase/PostgreSQL Schema Design

**Core Tables:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `items` | User content (URLs, text, images) | `content`, `content_type`, `metadata` (JSONB), `enrichment` (JSONB) |
| `jobs` | Background work tracking | `plan` (JSONB), `status`, `step_results` (JSONB), `result` (JSONB) |
| `conversations` | Chat history with Nova | `messages` (JSONB array), `summary` (JSONB), `status` |
| `push_subscriptions` | Web Push endpoints | `endpoint`, `keys` (JSONB), `is_active` |
| `embeddings` | Vector storage for RAG | `embedding` (vector(1536)), `source_type`, `content` |
| `user_profile` | Learned preferences | `preferences` (JSONB), `summary` |
| `usage_tracking` | Token/cost tracking | `model`, `input_tokens`, `output_tokens`, `estimated_cost_cents` |

### Entity Relationships

```
    auth.users (Supabase managed)
         │
         ├──────┬──────────────────┬──────────────────┬────────────────────┐
         │      │                  │                  │                    │
         ▼      ▼                  ▼                  ▼                    ▼
    ┌────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐ ┌────────────┐
    │ items  │ │    jobs    │ │conversations│ │push_subscriptions│ │ api_keys │
    └────┬───┘ └─────┬──────┘ └──────┬─────┘ └────────────────┘ └────────────┘
         │           │               │
         │           │               │
         ├───────────┴───────────────┤
         │     (item_id FK)          │
         ▼                           │
    ┌────────────────────┐           │
    │    embeddings      │◀──────────┘
    │ (polymorphic via   │  (source_type: 'item' | 'conversation' | 'enrichment')
    │  source_type)      │
    └────────────────────┘
```

### JSONB Usage Patterns

The schema embraces JSONB for flexibility over rigid schemas:

| Column | Pattern | Example Content |
|--------|---------|-----------------|
| `items.metadata` | Domain-specific metadata | `{ "source": "arxiv.org", "pdf_url": "...", "authors": [...] }` |
| `items.enrichment` | Nova's dynamic output | `{ "summary": "...", "key_insights": [...], "discussions": [...] }` |
| `jobs.plan` | Dynamic execution plan | `{ "reasoning": "...", "steps": [{ "action": "...", "why": "..." }] }` |
| `jobs.result` | Flexible job output | Whatever structure Nova decides is useful |
| `conversations.messages` | Chat history array | `[{ "role": "user", "content": "...", "timestamp": "..." }]` |

### Indexing Strategy

**B-tree Indexes (equality/range queries):**
```sql
CREATE INDEX idx_items_user_created ON items(user_id, created_at DESC);
CREATE INDEX idx_items_has_enrichment ON items(user_id, has_enrichment)
  WHERE has_enrichment = TRUE;
CREATE INDEX idx_jobs_user_status ON jobs(user_id, status);
CREATE INDEX idx_conversations_user_status ON conversations(user_id, status);
```

**GIN Indexes (JSONB containment queries):**
```sql
CREATE INDEX idx_items_metadata_gin ON items USING GIN (metadata jsonb_path_ops);
CREATE INDEX idx_items_enrichment_gin ON items USING GIN (enrichment jsonb_path_ops);
CREATE INDEX idx_jobs_plan_gin ON jobs USING GIN (plan jsonb_path_ops);
```

**HNSW Index (vector similarity):**
```sql
CREATE INDEX idx_embeddings_vector ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Row Level Security (RLS)

All user-facing tables enforce RLS for multi-tenant isolation:

```sql
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items"
  ON items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE USING (auth.uid() = user_id);
```

**Service Role Bypass:** Background jobs use the Supabase service role key which bypasses RLS. This key is NEVER exposed to clients.

---

## API Design

### RESTful Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `POST` | `/api/share` | Ingest content, trigger Nova | Session or API Key |
| `POST` | `/api/conversation/reply` | Reply in conversation | Session or API Key |
| `POST` | `/api/chat` | General chat with Nova | Session or API Key |
| `GET` | `/api/items` | List items with filters | Session or API Key |
| `GET` | `/api/items/:id` | Get single item | Session or API Key |
| `GET` | `/api/jobs/:id` | Check job status | Session or API Key |
| `POST` | `/api/push/subscribe` | Register push subscription | Session |

### Request/Response Contracts

**POST /api/share**
```typescript
// Request
interface ShareRequest {
  content: string;              // URL, text, or base64 image
  content_type: 'url' | 'text' | 'image';
  source?: string;              // Optional origin
  callback_url?: string;        // Webhook for async completion
}

// Response
interface ShareResponse {
  success: boolean;
  action: 'saved' | 'asked' | 'working';
  item_id?: string;
  conversation_id?: string;
  job_id?: string;
  message: string;              // Nova's response
}
```

**GET /api/items**
```typescript
// Query parameters
interface ItemsQuery {
  search?: string;              // Full-text search
  has_enrichment?: boolean;     // Filter to enriched items
  is_archived?: boolean;        // Filter archived status
  limit?: number;               // Default: 20, max: 100
  cursor?: string;              // Pagination cursor
}

// Response
interface ItemsResponse {
  items: Item[];
  next_cursor: string | null;
  has_more: boolean;
}
```

### Streaming SSE Pattern

For real-time Nova responses during `/api/share`:

```
Client                           Server                          OpenAI
──────                           ──────                          ──────

POST /api/share
Accept: text/event-stream
     │
     ├──────────────────────────▶ Perceive content
     │                                   │
     │  event: thinking                  │
     │  data: "Looking at this URL..."  ◀┘
     │
     │  event: message
     │  data: {"role":"assistant",
     │         "content":"I see you..."}
     │
     │  event: done
     │  data: {"item_id":"...",
     │         "action":"asked"}
```

### Webhook Callback System

For iOS Shortcuts and external integrations:

```typescript
interface WebhookPayload {
  event: 'job.completed' | 'job.failed' | 'item.enriched';
  timestamp: string;
  job_id?: string;
  item_id?: string;
  result?: Record<string, unknown>;
  error?: string;
}
```

---

## Background Job System

### The Serverless Timeout Problem

| Plan | Timeout Limit |
|------|---------------|
| Hobby | 10 seconds |
| Pro | 300 seconds (5 min) |
| Enterprise | 900 seconds (15 min) |

**Problem:** Nova's multi-step jobs can exceed 5 minutes, and a single timeout loses all progress.

### Solution: Durable Step Execution

Using Inngest or Trigger.dev for:
- **Durable execution**: Steps survive function restarts
- **Automatic retries**: Failed steps retry with exponential backoff
- **Step-level state**: Each step's result persists
- **Long-running support**: Jobs can span hours if needed

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DURABLE JOB ARCHITECTURE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

   API Route                    Job Queue                    Workers
   ─────────                    ─────────                    ───────

┌─────────────────┐
│ POST /api/share │
│                 │
│ 1. Quick        │
│    perception   │
│ 2. Create job   │
│ 3. Enqueue      │─────────────▶┌─────────────────────────────────────────┐
│ 4. Return       │              │           INNGEST / TRIGGER.DEV         │
│    immediately  │              │                                         │
└─────────────────┘              │  job_id: abc-123                        │
                                 │  status: pending                         │
       Response to user          │  plan: { steps: [...] }                 │
       in < 3 seconds            │                                         │
                                 └──────────────────────────────────────────┘
                                                   │
                                                   ▼
                                 ┌─────────────────────────────────────────┐
                                 │            STEP EXECUTION               │
                                 │                                         │
                                 │  ┌─────────┐   ┌─────────┐   ┌───────┐ │
                                 │  │ Step 1  │──▶│ Step 2  │──▶│ Step 3│ │
                                 │  │ fetch   │   │summarize│   │search │ │
                                 │  └────┬────┘   └────┬────┘   └───┬───┘ │
                                 │       │            │            │      │
                                 │       ▼            ▼            ▼      │
                                 │       State persisted after each step  │
                                 │       (survives timeouts/restarts)     │
                                 └─────────────────────────────────────────┘
```

### Job Lifecycle States

```
    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ pending  │────▶│ running  │────▶│completed │     │  failed  │
    └──────────┘     └────┬─────┘     └──────────┘     └──────────┘
                          │                                 ▲
                          └────── on error (after retries)──┘
```

### Retry and Error Handling

| Error Type | Strategy |
|------------|----------|
| LLM rate limit | Exponential backoff, fallback to GPT-4o-mini |
| Context length exceeded | Truncate context, retry |
| Step timeout | Skip step if non-critical, continue |
| Tool failure | Log, attempt alternative |
| Budget exceeded | Pause job, notify user |

---

## Real-time Infrastructure

### Supabase Realtime Subscriptions

| Subscription | Filter | Events | Use Case |
|--------------|--------|--------|----------|
| Job Progress | `job_id` | UPDATE | Live progress bar |
| Item Updates | `user_id` | INSERT, UPDATE | Feed updates |
| Conversations | `conversation_id` | UPDATE | New messages |

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

### Push Notification System (Web Push API)

```
    PWA                      Backend                    Push Service
    ───                      ───────                    ────────────

1. Register service worker
2. Subscribe to push manager ──────▶ POST /api/push/subscribe
                                     { endpoint, keys }
                                              │
                                     Store in push_subscriptions

                                     ... job completes ...
                                              │
                                     web-push.sendNotification() ──▶ APNS/FCM
                                                                        │
◀───────────────────────────────────────────────────────────────────────┘
    Service worker shows notification
```

---

## Security & Rate Limiting

### Authentication Flow

| Source | Method | Implementation |
|--------|--------|----------------|
| PWA/Web | Supabase Auth | JWT in httpOnly cookie, automatic refresh |
| iOS Shortcut | API Key | `Authorization: Bearer lifeos_...` header |
| Background Jobs | Service Role | Internal only, bypasses RLS |

### Rate Limiting Strategy

| Endpoint | Limit | Window | Rationale |
|----------|-------|--------|-----------|
| POST /api/share | 30 | 1 min | Main intake, LLM calls |
| POST /api/conversation | 60 | 1 min | Chat interactions |
| GET /api/items | 100 | 1 min | Read-only, cacheable |
| GET /api/jobs/:id | 120 | 1 min | Polling for status |

### Input Validation

| Content Type | Constraints |
|--------------|-------------|
| URL | Max 2,048 chars, no localhost/internal IPs, 10s fetch timeout |
| Text | Max 50,000 chars, sanitization, prompt injection detection |
| Image | JPEG/PNG/WebP/GIF, max 10MB, max 4096x4096 |

---

## Nova's Cognitive Loop

The cognitive loop is the heart of Nova's architecture. Every interaction flows through these stages.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           NOVA'S COGNITIVE LOOP                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │    INPUT ARRIVES    │
                         │  (content, message) │
                         └──────────┬──────────┘
                                    │
     ┌──────────────────────────────┼──────────────────────────────┐
     │                              │                              │
     ▼                              ▼                              ▼
┌─────────────┐             ┌─────────────┐              ┌─────────────┐
│ 1. PERCEIVE │             │2. CONTEXT   │              │ (parallel)  │
│             │             │   ASSEMBLY  │              │             │
│ "What is    │             │             │              │ Fetch meta- │
│  this?"     │             │ Memory +    │              │ data, cache │
│             │             │ RAG + User  │              │             │
│ GPT-4o-mini      │             │ Profile     │              │             │
└──────┬──────┘             └──────┬──────┘              └──────┬──────┘
       └───────────────────────────┴───────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │     3. REASON       │
                         │                     │
                         │ "What would be      │
                         │  useful to do?"     │
                         │                     │
                         │ GPT-4o (complex)      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     4. DECIDE       │
                         │                     │
                         │  HIGH (> 80%)       │──────▶ Act directly
                         │  MEDIUM (50-80%)    │──────▶ Ask conversationally
                         │  LOW (< 50%)        │──────▶ Ask openly
                         └──────────┬──────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │                                         │
               ▼                                         ▼
     ┌─────────────────┐                       ┌─────────────────┐
     │   5. PLAN       │                       │   6. RESPOND    │
     │                 │                       │                 │
     │ Break into      │                       │ Stream message  │
     │ steps, choose   │                       │ to user via SSE │
     │ tools           │                       │                 │
     └────────┬────────┘                       └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │  7. EXECUTE     │
     │  (async)        │
     │                 │
     │ Inngest/Trigger │
     │ durable steps   │
     └─────────────────┘
```

### Stage Implementation Details

| Stage | Model | Token Budget | Latency Target |
|-------|-------|--------------|----------------|
| Perceive | GPT-4o-mini | 1,000 | < 2s |
| Contextualize | N/A (retrieval) | N/A | < 500ms |
| Reason | GPT-4o | 2,000 | < 5s |
| Plan | GPT-4o | 1,500 | < 3s |
| Execute (per step) | GPT-4o-mini | 2,000 | < 10s |
| Respond | GPT-4o-mini (streaming) | 1,000 | Streaming |

---

## Model Routing Strategy

Nova uses a tiered model strategy to balance cost, speed, and capability.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          MODEL ROUTING DECISION TREE                             │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   Request   │
                              │   Arrives   │
                              └──────┬──────┘
                                     │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   PERCEPTION    │       │    REASONING    │       │   EXECUTION     │
│                 │       │                 │       │                 │
│ GPT-4o-mini          │       │ GPT-4o            │       │ GPT-4o-mini          │
│                 │       │                 │       │                 │
│ • URL analysis  │       │ • Job planning  │       │ • Summarization │
│ • Metadata      │       │ • Confidence    │       │ • Web search    │
│   extraction    │       │   assessment    │       │ • Tool calls    │
│ • Content type  │       │ • Multi-step    │       │                 │
│   detection     │       │   reasoning     │       │                 │
│                 │       │                 │       │                 │
│ ~$0.003/1K      │       │ ~$0.015/1K      │       │ ~$0.003/1K      │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Routing Rules

- **Perception tasks**: Always GPT-4o-mini (fast, cheap, good enough)
- **Planning/reasoning**: GPT-4o when confidence < 80% or multi-step planning needed
- **Execution steps**: GPT-4o-mini for individual tool calls and synthesis
- **Fallback**: If GPT-4o rate-limited, fall back to GPT-4o-mini with explicit chain-of-thought

### Cost Estimation

| Task Type | Avg Tokens | Model | Est. Cost/Call |
|-----------|------------|-------|----------------|
| Perception | 500 in / 300 out | GPT-4o-mini | ~$0.0001 |
| Reasoning | 2000 in / 500 out | GPT-4o | ~$0.02 |
| Execution (per step) | 1000 in / 500 out | GPT-4o-mini | ~$0.0003 |

*Pricing: GPT-4o-mini: $0.15/1M input, $0.60/1M output. GPT-4o: $2.50/1M input, $10/1M output.*

**Estimated cost per share interaction:**
- Simple (save only): ~$0.001
- Medium (ask + act): ~$0.03
- Complex (multi-step job): ~$0.10

---

## RAG System Architecture

### Vector Storage (pgvector)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,      -- 'item', 'conversation', 'enrichment'
  source_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,     -- SHA256 for deduplication
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX idx_embeddings_vector ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Embedding Pipeline

```
     Source Event (item created, job completed)
              │
              ▼
     ┌─────────────────┐
     │ Content Extract │
     │                 │
     │ Items: title +  │
     │   description   │
     │                 │
     │ Enrichments:    │
     │   summary +     │
     │   key_insights  │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ Content Hash    │──────▶ If exists: skip
     │ (SHA256)        │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ OpenAI          │
     │ text-embedding- │
     │ 3-small         │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ Store in        │
     │ pgvector        │
     └─────────────────┘
```

### Semantic Retrieval

```typescript
async function retrieveContext(
  query: string,
  options: { limit?: number; threshold?: number } = {}
): Promise<RetrievalResult[]> {
  const { limit = 5, threshold = 0.7 } = options;
  const queryEmbedding = await generateEmbedding(query);

  return supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  });
}
```

---

## Memory Architecture

Nova's memory system enables contextual awareness across conversations while managing token costs.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: WORKING MEMORY                                     ~2,000 tokens        │
│                                                                                  │
│ • Current conversation messages (last 10-15 turns)                              │
│ • Current item being processed                                                  │
│ • Active job state                                                              │
│ Lifetime: Request duration only                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: SESSION SUMMARIES                                  ~500 tokens          │
│                                                                                  │
│ • Rolling summary of older conversation turns                                   │
│ • Key decisions made in current session                                         │
│ Lifetime: Session (conversation.id)                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: LONG-TERM VECTOR MEMORY                           ~1,000 tokens         │
│                                                                                  │
│ • Semantic search across all past items                                         │
│ • Similar content user has shared before                                        │
│ Lifetime: Persistent (pgvector)                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TIER 4: USER PROFILE                                       ~300 tokens          │
│                                                                                  │
│ • Learned preferences                                                           │
│ • Content patterns observed                                                     │
│ Lifetime: Persistent, updated periodically                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Token Budget Guidelines

| Context Component | Target Tokens | Hard Limit |
|-------------------|---------------|------------|
| System prompt | 800 | 1,000 |
| User profile | 300 | 400 |
| Session summary | 500 | 700 |
| Working memory | 2,000 | 3,000 |
| RAG context | 1,000 | 1,500 |
| **Total context** | **4,600** | **6,600** |

---

## AI Guardrails & Safety

### Plan Validation Pipeline

```
    Nova generates plan
            │
            ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ STEP 1: ACTION ALLOWLIST CHECK                                         │
    │                                                                        │
    │ Allowed: fetch_content, summarize, web_search, analyze_image,         │
    │          synthesize, extract_metadata                                  │
    │                                                                        │
    │ BLOCKED: shell_exec, file_write, http_post, eval                      │
    └───────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ STEP 2: STEP LIMIT CHECK                                               │
    │                                                                        │
    │ Max steps per job: 10                                                  │
    │ If plan.steps.length > 10 → REJECT                                    │
    └───────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ STEP 3: TIMEOUT ENFORCEMENT                                            │
    │                                                                        │
    │ Per-step timeout: 30 seconds                                          │
    │ Total job timeout: 5 minutes                                          │
    └───────────────────────────────────────────────────────────────────────┘
```

### Cost Controls

```typescript
const TOKEN_BUDGETS = {
  per_request: 8_000,       // ~$0.10 max per request (GPT-4o)
  per_job: 50_000,          // ~$0.75 max per job
  per_user_daily: 200_000,  // ~$3.00 daily limit
  per_user_monthly: 2_000_000  // ~$30 monthly limit
};
```

---

## Observability & Monitoring

### Langfuse Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          LANGFUSE TRACING ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────────────────────┐
    │ TRACE: share_content (user_id, item_id)                                   │
    │                                                                           │
    │  ├── SPAN: perception                                                     │
    │  │    └── GENERATION: gpt-4o-mini (500 in, 300 out, $0.0001)             │
    │  │                                                                        │
    │  ├── SPAN: context_assembly                                               │
    │  │    ├── RETRIEVAL: vector_search (5 results, 0.82 avg similarity)      │
    │  │    └── RETRIEVAL: user_profile (loaded)                                │
    │  │                                                                        │
    │  ├── SPAN: reasoning                                                      │
    │  │    └── GENERATION: gpt-4o (2000 in, 500 out, $0.02)                   │
    │  │                                                                        │
    │  └── SPAN: response                                                       │
    │       └── GENERATION: gpt-4o-mini (streaming, 800 out)                    │
    └───────────────────────────────────────────────────────────────────────────┘
```

### Alerting Rules

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 5% over 5 min | PagerDuty alert |
| Cost spike | > 2x daily average | Slack notification |
| P95 latency | > 10s perception | Investigate |
| Job failure rate | > 10% | Review error logs |

---

## Infrastructure & Deployment

### Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Runtime** | Node.js 20.x | Server runtime |
| **Framework** | Next.js 15 | Full-stack React, API routes |
| **Database** | Supabase (Postgres) | Realtime, JSONB support, RLS |
| **Vector DB** | pgvector (Supabase) | Embeddings, semantic search |
| **Job Queue** | Inngest or Trigger.dev | Durable job execution |
| **AI - Perception** | GPT-4o-mini | Fast perception |
| **AI - Reasoning** | GPT-4o | Complex reasoning |
| **Embeddings** | text-embedding-3-small | Vector embeddings |
| **LLM Observability** | Langfuse | Tracing, cost tracking |
| **Push** | Web Push API | Notifications |
| **Hosting** | Vercel (Pro) | Serverless, extended timeouts |

### Environment Configuration

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (LLM + embeddings)
OPENAI_API_KEY=sk-...

# Job Queue
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Observability
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...

# Optional: Web Search
TAVILY_API_KEY=...

# MVP Mode (single user, no auth)
MVP_SINGLE_USER=true
MVP_USER_ID=550e8400-e29b-41d4-a716-446655440000
```

### MVP Path: Single User Mode

For initial deployment:

```
Phase 1 (MVP):
• Single user, no auth required
• All data belongs to one implicit user
• RLS policies use fixed user ID

Phase 2 (Multi-user):
• Enable Supabase Auth
• RLS policies use auth.uid()
• Add API key management UI
```

---

## Summary

This architecture document captures the key design decisions for LifeOS:

1. **Reasoning-first AI**: Nova reasons dynamically rather than pattern-matching
2. **Flexible data models**: JSONB for dynamic schemas, no rigid enums
3. **Durable job execution**: Inngest/Trigger.dev for reliable background processing
4. **4-tier memory system**: Context-aware across conversations
5. **Cost-controlled AI**: Token budgets and model routing
6. **Security by default**: RLS at database level, input validation

For detailed implementation, see:
- [DESIGN.md](./DESIGN.md) - Full design document with code examples
- [AI-ARCHITECTURE.md](./AI-ARCHITECTURE.md) - Deep dive on AI/LLM patterns
- [FUTURE_FEATURES.md](./FUTURE_FEATURES.md) - Planned features including WhatsApp integration

---

## MCP Server Architecture

LifeOS exposes its capabilities via an MCP (Model Context Protocol) server, enabling Claude and other AI agents to interact with user data.

### Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **Ingestion** | `lifeos_ingest_content`, `lifeos_ingest_image` | Save content from external sources |
| **Query** | `lifeos_query_search`, `lifeos_query_recent`, `lifeos_query_ask_nova` | Search and retrieve items |
| **UI Control** | `lifeos_ui_apply_filter`, `lifeos_ui_clear_filters` | Control the web UI remotely |

### WhatsApp Integration Flow

```
WhatsApp User ──▶ Twilio Webhook ──▶ LifeOS Server ──▶ Claude (MCP Tools) ──▶ Response
      │                                    │
      │                                    ├── lifeos_ingest_* (save content)
      │                                    └── lifeos_query_* (search/query)
      │
      ◀────────────────────────────────────── Rich WhatsApp Response
```

### Authentication

- **WhatsApp users** authenticate via phone number linking
- **MCP server** uses API keys for LifeOS API access
- **User context** is derived from the linked WhatsApp number
