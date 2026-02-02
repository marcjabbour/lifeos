# LifeOS Flow Diagram

> A comprehensive guide to understanding how LifeOS works, from user interaction to data processing.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [User Interaction Flows](#user-interaction-flows)
3. [Key Entities & Data Models](#key-entities--data-models)
4. [WhatsApp Setup Guide](#whatsapp-setup-guide)
5. [Production Deployment Plan](#production-deployment-plan)

---

## High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ENTRY POINTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│   │   Web   │    │   iOS   │    │WhatsApp │    │  Siri   │                 │
│   │   PWA   │    │  Share  │    │   Bot   │    │Shortcuts│                 │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘                 │
│        │              │              │              │                       │
└────────┼──────────────┼──────────────┼──────────────┼───────────────────────┘
         │              │              │              │
         └──────────────┴──────┬───────┴──────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND API (Hono)                               │
│                              Port 4000                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         PUBLIC ROUTES                                 │  │
│  │  ┌─────────────────┐  ┌─────────────────────┐  ┌─────────────────┐   │  │
│  │  │  GET /health    │  │ POST /api/whatsapp  │  │ POST /api/inngest│  │  │
│  │  │                 │  │      /webhook       │  │                  │  │  │
│  │  └─────────────────┘  └─────────────────────┘  └─────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    PROTECTED ROUTES (Auth Required)                   │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │  │
│  │  │  /api/items/*   │  │  /api/jobs/*    │  │ /api/whatsapp/link  │   │  │
│  │  │  CRUD items     │  │  Job status     │  │ Link account        │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │                               │                           │
         │                               │                           │
         ▼                               ▼                           ▼
┌─────────────────┐          ┌─────────────────────┐       ┌─────────────────┐
│    Supabase     │          │       Inngest       │       │   ADK Service   │
│   (Database)    │          │   (Job Queue)       │       │  (AI Processor) │
│                 │          │                     │       │                 │
│  - PostgreSQL   │          │  - Durable steps    │       │  - Nova AI      │
│  - Auth         │          │  - Auto-retry       │       │  - Embeddings   │
│  - Realtime     │          │  - Event-driven     │       │  - Web search   │
│  - Storage      │          │                     │       │                 │
└─────────────────┘          └─────────────────────┘       └─────────────────┘
```

### Monorepo Structure

```
lifeos/
│
├── frontend/                 # Next.js 15 Web Application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   └── lib/             # Utilities & API client
│   └── package.json
│
├── backend/                  # Hono API Server
│   ├── src/
│   │   ├── api/             # Route handlers
│   │   │   ├── items/       # Items CRUD
│   │   │   ├── jobs/        # Job status
│   │   │   ├── whatsapp/    # WhatsApp integration
│   │   │   └── health/      # Health check
│   │   ├── services/        # Business logic
│   │   │   └── whatsapp/    # WhatsApp service layer
│   │   ├── middleware/      # Auth, CORS
│   │   ├── inngest/         # Background jobs
│   │   └── utils/           # Logger, helpers
│   └── package.json
│
├── services/
│   └── adk-agent/           # AI Processing Microservice
│       └── (Google ADK)     # Content analysis & enrichment
│
├── packages/
│   ├── shared/              # Shared types & contracts
│   │   └── src/contracts/   # Zod schemas
│   └── db/                  # Database client & queries
│       └── src/queries/     # Type-safe query builders
│
└── supabase/
    └── migrations/          # Database migrations
```

---

## User Interaction Flows

### Flow 1: Save Content via Web PWA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WEB PWA CONTENT SAVE FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

  User                    Frontend                Backend               Services
   │                         │                       │                      │
   │  1. Paste/Type content  │                       │                      │
   │ ───────────────────────>│                       │                      │
   │                         │                       │                      │
   │                         │  2. POST /api/items   │                      │
   │                         │ ─────────────────────>│                      │
   │                         │                       │                      │
   │                         │                       │  3. Create item      │
   │                         │                       │ ────────────────────>│
   │                         │                       │     (Supabase)       │
   │                         │                       │<────────────────────│
   │                         │                       │                      │
   │                         │                       │  4. Trigger job      │
   │                         │                       │ ────────────────────>│
   │                         │                       │     (Inngest)        │
   │                         │                       │                      │
   │                         │  5. Return job_id     │                      │
   │                         │<─────────────────────│                      │
   │                         │                       │                      │
   │  6. Show "Processing"   │                       │                      │
   │<───────────────────────│                       │                      │
   │                         │                       │                      │
   │                         │  7. Poll job status   │                      │
   │                         │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ >│                      │
   │                         │                       │                      │
   │                         │                       │         ┌───────────┐
   │                         │                       │         │  INNGEST  │
   │                         │                       │         │  WORKER   │
   │                         │                       │         │───────────│
   │                         │                       │         │ 8. Fetch  │
   │                         │                       │         │    item   │
   │                         │                       │         │           │
   │                         │                       │         │ 9. Call   │
   │                         │                       │         │    ADK    │
   │                         │                       │         │  service  │
   │                         │                       │         │           │
   │                         │                       │         │10. Update │
   │                         │                       │         │    item   │
   │                         │                       │         └───────────┘
   │                         │                       │                      │
   │                         │  11. Realtime update  │                      │
   │                         │<═════════════════════│                      │
   │                         │   (Supabase WS)      │                      │
   │                         │                       │                      │
   │ 12. Show enriched item  │                       │                      │
   │<───────────────────────│                       │                      │
   │                         │                       │                      │
```

### Flow 2: Save Content via WhatsApp

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WHATSAPP CONTENT SAVE FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

  WhatsApp          Twilio            Backend               Inngest        ADK
  User              Infra             /webhook              Worker       Service
   │                  │                  │                    │            │
   │  1. Send msg     │                  │                    │            │
   │ ────────────────>│                  │                    │            │
   │                  │                  │                    │            │
   │                  │  2. POST webhook │                    │            │
   │                  │ ────────────────>│                    │            │
   │                  │                  │                    │            │
   │                  │                  │  3. Validate       │            │
   │                  │                  │     signature      │            │
   │                  │                  │                    │            │
   │                  │                  │  4. Parse message  │            │
   │                  │                  │     & detect       │            │
   │                  │                  │     intent         │            │
   │                  │                  │                    │            │
   │                  │                  │  5. Look up user   │            │
   │                  │                  │     by phone       │            │
   │                  │                  │                    │            │
   │                  │                  │  6. Create item    │            │
   │                  │                  │     & job          │            │
   │                  │                  │                    │            │
   │                  │  7. TwiML resp   │                    │            │
   │                  │<────────────────│                    │            │
   │                  │                  │                    │            │
   │  8. "Received.   │                  │                    │            │
   │     Processing"  │                  │                    │            │
   │<────────────────│                  │                    │            │
   │                  │                  │                    │            │
   │                  │                  │  9. Enqueue job    │            │
   │                  │                  │ ──────────────────>│            │
   │                  │                  │                    │            │
   │                  │                  │                    │ 10. Call   │
   │                  │                  │                    │ ──────────>│
   │                  │                  │                    │            │
   │                  │                  │                    │    11.     │
   │                  │                  │                    │  Analyze   │
   │                  │                  │                    │  content   │
   │                  │                  │                    │            │
   │                  │                  │                    │<──────────│
   │                  │                  │                    │   Result   │
   │                  │                  │                    │            │
   │                  │                  │                    │ 12. Update │
   │                  │                  │                    │     DB     │
   │                  │                  │                    │            │
   │                  │                  │  13. Notification  │            │
   │                  │                  │<──────────────────│            │
   │                  │                  │      job           │            │
   │                  │                  │                    │            │
   │                  │  14. Send msg    │                    │            │
   │                  │<────────────────│                    │            │
   │                  │                  │                    │            │
   │ 15. "Saved!      │                  │                    │            │
   │     'Article'    │                  │                    │            │
   │     → #tech"     │                  │                    │            │
   │<────────────────│                  │                    │            │
```

### Flow 3: WhatsApp Account Linking

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WHATSAPP ACCOUNT LINKING FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

  User               Web Dashboard           Backend             WhatsApp
   │                      │                     │                    │
   │  1. Click "Link      │                     │                    │
   │     WhatsApp"        │                     │                    │
   │ ────────────────────>│                     │                    │
   │                      │                     │                    │
   │                      │  2. POST /api/      │                    │
   │                      │     whatsapp/link   │                    │
   │                      │ ───────────────────>│                    │
   │                      │                     │                    │
   │                      │                     │  3. Generate       │
   │                      │                     │     6-digit code   │
   │                      │                     │                    │
   │                      │                     │  4. Store in       │
   │                      │                     │     whatsapp_      │
   │                      │                     │     link_codes     │
   │                      │                     │     (15 min TTL)   │
   │                      │                     │                    │
   │                      │  5. Return code     │                    │
   │                      │<───────────────────│                    │
   │                      │                     │                    │
   │  6. Display:         │                     │                    │
   │     "Send 847291     │                     │                    │
   │     to +1..."        │                     │                    │
   │<────────────────────│                     │                    │
   │                      │                     │                    │
   │                      │                     │                    │
   │  7. Send "847291"    │                     │                    │
   │     to WhatsApp #    │                     │                    │
   │ ─────────────────────┼─────────────────────┼───────────────────>│
   │                      │                     │                    │
   │                      │                     │  8. Webhook        │
   │                      │                     │<───────────────────│
   │                      │                     │                    │
   │                      │                     │  9. Verify code    │
   │                      │                     │     via RPC        │
   │                      │                     │                    │
   │                      │                     │  10. Create        │
   │                      │                     │      whatsapp_     │
   │                      │                     │      users record  │
   │                      │                     │                    │
   │                      │                     │  11. Send via      │
   │                      │                     │      Twilio API    │
   │                      │                     │ ──────────────────>│
   │                      │                     │                    │
   │ 12. "Welcome to      │                     │                    │
   │     LifeOS! Your     │                     │                    │
   │     account is       │                     │                    │
   │     linked."         │                     │                    │
   │<─────────────────────┼─────────────────────┼───────────────────│
   │                      │                     │                    │
   │                      │  13. Realtime       │                    │
   │                      │      update         │                    │
   │                      │<═══════════════════│                    │
   │                      │                     │                    │
   │  14. Show "Linked!"  │                     │                    │
   │<────────────────────│                     │                    │
```

### Flow 4: AI Processing Pipeline (Nova)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NOVA AI PROCESSING PIPELINE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │           RAW CONTENT               │
                    │  (text, url, image, audio)          │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
          ┌───────────────────────────────────────────────────────┐
          │                    PERCEPTION STAGE                    │
          │                    (GPT-4o-mini)                       │
          │    ┌─────────────────────────────────────────────┐    │
          │    │  "What is this content?"                    │    │
          │    │   - Content type detection                  │    │
          │    │   - Language identification                 │    │
          │    │   - Initial structure analysis              │    │
          │    └─────────────────────────────────────────────┘    │
          └───────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
          ┌───────────────────────────────────────────────────────┐
          │                    REASONING STAGE                     │
          │                      (GPT-4o)                          │
          │    ┌─────────────────────────────────────────────┐    │
          │    │  "What should I do with this?"              │    │
          │    │   - Determine actions needed                │    │
          │    │   - Plan execution steps                    │    │
          │    │   - Select appropriate tools                │    │
          │    └─────────────────────────────────────────────┘    │
          └───────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
          ┌───────────────────────────────────────────────────────┐
          │                    EXECUTION STAGE                     │
          │                    (GPT-4o-mini)                       │
          │    ┌─────────────────────────────────────────────┐    │
          │    │  Available Tools:                           │    │
          │    │   - Web fetch (extract article content)     │    │
          │    │   - Web search (find related info)          │    │
          │    │   - Transcription (audio → text)            │    │
          │    │   - Vision (image analysis)                 │    │
          │    │   - Embedding (semantic vectors)            │    │
          │    └─────────────────────────────────────────────┘    │
          └───────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
          ┌───────────────────────────────────────────────────────┐
          │                  SYNTHESIS STAGE                       │
          │                    (GPT-4o-mini)                       │
          │    ┌─────────────────────────────────────────────┐    │
          │    │  Generate enrichment:                       │    │
          │    │   - Title (if not provided)                 │    │
          │    │   - Summary                                 │    │
          │    │   - Category                                │    │
          │    │   - Tags (semantic, deduplicated)           │    │
          │    │   - Domain-specific metadata                │    │
          │    └─────────────────────────────────────────────┘    │
          └───────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │          ENRICHED ITEM              │
                    │  (stored in Supabase)               │
                    └─────────────────────────────────────┘
```

---

## Key Entities & Data Models

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP DIAGRAM                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   auth.users    │
                              │─────────────────│
                              │ id (PK)         │
                              │ email           │
                              │ created_at      │
                              └────────┬────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│       items         │    │   whatsapp_users    │    │   tag_embeddings    │
│─────────────────────│    │─────────────────────│    │─────────────────────│
│ id (PK)             │    │ id (PK)             │    │ id (PK)             │
│ user_id (FK) ───────┼────│ user_id (FK)        │    │ user_id (FK)        │
│ title               │    │ phone_number        │    │ tag_name            │
│ raw_content         │    │ display_name        │    │ normalized_name     │
│ content_type        │    │ verified_at         │    │ category            │
│ url                 │    │ last_message_at     │    │ embedding (vector)  │
│ media_url           │    │ created_at          │    │ usage_count         │
│ category            │    │ updated_at          │    │ created_at          │
│ tags[]              │    └──────────┬──────────┘    └─────────────────────┘
│ metadata (JSONB)    │               │
│ enrichment (JSONB)  │               │
│ has_enrichment      │               ▼
│ is_archived         │    ┌─────────────────────┐
│ is_completed        │    │  whatsapp_messages  │
│ created_at          │    │─────────────────────│
│ updated_at          │    │ id (PK)             │
└──────────┬──────────┘    │ whatsapp_user_id(FK)│
           │               │ message_sid         │
           │               │ direction           │
           │               │ message_type        │
           ▼               │ content             │
┌─────────────────────┐    │ media_url           │
│        jobs         │    │ item_id (FK) ───────┼─── links to items
│─────────────────────│    │ processed_at        │
│ id (PK)             │    │ error_message       │
│ user_id (FK)        │    │ created_at          │
│ item_id (FK) ───────┼────└─────────────────────┘
│ status              │
│ plan (JSONB)        │
│ step_results[]      │
│ result (JSONB)      │
│ error_message       │
│ created_at          │
│ updated_at          │
└─────────────────────┘
```

### Data Model Details

#### 1. `items` - Core Content Storage

```typescript
interface Item {
  // Identity
  id: string;                    // UUID, primary key
  user_id: string;               // FK to auth.users

  // Content
  title: string | null;          // Generated or extracted title
  raw_content: string | null;    // Original input text
  content_type: ContentType;     // 'text' | 'url' | 'image' | 'audio'
  url: string | null;            // For URL content type
  media_url: string | null;      // For image/audio content types

  // AI Enrichment
  category: string | null;       // 'tech', 'food', 'music', etc.
  tags: string[];                // Semantic tags
  metadata: Record<string, any>; // Domain-specific (recipes: ingredients)
  enrichment: {                  // Nova's analysis
    summary?: string;
    topics?: string[];
    entities?: string[];
    sentiment?: string;
    readingTime?: number;
  } | null;
  has_enrichment: boolean;       // Processing complete flag

  // State
  is_archived: boolean;          // Soft delete
  is_completed: boolean;         // For actionable items

  // Timestamps
  created_at: string;            // ISO datetime
  updated_at: string;            // ISO datetime
}

type ContentType = 'text' | 'url' | 'image' | 'audio';
```

#### 2. `jobs` - Background Processing

```typescript
interface Job {
  // Identity
  id: string;                    // UUID, primary key
  user_id: string;               // FK to auth.users
  item_id: string;               // FK to items

  // State
  status: JobStatus;             // Current processing state

  // Execution
  plan: {                        // Nova's execution plan
    steps: Array<{
      action: string;
      tool: string;
      priority: number;
    }>;
  } | null;

  step_results: Array<{          // Progress tracking
    step: string;
    status: 'completed' | 'failed' | 'skipped';
    result?: any;
    error?: string;
    duration_ms: number;
  }>;

  result: Record<string, any>;   // Final output
  error_message: string | null;  // If failed

  // Timestamps
  created_at: string;
  updated_at: string;
}

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

#### 3. `whatsapp_users` - Account Linking

```typescript
interface WhatsAppUser {
  // Identity
  id: string;                    // UUID, primary key
  user_id: string;               // FK to auth.users (linked account)

  // WhatsApp Details
  phone_number: string;          // Format: '+14155238886'
  display_name: string | null;   // WhatsApp profile name

  // State
  verified_at: string | null;    // When account was verified
  last_message_at: string | null;// Last interaction

  // Timestamps
  created_at: string;
  updated_at: string;
}
```

#### 4. `whatsapp_messages` - Message Log

```typescript
interface WhatsAppMessage {
  // Identity
  id: string;                    // UUID, primary key
  whatsapp_user_id: string;      // FK to whatsapp_users
  message_sid: string;           // Twilio message SID

  // Message Details
  direction: 'inbound' | 'outbound';
  message_type: MessageType;
  content: string | null;        // Text content
  media_url: string | null;      // Media URL if applicable
  media_content_type: string;    // MIME type

  // Processing
  item_id: string | null;        // FK to created item (if any)
  processed_at: string | null;
  error_message: string | null;

  // Timestamps
  created_at: string;
}

type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document';
```

#### 5. `tag_embeddings` - Semantic Tag Deduplication

```typescript
interface TagEmbedding {
  // Identity
  id: string;                    // UUID, primary key
  user_id: string;               // FK to auth.users

  // Tag Info
  tag_name: string;              // Display name: "Machine Learning"
  normalized_name: string;       // Lowercase: "machine learning"
  category: string | null;       // Optional grouping

  // Vector
  embedding: number[];           // 1536-dim vector (text-embedding-3-small)

  // Usage
  usage_count: number;           // How many items use this tag

  // Timestamps
  created_at: string;
  updated_at: string;
}
```

---

## WhatsApp Setup Guide

### Prerequisites Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PREREQUISITES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ ] Twilio account (https://www.twilio.com)                               │
│  [ ] WhatsApp Business API access (via Twilio)                             │
│  [ ] Publicly accessible backend URL (for webhooks)                        │
│  [ ] Environment variables configured                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Twilio Account Setup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STEP 1: TWILIO ACCOUNT SETUP                             │
└─────────────────────────────────────────────────────────────────────────────┘

1. Create Twilio Account
   └─→ https://www.twilio.com/try-twilio

2. Navigate to Console
   └─→ https://console.twilio.com

3. Find Credentials (Dashboard → Account Info)
   ├─→ Account SID:  ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   └─→ Auth Token:   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

4. Activate WhatsApp Sandbox (for development)
   └─→ Console → Messaging → Try it out → Send a WhatsApp message
   └─→ Follow the sandbox activation instructions
       (Send "join <sandbox-code>" to +1 415 523 8886)

5. Note Sandbox Number
   └─→ whatsapp:+14155238886 (Twilio sandbox)
```

### Step 2: Environment Configuration

```bash
# backend/.env

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# For production, set NODE_ENV to enable signature validation
NODE_ENV=development  # or 'production'
```

### Step 3: Webhook Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STEP 3: WEBHOOK CONFIGURATION                            │
└─────────────────────────────────────────────────────────────────────────────┘

For Local Development (ngrok):
──────────────────────────────
1. Install ngrok: brew install ngrok
2. Start tunnel: ngrok http 4000
3. Copy HTTPS URL: https://abc123.ngrok.io
4. Set webhook in Twilio:
   └─→ Console → Messaging → Settings → WhatsApp Sandbox
   └─→ "When a message comes in": https://abc123.ngrok.io/api/whatsapp/webhook
   └─→ HTTP Method: POST


For Production:
──────────────────────────────
1. Deploy backend to production
2. Set webhook in Twilio:
   └─→ Console → Messaging → Settings → WhatsApp Sender
   └─→ "When a message comes in": https://api.your-domain.com/api/whatsapp/webhook
   └─→ HTTP Method: POST
```

### Step 4: User Account Linking

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STEP 4: USER ACCOUNT LINKING                             │
└─────────────────────────────────────────────────────────────────────────────┘

Web Dashboard Flow:
───────────────────

1. User logs into LifeOS web app

2. Navigate to Settings → WhatsApp Integration

3. Click "Link WhatsApp Account"
   └─→ Backend generates 6-digit code
   └─→ Code stored with 15-minute expiration
   └─→ UI displays: "Send 847291 to +1 415 523 8886"

4. User opens WhatsApp
   └─→ Sends "847291" to the Twilio number

5. Backend receives webhook
   └─→ Recognizes code pattern
   └─→ Validates code via verify_whatsapp_link_code() RPC
   └─→ Creates whatsapp_users record
   └─→ Sends welcome message

6. User receives confirmation
   └─→ "Welcome to LifeOS! Your account is now linked."


API Endpoint:
─────────────

POST /api/whatsapp/link
Authorization: Bearer <jwt>

Response:
{
  "code": "847291",
  "expiresAt": "2024-01-15T12:15:00Z",
  "whatsappNumber": "+14155238886"
}


GET /api/whatsapp/link
Authorization: Bearer <jwt>

Response:
{
  "linked": true,
  "phoneNumber": "+1***5678",  // Masked for privacy
  "linkedAt": "2024-01-15T12:00:00Z"
}
```

### Step 5: Testing the Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STEP 5: TESTING                                          │
└─────────────────────────────────────────────────────────────────────────────┘

Test Messages to Send:
──────────────────────

1. Text Content:
   "Remember to buy groceries tomorrow"
   └─→ Expected: Saved as text item with reminder intent detected

2. URL:
   "https://example.com/article-about-react"
   └─→ Expected: Saved as URL, fetched and enriched

3. Image:
   [Send a screenshot]
   └─→ Expected: Saved as image, analyzed via vision

4. Commands:
   "/help"    → Shows available commands
   "/recent"  → Shows last 5 saved items
   "/search react" → Searches items containing "react"
   "/delete"  → Initiates delete flow for last item
   "/unlink"  → Unlinks WhatsApp account


Verify in Database:
───────────────────

-- Check linked account
SELECT * FROM whatsapp_users WHERE user_id = '<your-user-id>';

-- Check messages received
SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 10;

-- Check items created
SELECT * FROM items WHERE user_id = '<your-user-id>' ORDER BY created_at DESC;
```

---

## Production Deployment Plan

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRODUCTION ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────┐
                          │    Cloudflare       │
                          │    (CDN + WAF)      │
                          └──────────┬──────────┘
                                     │
            ┌────────────────────────┴────────────────────────┐
            │                                                  │
            ▼                                                  ▼
┌─────────────────────┐                          ┌─────────────────────┐
│   Vercel            │                          │   Railway / Render  │
│   (Frontend)        │                          │   (Backend API)     │
│                     │                          │                     │
│   - Next.js SSR     │                          │   - Hono server     │
│   - Static assets   │                          │   - Docker container│
│   - Edge functions  │                          │   - Auto-scaling    │
└─────────────────────┘                          └──────────┬──────────┘
                                                            │
         ┌──────────────────────────────────────────────────┤
         │                    │                             │
         ▼                    ▼                             ▼
┌─────────────────┐  ┌─────────────────┐         ┌─────────────────┐
│   Supabase      │  │    Inngest      │         │   ADK Service   │
│   (Database)    │  │   (Job Queue)   │         │   (AI/LLM)      │
│                 │  │                 │         │                 │
│ - PostgreSQL    │  │ - Event bus     │         │ - Containerized │
│ - Auth          │  │ - Durable steps │         │ - GPU optional  │
│ - Realtime      │  │ - Retry logic   │         │ - API-based     │
│ - Storage       │  │ - Dashboard     │         │                 │
└─────────────────┘  └─────────────────┘         └─────────────────┘
```

### Phase 1: Infrastructure Setup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: INFRASTRUCTURE (Week 1)                         │
└─────────────────────────────────────────────────────────────────────────────┘

[ ] 1. Supabase Production Project
    ├─→ Create new project (production tier)
    ├─→ Enable Point-in-Time Recovery (PITR)
    ├─→ Configure connection pooling
    └─→ Set up database backup schedule

[ ] 2. Run Migrations
    ├─→ Apply all migrations from supabase/migrations/
    ├─→ Verify RLS policies are active
    └─→ Create database indexes for performance

[ ] 3. Domain & SSL
    ├─→ Purchase/configure domain
    ├─→ Set up Cloudflare (DNS + CDN)
    ├─→ Configure SSL certificates
    └─→ Set up subdomains:
        ├─→ app.lifeos.com (frontend)
        └─→ api.lifeos.com (backend)

[ ] 4. Secret Management
    ├─→ Set up secret manager (Vercel/Railway built-in or Doppler)
    └─→ Store all sensitive credentials:
        ├─→ SUPABASE_SERVICE_ROLE_KEY
        ├─→ TWILIO_AUTH_TOKEN
        ├─→ OPENAI_API_KEY
        ├─→ INNGEST_SIGNING_KEY
        └─→ LANGFUSE_SECRET_KEY
```

### Phase 2: Service Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: DEPLOYMENTS (Week 2)                            │
└─────────────────────────────────────────────────────────────────────────────┘

[ ] 1. Backend Deployment (Railway/Render)
    ├─→ Connect GitHub repo
    ├─→ Configure Dockerfile:
    │
    │   FROM node:20-slim
    │   WORKDIR /app
    │   COPY package*.json ./
    │   RUN npm ci --only=production
    │   COPY . .
    │   RUN npm run build
    │   EXPOSE 4000
    │   CMD ["npm", "start"]
    │
    ├─→ Set environment variables
    ├─→ Configure health check: GET /health
    ├─→ Enable auto-deploy on main branch
    └─→ Set up custom domain: api.lifeos.com

[ ] 2. Frontend Deployment (Vercel)
    ├─→ Connect GitHub repo
    ├─→ Set root directory: frontend/
    ├─→ Configure build command: pnpm build
    ├─→ Set environment variables:
    │   ├─→ NEXT_PUBLIC_SUPABASE_URL
    │   ├─→ NEXT_PUBLIC_SUPABASE_ANON_KEY
    │   └─→ NEXT_PUBLIC_API_URL=https://api.lifeos.com
    ├─→ Enable automatic preview deployments
    └─→ Set up custom domain: app.lifeos.com

[ ] 3. ADK Service Deployment
    ├─→ Containerize service
    ├─→ Deploy to Railway/Render/Cloud Run
    ├─→ Configure internal networking
    └─→ Set ADK_SERVICE_URL in backend env

[ ] 4. Inngest Configuration
    ├─→ Sign up at inngest.com
    ├─→ Create production app
    ├─→ Set webhook URL: https://api.lifeos.com/api/inngest
    └─→ Configure INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY
```

### Phase 3: WhatsApp Production

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: WHATSAPP PRODUCTION (Week 3)                    │
└─────────────────────────────────────────────────────────────────────────────┘

[ ] 1. WhatsApp Business Account
    ├─→ Apply for WhatsApp Business API via Twilio
    ├─→ Register business phone number
    ├─→ Complete Meta business verification
    └─→ Wait for approval (can take 1-2 weeks)

[ ] 2. Configure Production Number
    ├─→ Set up sender in Twilio Console
    ├─→ Configure webhook:
    │   └─→ https://api.lifeos.com/api/whatsapp/webhook
    ├─→ Enable delivery status callbacks
    └─→ Update TWILIO_WHATSAPP_NUMBER env var

[ ] 3. Message Templates (for outbound)
    ├─→ Create approved templates for:
    │   ├─→ Welcome message
    │   ├─→ Save confirmation
    │   └─→ Reminder notifications
    └─→ Wait for template approval

[ ] 4. Rate Limiting & Compliance
    ├─→ Implement rate limiting per user
    ├─→ Add opt-out handling (/unlink)
    ├─→ Set up message logging for compliance
    └─→ Document data retention policy
```

### Phase 4: Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: MONITORING (Week 4)                             │
└─────────────────────────────────────────────────────────────────────────────┘

[ ] 1. Error Tracking
    ├─→ Set up Sentry (or similar)
    ├─→ Configure source maps upload
    └─→ Set up error alerts

[ ] 2. Logging
    ├─→ Configure structured logging (pino)
    ├─→ Set up log aggregation (Logtail/Datadog)
    └─→ Create log-based alerts

[ ] 3. LLM Observability
    ├─→ Configure Langfuse
    ├─→ Set up cost tracking
    └─→ Monitor model performance

[ ] 4. Uptime Monitoring
    ├─→ Set up Better Uptime / UptimeRobot
    ├─→ Monitor endpoints:
    │   ├─→ https://api.lifeos.com/health
    │   └─→ https://app.lifeos.com
    └─→ Configure alerting (Slack/PagerDuty)

[ ] 5. Performance Monitoring
    ├─→ Enable Vercel Analytics (frontend)
    ├─→ Track API latency (p50, p95, p99)
    └─→ Set up dashboards
```

### Phase 5: Security Hardening

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: SECURITY (Ongoing)                              │
└─────────────────────────────────────────────────────────────────────────────┘

[ ] 1. Authentication
    ├─→ Verify JWT validation is strict
    ├─→ Ensure short token expiration
    └─→ Test refresh token flow

[ ] 2. API Security
    ├─→ Enable rate limiting (per IP, per user)
    ├─→ Validate all inputs with Zod
    ├─→ Sanitize outputs
    └─→ Set security headers (Helmet.js)

[ ] 3. Database Security
    ├─→ Verify all RLS policies
    ├─→ Audit service role key usage
    ├─→ Enable SSL for connections
    └─→ Set up audit logging

[ ] 4. Twilio Security
    ├─→ Enable signature validation (production)
    ├─→ Restrict webhook to Twilio IPs (optional)
    └─→ Rotate auth token periodically

[ ] 5. Regular Audits
    ├─→ Schedule dependency updates
    ├─→ Run npm audit weekly
    └─→ Review access permissions quarterly
```

### Environment Variables Checklist

```bash
# Production Environment Variables

# ═══════════════════════════════════════════════════════════════════════════
# BACKEND (.env)
# ═══════════════════════════════════════════════════════════════════════════

# Core
NODE_ENV=production
PORT=4000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...

# Inngest
INNGEST_EVENT_KEY=evt_...
INNGEST_SIGNING_KEY=signkey_...

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+1YOURNUMBER

# AI/LLM
OPENAI_API_KEY=sk-...
ADK_SERVICE_URL=https://adk.internal:4001

# Observability
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
SENTRY_DSN=https://xxx@sentry.io/xxx

# ═══════════════════════════════════════════════════════════════════════════
# FRONTEND (.env.local)
# ═══════════════════════════════════════════════════════════════════════════

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
NEXT_PUBLIC_API_URL=https://api.lifeos.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BNxw...
```

### Go-Live Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GO-LIVE CHECKLIST                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Pre-Launch:
───────────
[ ] All migrations applied to production database
[ ] RLS policies verified with test queries
[ ] Frontend builds successfully
[ ] Backend health check passing
[ ] Inngest webhook receiving events
[ ] WhatsApp sandbox tested end-to-end
[ ] Error tracking configured and verified
[ ] Logging pipeline working
[ ] Backup strategy documented
[ ] Rollback plan documented

Launch Day:
───────────
[ ] DNS propagation complete
[ ] SSL certificates valid
[ ] Load testing completed (optional)
[ ] Team notified
[ ] Support channels ready

Post-Launch:
────────────
[ ] Monitor error rates (first 24h)
[ ] Check job completion rates
[ ] Verify WhatsApp message delivery
[ ] Review LLM costs
[ ] Gather initial user feedback
```

---

## Quick Reference

### API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/api/inngest` | POST | No | Inngest webhook |
| `/api/whatsapp/webhook` | POST | Twilio sig | WhatsApp messages |
| `/api/whatsapp/link` | GET/POST | JWT | Link WhatsApp |
| `/api/items` | GET/POST | JWT | List/Create items |
| `/api/items/:id` | GET/PATCH/DELETE | JWT | Item CRUD |
| `/api/jobs/:id` | GET | JWT | Job status |

### WhatsApp Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/recent` | List last 5 items |
| `/search <query>` | Search saved items |
| `/delete` | Delete last item |
| `/delete N` | Delete Nth recent item |
| `/unlink` | Unlink WhatsApp account |

### Job Statuses

```
pending ──→ processing ──→ completed
                │
                └──→ failed
```

---

*Last updated: January 2025*
