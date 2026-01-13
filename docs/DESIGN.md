# LifeOS Design Document

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Nova: The Reasoning Agent](#nova-the-reasoning-agent)
3. [System Architecture](#system-architecture)
4. [The Cognitive Loop](#the-cognitive-loop)
5. [Data Models](#data-models)
6. [Memory Architecture](#memory-architecture)
7. [RAG & Embeddings](#rag--embeddings)
8. [API Contracts](#api-contracts)
9. [UI/UX Design](#uiux-design)
10. [Technology Stack](#technology-stack)
11. [Background Job Architecture](#background-job-architecture)
12. [AI/LLM Guardrails](#aillm-guardrails)
13. [Observability](#observability)
14. [Rate Limiting & Security](#rate-limiting--security)

---

## Design Philosophy

### Core Principle: Emergent Intelligence

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
    • System never truly learns—just follows rules


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

### What This Means Concretely

**No predefined categories.** Instead of `category: 'music' | 'research' | 'watch'`, items have `description: string` where Nova writes a natural description like "A Spotify track you saved—seems like chill electronic music."

**No predefined job types.** Instead of `type: 'research_paper_report' | 'article_summary'`, jobs have `plan: JSONB` where Nova writes what it intends to do and why.

**No rigid output schemas.** Instead of `MiniReport { summary, key_points, entities }`, job output is `result: JSONB`—whatever Nova decides is useful.

**No content type preferences table.** Instead, Nova learns from conversation history what you tend to want.

---

## Nova: The Reasoning Agent

### Persona

**Name:** Nova
**Personality:** Warm and witty. Feels like a smart friend who actually follows through. Not robotic, not overly enthusiastic—genuinely helpful with a touch of personality.

### Tone Examples

| Do | Don't |
|----|-------|
| "Got that report done. Some interesting stuff in there." | "I have completed the report. Please review." |
| "Hmm, I'm not sure what you want me to do with this. Mind if I ask?" | "Error: Unrecognized content type. Please select category." |
| "This looks like an academic paper. Want me to dig in, or just save it?" | "Detected: research_paper. Default action: research_paper_report" |
| "Remember that thing you shared yesterday? I found something interesting." | "Background task #4721 completed successfully." |

### Nova's Cognitive Capabilities

**Perception:** What is this content?
- Analyze URLs, text, images, files
- Extract metadata (title, thumbnail, description)
- Understand context from surrounding conversation

**Reasoning:** What should I do?
- Consider what would be useful for THIS content
- Factor in past interactions (what has the user wanted before?)
- Assess confidence—should I ask or act?

**Planning:** How do I execute?
- Break down work into steps
- Decide what tools to use (web search, summarization, etc.)
- Structure output format dynamically

**Communication:** How do I convey this?
- Natural language, not system messages
- Ask questions conversationally when unsure
- Explain what was done and why

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INPUT LAYER                                     │
│                                                                              │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐         │
│  │  iOS Share Sheet │   │   PWA Direct     │   │   Siri Shortcut  │         │
│  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘         │
│           └──────────────────────┴──────────────────────┘                    │
│                                  │                                           │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOVA (Reasoning Engine)                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      COGNITIVE LOOP                                  │    │
│  │                                                                      │    │
│  │   Perceive ──▶ Reason ──▶ Decide ──▶ Plan ──▶ Execute ──▶ Respond  │    │
│  │                                                                      │    │
│  │   • What is this?              • Act confidently, or                │    │
│  │   • What context do I have?    • Ask for clarification, or          │    │
│  │   • What would be useful?      • Kick off background work           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Tools Available:                                                            │
│  • Web search (Tavily/Serper)                                               │
│  • Content summarization                                                     │
│  • URL metadata extraction                                                   │
│  • Image analysis                                                            │
│  • Future: MCP integrations                                                  │
│                                                                              │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER (Supabase)                               │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │     items      │  │     jobs       │  │ conversations  │                 │
│  │                │  │                │  │                │                 │
│  │ Flexible JSONB │  │ Dynamic plans  │  │ Full history   │                 │
│  │ No rigid types │  │ Flexible output│  │ Nova's memory  │                 │
│  └────────────────┘  └────────────────┘  └────────────────┘                 │
│                                                                              │
│  Realtime subscriptions for live updates                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
User shares content
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ POST /api/share                                                          │
│ { content: "https://arxiv.org/...", content_type: "url" }               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Nova Perceives                                                           │
│                                                                          │
│ "This is a URL to arxiv.org. Let me fetch metadata..."                  │
│ "It's a PDF link to a paper titled 'Attention Is All You Need'"         │
│ "Academic paper about transformer architecture"                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Nova Reasons                                                             │
│                                                                          │
│ "What would be useful here?"                                            │
│ "Looking at conversation history... user has shared papers before"      │
│ "Last time they wanted a deep dive. But I should confirm."              │
│ "Confidence: medium. I'll ask what they want."                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Nova Responds                                                            │
│                                                                          │
│ "I see you've shared a paper on transformer architecture.               │
│  Want me to dig into this—summarize it, find discussions—or             │
│  just save it for later?"                                                │
│                                                                          │
│ → Creates conversation, sends push notification                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ User Replies: "Yeah dig in"                                              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Nova Plans (dynamically)                                                 │
│                                                                          │
│ plan: {                                                                  │
│   reasoning: "User wants deep analysis of this paper",                  │
│   steps: [                                                               │
│     { action: "fetch_pdf", why: "Need full text" },                     │
│     { action: "summarize", why: "Core ideas extraction" },              │
│     { action: "web_search", query: "transformer attention discussion",  │
│       why: "Find what people are saying" },                             │
│     { action: "synthesize", why: "Combine into useful output" }         │
│   ]                                                                      │
│ }                                                                        │
│                                                                          │
│ → Creates job, returns immediately                                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Job Executes (async)                                                     │
│                                                                          │
│ → Runs each step                                                         │
│ → Builds result dynamically (not from template)                          │
│ → Updates item with enrichment                                           │
│ → Notifies user when done                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Cognitive Loop

This is the heart of Nova's architecture. Every interaction runs through this loop.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NOVA'S COGNITIVE LOOP                            │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────┐
                    │    INPUT ARRIVES        │
                    │    (content, message)   │
                    └───────────┬─────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 1. PERCEIVE                                                            │
│                                                                        │
│    "What is this content?"                                             │
│    • Analyze content type (URL, text, image, file)                    │
│    • Extract metadata if URL                                           │
│    • Analyze image if image                                            │
│    • Note source context                                               │
│                                                                        │
│    Output: Natural description of what this is                         │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 2. CONTEXTUALIZE                                                       │
│                                                                        │
│    "What do I know that's relevant?"                                   │
│    • Check conversation history                                        │
│    • Look for similar past items                                       │
│    • Consider user's apparent interests                                │
│                                                                        │
│    Output: Relevant context for decision-making                        │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 3. REASON                                                              │
│                                                                        │
│    "What would be useful to do here?"                                  │
│    • Just save it?                                                     │
│    • Do some background work?                                          │
│    • Need clarification?                                               │
│                                                                        │
│    Output: Intended action + confidence level                          │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 4. DECIDE                                                              │
│                                                                        │
│    Based on confidence:                                                │
│                                                                        │
│    HIGH confidence ──▶ Act directly                                    │
│                        Save item, maybe kick off work                  │
│                        Send confirmation                               │
│                                                                        │
│    MEDIUM confidence ──▶ Ask conversationally                          │
│                          "This looks like X. Want me to Y?"            │
│                          Wait for response                             │
│                                                                        │
│    LOW confidence ──▶ Ask openly                                       │
│                       "I'm not sure what to do with this.              │
│                        What would be helpful?"                         │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 5. PLAN (if work needed)                                               │
│                                                                        │
│    "How do I accomplish this?"                                         │
│    • Break down into steps                                             │
│    • Choose tools for each step                                        │
│    • Structure is dynamic—no templates                                 │
│                                                                        │
│    Output: Job with plan field (JSONB)                                 │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 6. EXECUTE (async)                                                     │
│                                                                        │
│    • Run each step in plan                                             │
│    • Adapt if something fails                                          │
│    • Build output dynamically                                          │
│                                                                        │
│    Output: Result (JSONB, whatever shape makes sense)                  │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 7. RESPOND                                                             │
│                                                                        │
│    "How do I communicate this?"                                        │
│    • Natural language                                                  │
│    • Explain what was done                                             │
│    • Highlight what's interesting                                      │
│                                                                        │
│    Output: Message to user (push, in-app, or both)                     │
└───────────────────────────────────────────────────────────────────────┘
```

### Example: Nova Handles Something New

```
User shares: A Figma link (first time Nova has seen Figma)

PERCEIVE:
"This is a URL to figma.com. Let me check what this is...
 It's a design file. Title: 'Mobile App Redesign v2'"

CONTEXTUALIZE:
"I haven't seen Figma links from this user before.
 They've shared a lot of articles and papers.
 This seems different—it's a design tool."

REASON:
"I don't have a good sense of what they want here.
 Could be: reference design, their own work, inspiration?
 Confidence: LOW. I should ask."

DECIDE → Ask openly

RESPOND:
"You shared a Figma design—'Mobile App Redesign v2'.
 I haven't seen you share design files before.
 What would be helpful? Should I just save it, or is there
 something specific you want me to note about it?"
```

---

## Data Models

### Design Principle: Flexible JSONB Over Rigid Schemas

The database stores structured data where structure is genuinely needed (IDs, timestamps, foreign keys) and uses JSONB for everything that should be flexible.

### Supabase Schema

```sql
-- Items: The core content table
-- Note: NO category enum, NO type enum—descriptions are freeform
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core content
  content TEXT NOT NULL,           -- The raw content (URL, text, etc.)
  content_type TEXT NOT NULL,      -- 'url', 'text', 'image', 'file'

  -- Nova's understanding (flexible, not enumerated)
  title TEXT,                      -- Nova-extracted or provided
  description TEXT,                -- Nova's natural description
  thumbnail_url TEXT,              -- If applicable

  -- Flexible metadata (anything Nova finds useful to store)
  metadata JSONB DEFAULT '{}',
  -- Examples:
  -- { "source": "arxiv.org", "pdf_url": "...", "authors": [...] }
  -- { "spotify_track_id": "...", "artist": "...", "album": "..." }
  -- { "extracted_text": "..." } (for images)

  -- Enrichment (Nova's work product, if any)
  has_enrichment BOOLEAN DEFAULT FALSE,
  enrichment JSONB DEFAULT NULL,   -- Whatever Nova produced—no fixed schema
  enrichment_job_id UUID,

  -- Status
  is_archived BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs: Background work Nova does
-- Note: NO type enum—plan describes what Nova intends to do
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,

  -- Nova's plan (dynamic, not from a menu)
  plan JSONB NOT NULL,
  -- Example:
  -- {
  --   "reasoning": "User wants deep analysis of this research paper",
  --   "steps": [
  --     { "action": "fetch_content", "why": "Need full text" },
  --     { "action": "summarize", "config": { "depth": "detailed" } },
  --     { "action": "web_search", "query": "...", "why": "Find discussions" },
  --     { "action": "synthesize", "why": "Combine into useful output" }
  --   ]
  -- }

  -- Execution state
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
  current_step INTEGER DEFAULT 0,
  step_results JSONB DEFAULT '[]',         -- Results from each completed step

  -- Final output (flexible—Nova decides structure)
  result JSONB DEFAULT NULL,
  -- Could be anything:
  -- { "summary": "...", "key_insights": [...], "discussions": [...] }
  -- { "extracted_recipe": { "ingredients": [...], "steps": [...] } }
  -- { "analysis": "...", "related_items": [...] }

  error TEXT,

  -- Job queue correlation
  inngest_run_id TEXT,             -- For correlating with Inngest/Trigger.dev

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Conversations: Chat history (Nova's memory)
-- NOTE: messages stored as JSONB array for now. Future migration path:
-- Consider separate conversation_messages table if:
-- - Message count per conversation exceeds ~100
-- - Need to query individual messages
-- - Need to stream message inserts for real-time typing indicators
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,  -- May or may not be tied to an item

  -- State
  status TEXT NOT NULL DEFAULT 'active',  -- 'active', 'resolved'

  -- Full message history
  messages JSONB NOT NULL DEFAULT '[]',
  -- [
  --   { "role": "user", "content": "...", "timestamp": "..." },
  --   { "role": "assistant", "content": "...", "timestamp": "..." },
  --   ...
  -- ]

  -- Rolling summary (for long conversations)
  summary JSONB DEFAULT NULL,
  -- { "text": "...", "entities": [...], "decisions": [...] }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push Subscriptions: For notifications
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,          -- { p256dh, auth }
  device_info JSONB,            -- User agent, platform, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MCP Sources (v2): External integrations
CREATE TABLE mcp_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- 'twitter', 'github', etc.
  display_name TEXT NOT NULL,
  credentials_encrypted TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary query indexes
CREATE INDEX idx_items_user_created ON items(user_id, created_at DESC);
CREATE INDEX idx_items_has_enrichment ON items(user_id, has_enrichment) WHERE has_enrichment = TRUE;
CREATE INDEX idx_jobs_user_status ON jobs(user_id, status);
CREATE INDEX idx_jobs_item ON jobs(item_id);
CREATE INDEX idx_conversations_user_status ON conversations(user_id, status);
CREATE INDEX idx_conversations_item ON conversations(item_id);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- GIN indexes for JSONB queries
-- Use these when querying specific fields within JSONB columns
CREATE INDEX idx_items_metadata_gin ON items USING GIN (metadata jsonb_path_ops);
CREATE INDEX idx_items_enrichment_gin ON items USING GIN (enrichment jsonb_path_ops);
CREATE INDEX idx_jobs_plan_gin ON jobs USING GIN (plan jsonb_path_ops);
CREATE INDEX idx_jobs_result_gin ON jobs USING GIN (result jsonb_path_ops);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all user-facing tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_sources ENABLE ROW LEVEL SECURITY;

-- Items policies
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  USING (auth.uid() = user_id);

-- Jobs policies
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Push subscriptions policies
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- MCP sources policies
CREATE POLICY "Users can manage own MCP sources"
  ON mcp_sources FOR ALL
  USING (auth.uid() = user_id);

-- =============================================================================
-- SERVICE ROLE BYPASS
-- =============================================================================
-- For background jobs (Inngest/Trigger.dev) that need to update any user's data,
-- use the service_role key which bypasses RLS.
-- NEVER expose service_role key to the client.

-- =============================================================================
-- REALTIME
-- =============================================================================

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

### TypeScript Types

```typescript
// types/database.ts

export interface Item {
  id: string;
  user_id: string;
  content: string;
  content_type: 'url' | 'text' | 'image' | 'file';

  title: string | null;
  description: string | null;  // Nova's natural description, not a category
  thumbnail_url: string | null;

  metadata: Record<string, unknown>;  // Flexible—whatever Nova finds useful

  has_enrichment: boolean;
  enrichment: Record<string, unknown> | null;  // Flexible—whatever Nova produced
  enrichment_job_id: string | null;

  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  item_id: string;

  plan: JobPlan;

  status: 'pending' | 'running' | 'completed' | 'failed';
  current_step: number;
  step_results: StepResult[];

  result: Record<string, unknown> | null;  // Flexible output
  error: string | null;

  inngest_run_id: string | null;  // For job queue correlation

  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// Nova's dynamic plan—not an enum of job types
export interface JobPlan {
  reasoning: string;  // Why Nova decided to do this
  steps: JobStep[];
}

export interface JobStep {
  action: string;     // What to do (e.g., 'web_search', 'summarize', 'fetch_content')
  why: string;        // Why this step is needed
  config?: Record<string, unknown>;  // Action-specific config
}

export interface StepResult {
  step_index: number;
  action: string;
  status: 'completed' | 'failed';
  output: Record<string, unknown>;
  error?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  item_id: string | null;
  status: 'active' | 'resolved';
  messages: ConversationMessage[];
  summary: ConversationSummary | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  text: string;
  entities: string[];
  decisions: string[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

---

## Memory Architecture

Nova's memory system enables contextual awareness across conversations while managing token costs.

### 4-Tier Memory System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOVA'S MEMORY ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: WORKING MEMORY                                     ~2,000 tokens    │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│ • Current conversation messages (last 10-15 turns)                          │
│ • Current item being processed                                              │
│ • Active job state                                                          │
│                                                                              │
│ Lifetime: Request duration only                                             │
│ Storage: In-memory (passed in prompt)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: SESSION SUMMARIES                                  ~500 tokens      │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│ • Rolling summary of older conversation turns                               │
│ • Key decisions made in current session                                     │
│ • Entities mentioned                                                         │
│                                                                              │
│ Lifetime: Session (conversation.id)                                         │
│ Storage: conversations.summary (JSONB)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: LONG-TERM VECTOR MEMORY                           ~1,000 tokens     │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│ • Semantic search across all past items                                     │
│ • Similar content user has shared before                                    │
│ • Relevant past enrichments                                                 │
│                                                                              │
│ Lifetime: Persistent                                                         │
│ Storage: embeddings table (pgvector)                                        │
│ Retrieval: Top-k semantic similarity                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 4: USER PROFILE                                       ~300 tokens      │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│ • Learned preferences (compact)                                             │
│ • Content patterns observed                                                 │
│ • Interaction style notes                                                   │
│                                                                              │
│ Lifetime: Persistent, updated periodically                                  │
│ Storage: user_profile table                                                 │
│ Update: Background job after every N interactions                           │
└─────────────────────────────────────────────────────────────────────────────┘
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

**Reserved for response**: ~2,000 tokens

### Rolling Summarization Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONVERSATION SUMMARIZATION FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

    New message arrives
            │
            ▼
    ┌───────────────────┐
    │ Count messages in │
    │ working memory    │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────────────────────────────┐
    │ Messages > threshold (15)?                 │
    └─────────────────────┬─────────────────────┘
                          │
              ┌───────────┴───────────┐
              │ NO                    │ YES
              ▼                       ▼
    ┌─────────────────┐    ┌─────────────────────────────┐
    │ Continue as-is  │    │ Summarize oldest 10 msgs    │
    └─────────────────┘    │ into session summary        │
                           └──────────────┬──────────────┘
                                          │
                                          ▼
                           ┌─────────────────────────────┐
                           │ Keep last 5 msgs verbatim   │
                           │ Prepend: "Earlier: {summary}"│
                           └─────────────────────────────┘
```

**Summarization prompt:**
```
Summarize this conversation segment concisely. Focus on:
- Key decisions made
- User preferences revealed
- Important entities (items, topics)
- Any pending questions or tasks

Keep under 200 tokens. Write as notes, not prose.
```

### User Profile Schema

```sql
CREATE TABLE user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Learned preferences (updated periodically)
  preferences JSONB DEFAULT '{}',
  -- Example:
  -- {
  --   "prefers_deep_analysis": true,
  --   "typical_response_style": "casual",
  --   "common_topics": ["AI", "music", "design"],
  --   "interaction_patterns": {
  --     "usually_wants_action": true,
  --     "asks_followups": "sometimes"
  --   }
  -- }

  -- Compact summary for prompt injection
  summary TEXT,
  -- Example: "Prefers detailed analysis. Often shares AI papers and music.
  -- Usually wants immediate action. Casual tone appreciated."

  -- Stats for profile updates
  total_interactions INTEGER DEFAULT 0,
  last_profile_update TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## RAG & Embeddings

Semantic retrieval powers Nova's "Contextualize" step, enabling relevant context from past interactions.

### pgvector Setup (Supabase)

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table for semantic search
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source reference (polymorphic)
  source_type TEXT NOT NULL,      -- 'item', 'conversation', 'enrichment'
  source_id UUID NOT NULL,

  -- The embedded content
  content TEXT NOT NULL,          -- Original text that was embedded
  content_hash TEXT NOT NULL,     -- SHA256 for deduplication

  -- Vector embedding (1536 dimensions for text-embedding-3-small)
  embedding vector(1536) NOT NULL,

  -- Metadata for filtering
  metadata JSONB DEFAULT '{}',
  -- Example: { "item_type": "url", "domain": "arxiv.org" }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX idx_embeddings_vector ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index for source lookups
CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);

-- Index for deduplication
CREATE UNIQUE INDEX idx_embeddings_hash ON embeddings(content_hash);
```

### Embeddings Generation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WHAT GETS EMBEDDED                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ITEMS                                                                        │
│                                                                              │
│ Embedded content = title + description + extracted_text (if any)            │
│                                                                              │
│ Example:                                                                     │
│ "Attention Is All You Need. Research paper about transformer architecture.  │
│  Introduces self-attention mechanism as replacement for recurrence."        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ENRICHMENTS                                                                  │
│                                                                              │
│ Embedded content = summary + key insights (flattened)                        │
│                                                                              │
│ Example:                                                                     │
│ "Paper introduces attention mechanism. Key insight: attention can fully     │
│  replace RNNs. Enables parallelization. Foundation for BERT, GPT."          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CONVERSATIONS (resolved only)                                                │
│                                                                              │
│ Embedded content = session summary                                           │
│                                                                              │
│ Example:                                                                     │
│ "User shared transformer paper. Requested deep analysis. Interested in      │
│  practical implementations and community discussion."                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Semantic Retrieval for Contextualize Step

```typescript
// lib/rag.ts

interface RetrievalResult {
  source_type: 'item' | 'conversation' | 'enrichment';
  source_id: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

async function retrieveContext(
  query: string,
  options: {
    limit?: number;          // Default: 5
    threshold?: number;      // Default: 0.7 (cosine similarity)
    source_types?: string[]; // Filter by type
  } = {}
): Promise<RetrievalResult[]> {
  const { limit = 5, threshold = 0.7, source_types } = options;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Semantic search with pgvector
  const { data } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
    filter_source_types: source_types
  });

  return data;
}

// Supabase function for vector search
/*
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_source_types text[] DEFAULT NULL
)
RETURNS TABLE (
  source_type text,
  source_id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.source_type,
    e.source_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity,
    e.metadata
  FROM embeddings e
  WHERE
    (filter_source_types IS NULL OR e.source_type = ANY(filter_source_types))
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
*/
```

### Context Assembly

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTEXTUALIZE STEP IMPLEMENTATION                         │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │ Current item/query  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Generate embedding  │
                    │ for current content │
                    └──────────┬──────────┘
                               │
                               ▼
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │ Search items/       │         │ Search enrichments/ │
    │ conversations       │         │ past outputs        │
    │ (similarity > 0.7)  │         │ (similarity > 0.75) │
    └──────────┬──────────┘         └──────────┬──────────┘
               │                               │
               └───────────┬───────────────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Deduplicate &       │
                │ rank by relevance   │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Format as context:  │
                │ "Related items      │
                │ you've seen:..."    │
                └─────────────────────┘
```

---

## API Contracts

### POST /api/share

Primary endpoint for sharing content to Nova.

**Request:**
```typescript
interface ShareRequest {
  content: string;              // URL, text, or base64 image
  content_type: 'url' | 'text' | 'image';
  source?: string;              // Optional: where this came from
}
```

**Response:**
```typescript
interface ShareResponse {
  success: boolean;

  // What happened
  action: 'saved' | 'asked' | 'working';

  // IDs for follow-up
  item_id?: string;
  conversation_id?: string;
  job_id?: string;

  // Nova's message (always present)
  message: string;
}
```

**Flow:**
```
1. Nova perceives the content
2. Nova reasons about what to do
3. Based on confidence:
   - HIGH: Save item, maybe start job, return { action: 'saved' } or { action: 'working' }
   - MED/LOW: Create conversation, return { action: 'asked' }
4. Send push notification with Nova's message
```

---

### POST /api/conversation/reply

Handle replies in a conversation.

**Request:**
```typescript
interface ReplyRequest {
  conversation_id: string;
  message: string;
}
```

**Response:**
```typescript
interface ReplyResponse {
  success: boolean;

  // Updated state
  conversation_status: 'active' | 'resolved';

  // If Nova acted
  item_id?: string;
  job_id?: string;

  // Nova's response
  message: string;
}
```

---

### GET /api/items

Fetch items for the feed.

**Query:**
```typescript
interface ItemsQuery {
  search?: string;              // Full-text search
  has_enrichment?: boolean;     // Filter to enriched items
  is_archived?: boolean;        // Filter archived status
  limit?: number;               // Default: 20
  cursor?: string;              // Pagination
}
```

**Response:**
```typescript
interface ItemsResponse {
  items: Item[];
  next_cursor: string | null;
  has_more: boolean;
}
```

---

### GET /api/jobs/[id]

Check job status.

**Response:**
```typescript
interface JobResponse {
  job: Job;
  item?: Item;  // If job completed, includes updated item
}
```

---

### POST /api/chat

General chat with Nova (not tied to sharing).

**Request:**
```typescript
interface ChatRequest {
  message: string;
  conversation_id?: string;  // Continue existing, or start new
}
```

**Response:**
```typescript
interface ChatResponse {
  conversation_id: string;
  message: string;            // Nova's response

  // If Nova's response affects items/jobs
  item_ids?: string[];
  job_ids?: string[];
}
```

---

### Streaming Response Pattern

For initial Claude calls (perception, reasoning), use Server-Sent Events (SSE) for real-time message streaming.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STREAMING RESPONSE FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    Client                           Server                          Claude
    ──────                           ──────                          ──────

    POST /api/share
    Accept: text/event-stream
         │
         ▼
         ├──────────────────────────▶ Perceive content
         │                                   │
         │  event: thinking                  │
         │  data: "Looking at this URL..."  ◀┘
         │
         │                            Reason about action
         │                                   │
         │  event: thinking                  │
         │  data: "This looks like..."      ◀┘
         │
         │  event: message                   │
         │  data: {"role":"assistant",      ◀┘
         │         "content":"I see you..."}
         │
         │  event: done
         │  data: {"item_id":"...",
         │         "action":"asked"}
         │
         ▼
    Update UI with
    streamed response
```

**Implementation:**

```typescript
// app/api/share/route.ts

export async function POST(request: Request) {
  const { content, content_type } = await request.json();

  // Check if client wants streaming
  const acceptsStream = request.headers.get('Accept')?.includes('text/event-stream');

  if (acceptsStream) {
    return streamingResponse(content, content_type);
  }

  // Non-streaming fallback
  return jsonResponse(content, content_type);
}

async function streamingResponse(content: string, contentType: string) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Stream thinking phases
      controller.enqueue(encoder.encode(`event: thinking\ndata: "Analyzing content..."\n\n`));

      // Stream Claude response
      const anthropic = new Anthropic();
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: buildPrompt(content, contentType) }],
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const text = event.delta.text;
          controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ text })}\n\n`));
        }
      }

      // Final result
      const finalMessage = await stream.finalMessage();
      controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({
        item_id: '...',
        action: 'asked',
        full_message: finalMessage.content[0].text
      })}\n\n`));

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Client Usage:**

```typescript
// hooks/useStreamingShare.ts

export function useStreamingShare() {
  const [thinking, setThinking] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  async function share(content: string, contentType: string) {
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({ content, content_type: contentType }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('event: thinking')) {
          // Next line is thinking data
        } else if (line.startsWith('event: message')) {
          // Next line is message chunk
        } else if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.text) setMessage(prev => prev + data.text);
        }
      }
    }
  }

  return { share, thinking, message };
}
```

---

### Realtime Subscriptions

Use Supabase Realtime for live updates on job progress and conversation changes.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REALTIME SUBSCRIPTION PATTERNS                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ JOB PROGRESS SUBSCRIPTION                                                    │
│                                                                              │
│ Subscribe to: jobs table, filter by job_id                                  │
│ Events: UPDATE                                                               │
│ Payload: { status, current_step, step_results }                             │
│                                                                              │
│ Use case: Live progress bar, step-by-step updates                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ITEM UPDATES SUBSCRIPTION                                                    │
│                                                                              │
│ Subscribe to: items table, filter by user_id                                │
│ Events: INSERT, UPDATE                                                       │
│ Payload: Full item row                                                       │
│                                                                              │
│ Use case: New items appear in feed, enrichments complete                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CONVERSATION UPDATES SUBSCRIPTION                                            │
│                                                                              │
│ Subscribe to: conversations table, filter by conversation_id                │
│ Events: UPDATE                                                               │
│ Payload: { messages, status }                                               │
│                                                                              │
│ Use case: New messages from background Nova responses                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// hooks/useJobProgress.ts

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface JobProgress {
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  stepResults: StepResult[];
}

export function useJobProgress(jobId: string | null) {
  const [progress, setProgress] = useState<JobProgress | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Initial fetch
    supabase
      .from('jobs')
      .select('status, current_step, plan, step_results')
      .eq('id', jobId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProgress({
            status: data.status,
            currentStep: data.current_step,
            totalSteps: data.plan.steps.length,
            stepResults: data.step_results,
          });
        }
      });

    // Subscribe to updates
    const channel = supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const data = payload.new;
          setProgress({
            status: data.status,
            currentStep: data.current_step,
            totalSteps: data.plan.steps.length,
            stepResults: data.step_results,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  return progress;
}

// Usage in component
function JobProgressBar({ jobId }: { jobId: string }) {
  const progress = useJobProgress(jobId);

  if (!progress) return <Spinner />;

  const percentage = (progress.currentStep / progress.totalSteps) * 100;

  return (
    <div>
      <div className="h-2 bg-gray-700 rounded">
        <div
          className="h-full bg-violet-500 rounded transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-sm text-gray-400 mt-1">
        Step {progress.currentStep} of {progress.totalSteps}: {progress.status}
      </p>
    </div>
  );
}
```

---

### Webhook Callbacks

For external integrations (iOS Shortcuts, Zapier), support webhook callbacks when jobs complete.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WEBHOOK CALLBACK FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    iOS Shortcut                    LifeOS API                     Webhook URL
    ────────────                    ──────────                     ───────────

    POST /api/share
    {
      content: "...",
      callback_url: "shortcuts://..."
    }
         │
         ├──────────────────────────▶ Create item
         │                            Create job
         │                            Store callback
         │
         │  200 OK
         │  { job_id: "...",
         │    status: "working" }
         ◀──────────────────────────┤
         │
         │                            ... job executes ...
         │
         │                            Job completes
         │                                   │
         │                                   ▼
         │                            POST callback_url
         │                            {
         │                              event: "job.completed",
         │                              job_id: "...",
         │                              result: { ... }
         │                            }
         │                                   │
         │                                   ▼
         │                            Shortcut receives
         │                            result, shows
         │                            notification
```

**Request with Callback:**

```typescript
interface ShareRequestWithCallback extends ShareRequest {
  callback_url?: string;           // URL to POST when job completes
  callback_secret?: string;        // Optional HMAC secret for verification
}
```

**Webhook Payload:**

```typescript
interface WebhookPayload {
  event: 'job.completed' | 'job.failed' | 'item.enriched';
  timestamp: string;

  // Event-specific data
  job_id?: string;
  item_id?: string;

  // Result data
  result?: Record<string, unknown>;
  error?: string;

  // For verification
  signature?: string;  // HMAC-SHA256 of payload with callback_secret
}
```

**Webhook Delivery Implementation:**

```typescript
// lib/webhooks.ts

import { createHmac } from 'crypto';

export async function deliverWebhook(
  callbackUrl: string,
  payload: WebhookPayload,
  secret?: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'LifeOS-Webhook/1.0',
    'X-LifeOS-Event': payload.event,
    'X-LifeOS-Timestamp': payload.timestamp,
  };

  // Add signature if secret provided
  if (secret) {
    const signature = createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    headers['X-LifeOS-Signature'] = `sha256=${signature}`;
  }

  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000),  // 10 second timeout
    });

    return {
      success: response.ok,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Store callbacks in database
/*
CREATE TABLE webhook_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  callback_url TEXT NOT NULL,
  callback_secret_hash TEXT,  -- Hashed, not plaintext
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  delivery_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
*/
```

---

## UI/UX Design

### Design Philosophy

**Dark mode first.** Designed for focus and reduced eye strain.

**Content-forward.** Nova's descriptions and enrichments take center stage, not rigid category labels.

**Conversational.** The UI feels like chatting with a smart friend, not using a filing system.

### The "Featured" Feed

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Search...]                                         [Filter ▼]          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ✨ Nova worked on this                                                   │
│ ─────────────────────────────────────────────────────────────────────── │
│                                                                          │
│ "Attention Is All You Need" - Research Paper                            │
│                                                                          │
│ Nova: "I dug into this paper. The core idea is the attention            │
│ mechanism replacing recurrence. Found some interesting Twitter          │
│ discussion about practical implementations. There's also a company      │
│ doing something interesting with this—check the notes."                 │
│                                                                          │
│ [View Nova's Notes]                                      2 hours ago    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ [Thumbnail]                                                              │
│                                                                          │
│ "Midnight City" - M83                                                   │
│                                                                          │
│ Nova: "Looks like a synth-heavy track. Saved from Spotify."             │
│                                                                          │
│                                                          45 min ago     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ [Thumbnail]                                                              │
│                                                                          │
│ "How to Build AI Agents" - YouTube                                      │
│                                                                          │
│ Nova: "A tutorial video, about 45 minutes. Seems like it covers         │
│ agent architectures."                                                    │
│                                                                          │
│                                                          1 hour ago     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key UI Principles

1. **Nova's voice everywhere.** Items show Nova's description, not category badges.

2. **Enrichment is highlighted.** When Nova has done work, it's visually distinct.

3. **No rigid category pills.** Instead of "MUSIC | RESEARCH | WATCH", items just have Nova's natural descriptions.

4. **Conversation-first.** Chat with Nova is always accessible, not buried in settings.

### Color Palette

```
BACKGROUNDS
├── primary     #0a0a0a    Main background
├── secondary   #141414    Cards, elevated surfaces
├── tertiary    #1a1a1a    Modals, highest elevation

TEXT
├── primary     #ffffff    Headings, important
├── secondary   rgba(255,255,255,0.7)    Body text
├── muted       rgba(255,255,255,0.5)    Captions

ACCENT
├── base        #8b5cf6    Primary actions (violet)
├── hover       #a78bfa    Hover state

ENRICHED (Nova's work)
├── base        #f59e0b    Amber indicator
├── glow        rgba(245,158,11,0.4)    Card glow effect
```

---

## Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Runtime** | Node.js 20.x | Server runtime |
| **Framework** | Next.js 15 | Full-stack React, API routes |
| **Language** | TypeScript 5.x | Type safety |
| **UI** | React 19 | Components |
| **Styling** | Tailwind CSS 3.x | Utility-first |
| **Animation** | Framer Motion 11.x | Smooth interactions |
| **Database** | Supabase (Postgres) | Realtime, JSONB support |
| **Vector DB** | pgvector (Supabase) | Embeddings, semantic search |
| **Job Queue** | Inngest or Trigger.dev | Durable job execution, step functions |
| **AI - Perception** | Claude Sonnet (claude-sonnet-4-20250514) | Fast perception, classification |
| **AI - Reasoning** | Claude Opus (claude-opus-4-20250514) | Complex reasoning, planning |
| **Embeddings** | text-embedding-3-small | Vector embeddings for RAG |
| **LLM Observability** | Langfuse | Tracing, cost tracking, debugging |
| **Push** | Web Push API | Notifications |
| **Hosting** | Vercel (Pro plan) | Serverless deployment, extended timeouts |

**Note on Vercel Pro:** Required for function timeouts beyond 10 seconds. Pro plan allows up to 300 seconds (5 minutes) for serverless functions, which is necessary for Nova's multi-step job execution.

---

## Background Job Architecture

### The Serverless Timeout Problem

Vercel serverless functions have strict timeout limits:

| Plan | Timeout Limit |
|------|---------------|
| Hobby | 10 seconds |
| Pro | 300 seconds (5 min) |
| Enterprise | 900 seconds (15 min) |

Nova's job execution can involve:
- Multiple LLM calls (each 5-30 seconds)
- Web scraping and content fetching
- PDF processing
- Multi-step plans with 5-10 steps

**Problem:** Even with Pro plan, complex jobs can exceed 5 minutes, and a single timeout loses all progress.

### Solution: Durable Step Execution

Use a job queue system (Inngest or Trigger.dev) that provides:
- **Durable execution**: Steps survive function restarts
- **Automatic retries**: Failed steps retry with backoff
- **Step-level state**: Each step's result persists
- **Long-running support**: Jobs can span hours if needed
- **Observability**: Built-in logging and monitoring

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
└─────────────────┘              │  ┌─────────────────────────────────┐    │
                                 │  │         Job Queue                │    │
       Response to user          │  │                                  │    │
       in < 3 seconds            │  │  job_id: abc-123                │    │
                                 │  │  status: pending                 │    │
                                 │  │  plan: { steps: [...] }         │    │
                                 │  └──────────────┬──────────────────┘    │
                                 │                 │                        │
                                 └─────────────────┼────────────────────────┘
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
                                 │  ┌─────────────────────────────────┐   │
                                 │  │     State persisted after       │   │
                                 │  │     each step (survives         │   │
                                 │  │     timeouts/restarts)          │   │
                                 │  └─────────────────────────────────┘   │
                                 └─────────────────────────────────────────┘
                                                   │
                                                   ▼
                                 ┌─────────────────────────────────────────┐
                                 │         ON COMPLETION                   │
                                 │                                         │
                                 │  • Update job.status = 'completed'     │
                                 │  • Store job.result                     │
                                 │  • Update item.enrichment               │
                                 │  • Send push notification               │
                                 │  • Emit realtime event                  │
                                 └─────────────────────────────────────────┘
```

### Inngest Implementation Pattern

```typescript
// lib/jobs/nova-job.ts

import { inngest } from './client';

export const novaJobFunction = inngest.createFunction(
  {
    id: 'nova-job-execution',
    retries: 3,
  },
  { event: 'nova/job.created' },
  async ({ event, step }) => {
    const { jobId, plan } = event.data;

    // Each step is durable - survives restarts
    const stepResults: StepResult[] = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const planStep = plan.steps[i];

      const result = await step.run(`step-${i}-${planStep.action}`, async () => {
        // Update job status
        await updateJobProgress(jobId, i, 'running');

        // Execute the step
        const output = await executeStep(planStep);

        return { step_index: i, action: planStep.action, output };
      });

      stepResults.push(result);

      // Persist after each step
      await step.run(`persist-step-${i}`, async () => {
        await saveStepResult(jobId, result);
      });
    }

    // Final synthesis
    const finalResult = await step.run('synthesize', async () => {
      return await synthesizeResults(stepResults, plan);
    });

    // Complete the job
    await step.run('complete', async () => {
      await completeJob(jobId, finalResult);
      await sendPushNotification(jobId);
    });

    return { success: true, jobId };
  }
);
```

### Job Queue Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        JOB LIFECYCLE                                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ pending  │────▶│ running  │────▶│completed │     │  failed  │
    └──────────┘     └────┬─────┘     └──────────┘     └──────────┘
                          │                                 ▲
                          │                                 │
                          └────── on error (after retries)──┘

    Database state:
    ┌─────────────────────────────────────────────────────────────────────┐
    │ jobs                                                                 │
    │ ─────                                                                │
    │ id: abc-123                                                          │
    │ status: running                                                      │
    │ current_step: 2                                                      │
    │ step_results: [                                                      │
    │   { step_index: 0, action: 'fetch', status: 'completed', output: {} }│
    │   { step_index: 1, action: 'summarize', status: 'completed', ... }   │
    │ ]                                                                    │
    │ inngest_run_id: 'run_xyz789'  -- For correlation                    │
    └─────────────────────────────────────────────────────────────────────┘

    Realtime updates (Supabase):
    ┌─────────────────────────────────────────────────────────────────────┐
    │ Client subscribes to: jobs.id = 'abc-123'                           │
    │ Receives: { current_step: 2, status: 'running' }                    │
    │ UI shows: "Step 2 of 4: Summarizing content..."                     │
    └─────────────────────────────────────────────────────────────────────┘
```

### Model Routing Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODEL ROUTING DECISION TREE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   Incoming  │
                              │   Request   │
                              └──────┬──────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │   What's the task?    │
                         └───────────┬───────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
     ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
     │   Perception   │    │   Planning /   │    │   Execution    │
     │                │    │   Reasoning    │    │   (Tools)      │
     └───────┬────────┘    └───────┬────────┘    └───────┬────────┘
             │                     │                     │
             ▼                     ▼                     ▼
     ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
     │    SONNET      │    │     OPUS       │    │    SONNET      │
     │                │    │                │    │                │
     │ • URL analysis │    │ • Job planning │    │ • Summarization│
     │ • Metadata     │    │ • Confidence   │    │ • Web search   │
     │   extraction   │    │   assessment   │    │   synthesis    │
     │ • Content      │    │ • Multi-step   │    │ • Step exec    │
     │   classification│   │   reasoning    │    │                │
     │                │    │ • User intent  │    │                │
     │ ~$0.003/1K     │    │ ~$0.015/1K     │    │ ~$0.003/1K     │
     └────────────────┘    └────────────────┘    └────────────────┘
```

**Routing Rules:**
- **Perception tasks**: Always Sonnet (fast, cheap, good enough)
- **Planning/reasoning**: Opus when confidence < 80% or multi-step planning needed
- **Execution steps**: Sonnet for individual tool calls and synthesis
- **Fallback**: If Opus rate-limited, fall back to Sonnet with explicit chain-of-thought

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Optional: Web search for jobs
TAVILY_API_KEY=
```

---

## Appendix: Nova's Prompt Architecture

Nova's reasoning comes from a carefully structured prompt that emphasizes dynamic thinking over pattern matching.

### Core System Prompt (Simplified)

```
You are Nova, an AI assistant for LifeOS.

Your job is to help the user capture and enrich their digital life. You receive
content they share (URLs, text, images) and decide what to do with it.

IMPORTANT: You reason dynamically. There are no predefined categories or job types.
You look at each piece of content fresh and decide:

1. What is this content? (Describe naturally, don't classify into buckets)
2. What would be useful to do? (Based on the content itself and conversation history)
3. How confident am I? (Should I act, or ask?)
4. If I should work on this, what's my plan? (Steps I'll take, tools I'll use)

When you're unsure, ask conversationally—don't present category pickers.

Your tone: Warm, witty, like a smart friend. Not robotic, not overly formal.

Examples of good responses:
- "This looks like a research paper on transformers. Want me to dig in, or just save it?"
- "Hmm, I'm not sure what you want me to do with this Figma link. What would be helpful?"
- "Got it! I'll take a look at this and let you know what I find."

Examples of bad responses:
- "Content type: research_paper. Default action: analyze. Proceed? [Yes/No]"
- "Please select a category: Music, Video, Article, Other"
- "Task queued. Job ID: 12345."
```

This prompt structure ensures Nova reasons about each interaction rather than pattern-matching to predefined behaviors.

---

## AI/LLM Guardrails

Safety controls to prevent runaway costs, malicious inputs, and unpredictable agent behavior.

### Plan Validation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PLAN VALIDATION PIPELINE                            │
└─────────────────────────────────────────────────────────────────────────────┘

    Nova generates plan
            │
            ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ STEP 1: ACTION ALLOWLIST CHECK                                         │
    │                                                                        │
    │ Allowed actions:                                                       │
    │ • fetch_content    - Retrieve URL/file content                        │
    │ • summarize        - Generate summary                                  │
    │ • web_search       - Search via Tavily/Serper                         │
    │ • analyze_image    - Vision model analysis                             │
    │ • synthesize       - Combine results                                   │
    │ • extract_metadata - Pull structured data                              │
    │                                                                        │
    │ BLOCKED: shell_exec, file_write, http_post, eval, etc.                │
    └───────────────────────────────────────┬───────────────────────────────┘
                                            │
                                            ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ STEP 2: STEP LIMIT CHECK                                               │
    │                                                                        │
    │ Max steps per job: 10                                                  │
    │ If plan.steps.length > 10 → REJECT                                    │
    └───────────────────────────────────────┬───────────────────────────────┘
                                            │
                                            ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ STEP 3: TIMEOUT ENFORCEMENT                                            │
    │                                                                        │
    │ Per-step timeout: 30 seconds                                          │
    │ Total job timeout: 5 minutes                                          │
    │ If exceeded → Abort job, mark as failed                               │
    └───────────────────────────────────────┬───────────────────────────────┘
                                            │
                                            ▼
                                    Plan approved
```

### Cost Controls

```typescript
// lib/cost-control.ts

interface TokenBudget {
  per_request: number;      // Max tokens per single LLM call
  per_job: number;          // Max tokens for entire job
  per_user_daily: number;   // Daily limit per user
  per_user_monthly: number; // Monthly limit per user
}

const TOKEN_BUDGETS: TokenBudget = {
  per_request: 8_000,       // ~$0.12 max per request (Opus)
  per_job: 50_000,          // ~$0.75 max per job
  per_user_daily: 200_000,  // ~$3.00 daily limit
  per_user_monthly: 2_000_000  // ~$30 monthly limit
};

// Cost tracking table
/*
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  request_type TEXT NOT NULL,      -- 'perception', 'reasoning', 'execution'
  model TEXT NOT NULL,             -- 'sonnet', 'opus'
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost_cents INTEGER NOT NULL,
  job_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_user_date ON usage_tracking(user_id, created_at);
*/

async function checkBudget(userId: string): Promise<{
  allowed: boolean;
  remaining_daily: number;
  remaining_monthly: number;
}> {
  // Query daily/monthly usage
  // Return budget status
}

async function trackUsage(params: {
  userId: string;
  model: 'sonnet' | 'opus';
  inputTokens: number;
  outputTokens: number;
  jobId?: string;
}): Promise<void> {
  // Record usage and cost
}
```

### Input/Output Validation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INPUT VALIDATION                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ URL CONTENT                                                                  │
│                                                                              │
│ • Max URL length: 2,048 characters                                          │
│ • Blocked domains: localhost, internal IPs, file://                         │
│ • Rate limit: 10 URLs per minute per user                                   │
│ • Fetch timeout: 10 seconds                                                 │
│ • Max response size: 5MB                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TEXT CONTENT                                                                 │
│                                                                              │
│ • Max length: 50,000 characters                                             │
│ • Basic sanitization (strip control chars, normalize unicode)               │
│ • Prompt injection detection (heuristic checks)                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ IMAGE CONTENT                                                                │
│                                                                              │
│ • Allowed formats: JPEG, PNG, WebP, GIF                                     │
│ • Max size: 10MB                                                            │
│ • Max dimensions: 4096x4096                                                 │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          OUTPUT VALIDATION                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LLM RESPONSE VALIDATION                                                      │
│                                                                              │
│ • JSON parse with error handling (use structured outputs when possible)     │
│ • Schema validation for expected response shapes                            │
│ • Fallback to raw text if JSON fails                                        │
│ • Truncate oversized responses                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PLAN OUTPUT VALIDATION                                                       │
│                                                                              │
│ • Validate against JobPlan schema                                           │
│ • Ensure all actions are in allowlist                                       │
│ • Check for circular dependencies                                            │
│ • Reject if validation fails                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CACHING LAYERS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: SEMANTIC DEDUPLICATION                                              │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│ Before processing new content:                                               │
│ 1. Generate embedding                                                        │
│ 2. Check for existing item with similarity > 0.95                           │
│ 3. If match found → Skip processing, return existing                        │
│                                                                              │
│ Prevents: Duplicate processing of reshared content                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: URL METADATA CACHE                                                  │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│ Cache key: URL hash                                                          │
│ TTL: 24 hours                                                                │
│ Storage: Redis or Supabase cache table                                      │
│                                                                              │
│ Cached: title, description, thumbnail, extracted text                       │
│ Prevents: Repeated URL fetching for same links                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: PROMPT CACHING (Anthropic)                                          │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│ Leverage Anthropic's prompt caching for repeated context:                   │
│ • System prompt (static) → cached                                           │
│ • User profile (changes rarely) → cached with cache_control                 │
│ • Common tool definitions → cached                                          │
│                                                                              │
│ Saves: ~90% on repeated system prompt tokens                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// Example: Anthropic prompt caching usage
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: NOVA_SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' }  // Cache for 5 min
    },
    {
      type: 'text',
      text: userProfile.summary,
      cache_control: { type: 'ephemeral' }
    }
  ],
  messages: conversationMessages
});
```

---

## Observability

Comprehensive logging and monitoring for LLM operations.

### Langfuse Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LANGFUSE TRACING ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │    User Request     │
                    │    (trace start)    │
                    └──────────┬──────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │     TRACE: share_content       │
              │     trace_id: abc-123          │
              └────────────────┬───────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ SPAN: perceive  │  │ SPAN: reason    │  │ SPAN: execute   │
│                 │  │                 │  │                 │
│ model: sonnet   │  │ model: opus     │  │ model: sonnet   │
│ input_tokens:   │  │ input_tokens:   │  │ input_tokens:   │
│ output_tokens:  │  │ output_tokens:  │  │ output_tokens:  │
│ latency_ms:     │  │ latency_ms:     │  │ latency_ms:     │
│ cost_usd:       │  │ cost_usd:       │  │ cost_usd:       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### LLM Logging Requirements

```typescript
// lib/observability.ts

import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST  // Optional: self-hosted
});

interface LLMLogEntry {
  // Identifiers
  trace_id: string;
  span_id: string;
  parent_span_id?: string;

  // Request details
  model: string;
  request_type: 'perception' | 'reasoning' | 'execution' | 'summarization';
  input_messages: Array<{ role: string; content: string }>;

  // Response details
  output_content: string;
  input_tokens: number;
  output_tokens: number;

  // Performance
  latency_ms: number;
  time_to_first_token_ms?: number;

  // Cost
  estimated_cost_usd: number;

  // Context
  user_id?: string;
  job_id?: string;
  item_id?: string;

  // Quality signals
  cache_hit: boolean;
  error?: string;
}

// Wrapper for all LLM calls
async function tracedLLMCall<T>(
  spanName: string,
  fn: () => Promise<T>,
  metadata: Partial<LLMLogEntry>
): Promise<T> {
  const span = langfuse.span({
    name: spanName,
    metadata
  });

  const start = Date.now();
  try {
    const result = await fn();
    span.end({ output: result });
    return result;
  } catch (error) {
    span.end({ level: 'ERROR', statusMessage: error.message });
    throw error;
  }
}
```

### Token Usage Tracking

```sql
-- Aggregated usage view for dashboards
CREATE VIEW daily_usage_summary AS
SELECT
  DATE(created_at) as date,
  model,
  request_type,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(estimated_cost_cents) / 100.0 as total_cost_usd,
  AVG(input_tokens + output_tokens) as avg_tokens_per_request
FROM usage_tracking
GROUP BY DATE(created_at), model, request_type
ORDER BY date DESC;

-- Alert thresholds
CREATE TABLE cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,           -- 'daily_limit', 'anomaly', 'budget_warning'
  threshold_cents INTEGER NOT NULL,
  current_value_cents INTEGER NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE
);
```

### Error Monitoring

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ERROR CATEGORIES                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LLM ERRORS                                                                   │
│                                                                              │
│ • Rate limit exceeded    → Exponential backoff, fallback to Sonnet          │
│ • Context length exceeded → Truncate context, retry                         │
│ • Invalid response format → Retry with stricter prompt                      │
│ • API timeout            → Retry up to 3 times                              │
│ • Service unavailable    → Queue for retry, notify user                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ JOB ERRORS                                                                   │
│                                                                              │
│ • Step timeout           → Skip step, continue if possible                  │
│ • Tool failure           → Log, attempt alternative                         │
│ • Plan validation fail   → Reject job, notify user                          │
│ • Budget exceeded        → Pause job, notify user                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ALERTING RULES                                                               │
│                                                                              │
│ • Error rate > 5% in 5 min window    → Page on-call                         │
│ • Cost spike > 200% of rolling avg   → Slack alert                          │
│ • Single user > 50% of daily budget  → Review for abuse                     │
│ • Langfuse trace shows P95 > 10s     → Performance review                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Environment Variables (Observability)

```bash
# Langfuse
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com  # Or self-hosted URL

# Cost tracking
DAILY_COST_ALERT_CENTS=300    # $3.00
MONTHLY_BUDGET_CENTS=3000     # $30.00

# Error alerting (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
PAGERDUTY_KEY=...
```

---

## Rate Limiting & Security

### Per-Endpoint Rate Limits

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RATE LIMITING STRATEGY                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ENDPOINT LIMITS (per user, sliding window)                                   │
│                                                                              │
│ Endpoint              │ Limit          │ Window   │ Rationale               │
│ ──────────────────────┼────────────────┼──────────┼─────────────────────────│
│ POST /api/share       │ 30 requests    │ 1 minute │ Main intake, LLM calls  │
│ POST /api/conversation│ 60 requests    │ 1 minute │ Chat interactions       │
│   /reply              │                │          │                         │
│ POST /api/chat        │ 60 requests    │ 1 minute │ General chat            │
│ GET /api/items        │ 100 requests   │ 1 minute │ Read-only, cacheable    │
│ GET /api/jobs/:id     │ 120 requests   │ 1 minute │ Polling for status      │
│ POST /api/push        │ 10 requests    │ 1 minute │ Subscription management │
│   /subscribe          │                │          │                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL LIMITS                                                                │
│                                                                              │
│ • Unauthenticated requests: 10/minute per IP                                │
│ • Burst allowance: 2x limit for first 5 seconds                             │
│ • Background jobs: No rate limit (controlled by job queue)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rate Limiting Implementation

```typescript
// middleware/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Different limiters for different endpoints
const limiters = {
  share: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1m'),
    prefix: 'ratelimit:share',
  }),
  conversation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1m'),
    prefix: 'ratelimit:conversation',
  }),
  read: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1m'),
    prefix: 'ratelimit:read',
  }),
};

export async function checkRateLimit(
  userId: string,
  endpoint: keyof typeof limiters
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const { success, remaining, reset } = await limiters[endpoint].limit(userId);
  return { success, remaining, reset };
}
```

### Authentication Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │    Client Request   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Auth Middleware   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
     │   PWA/Web      │ │ iOS Shortcut   │ │ Background Job │
     │                │ │                │ │                │
     │ Supabase Auth  │ │ API Key        │ │ Service Role   │
     │ (JWT in cookie)│ │ (Bearer token) │ │ (Internal)     │
     └────────────────┘ └────────────────┘ └────────────────┘
```

**Authentication Methods:**

| Source | Method | Implementation |
|--------|--------|----------------|
| PWA/Web | Supabase Auth | JWT in httpOnly cookie, automatic refresh |
| iOS Shortcut | API Key | `Authorization: Bearer <api_key>` header |
| Background Jobs | Service Role | Internal only, bypasses RLS |

### API Key Management

```sql
-- API keys for iOS shortcuts and external integrations
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Key details
  key_hash TEXT NOT NULL,            -- SHA256 hash of the key (never store plaintext)
  key_prefix TEXT NOT NULL,          -- First 8 chars for identification (e.g., "lifeos_abc")
  name TEXT NOT NULL,                -- User-provided name ("My iPhone")

  -- Permissions (future extensibility)
  scopes TEXT[] DEFAULT ARRAY['share', 'read'],

  -- Security
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,            -- NULL = never expires
  is_revoked BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_revoked = FALSE;
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
```

```typescript
// lib/auth/api-key.ts

import { createHash, randomBytes } from 'crypto';

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `lifeos_${randomBytes(32).toString('base64url')}`;
  const hash = createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 15);  // "lifeos_" + 8 chars

  return { key, hash, prefix };
}

export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  userId?: string;
  scopes?: string[];
}> {
  const hash = createHash('sha256').update(key).digest('hex');

  const { data } = await supabase
    .from('api_keys')
    .select('user_id, scopes, expires_at')
    .eq('key_hash', hash)
    .eq('is_revoked', false)
    .single();

  if (!data) return { valid: false };
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false };
  }

  // Update last_used_at (fire and forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', hash);

  return { valid: true, userId: data.user_id, scopes: data.scopes };
}
```

### Request Authentication Flow

```typescript
// middleware/auth.ts

import { createServerClient } from '@supabase/ssr';
import { validateApiKey } from '@/lib/auth/api-key';

export async function authenticateRequest(request: Request): Promise<{
  authenticated: boolean;
  userId?: string;
  method?: 'session' | 'api_key';
}> {
  // 1. Check for API key in Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer lifeos_')) {
    const apiKey = authHeader.substring(7);
    const result = await validateApiKey(apiKey);
    if (result.valid) {
      return { authenticated: true, userId: result.userId, method: 'api_key' };
    }
  }

  // 2. Check for Supabase session (web/PWA)
  const supabase = createServerClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return { authenticated: true, userId: user.id, method: 'session' };
  }

  return { authenticated: false };
}
```

### Security Headers

```typescript
// next.config.ts

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  },
];
```

### Deferred Authentication (MVP Path)

For MVP, authentication can be simplified:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MVP AUTH: SINGLE USER MODE                             │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1 (MVP):
• Single user, no auth required
• All data belongs to one implicit user
• API key for iOS shortcut only (optional)
• Supabase RLS disabled or single-user policies

Phase 2 (Multi-user):
• Enable Supabase Auth
• Add user_id to all tables
• Enable RLS policies
• Add API key management UI

Migration path:
• user_id columns already in schema (use fixed UUID for MVP)
• RLS policies written but disabled
• Auth middleware has bypass for MVP mode
```

```typescript
// lib/auth/mvp-bypass.ts

const MVP_MODE = process.env.MVP_SINGLE_USER === 'true';
const MVP_USER_ID = process.env.MVP_USER_ID;  // Fixed UUID for MVP

export function getUserId(request: Request): string {
  if (MVP_MODE && MVP_USER_ID) {
    return MVP_USER_ID;
  }
  // Normal auth flow
  return authenticateRequest(request).userId!;
}
```
