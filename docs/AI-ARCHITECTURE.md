# AI/LLM Architecture

This document details the AI and LLM architecture for LifeOS, covering Nova's cognitive engine, model routing, RAG system, memory architecture, and operational guardrails.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [LLM Integration Patterns](#llm-integration-patterns)
3. [Nova's Cognitive Loop](#novas-cognitive-loop)
4. [Model Routing Strategy](#model-routing-strategy)
5. [RAG System Architecture](#rag-system-architecture)
6. [Memory Architecture](#memory-architecture)
7. [Agent Orchestration](#agent-orchestration)
8. [Streaming & Response Patterns](#streaming--response-patterns)
9. [AI Guardrails & Safety](#ai-guardrails--safety)
10. [Observability & Cost Tracking](#observability--cost-tracking)
11. [Error Handling & Resilience](#error-handling--resilience)

---

## Architecture Overview

LifeOS is built on a **reasoning-first** architecture where Nova, the AI agent, dynamically reasons about each interaction rather than pattern-matching to predefined behaviors.

```
                        ┌─────────────────────────────────────────────────────────┐
                        │                    NOVA: AI REASONING ENGINE            │
                        └─────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────────────────────────────────────────────┐     ┌─────────────────┐
│   INPUT LAYER   │     │                                                         │     │  OUTPUT LAYER   │
│                 │     │   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌───────┐  │     │                 │
│ - iOS Share     │────▶│   │Perceive │──▶│ Reason  │──▶│ Decide  │──▶│ Plan  │  │────▶│ - Streamed Msgs │
│ - PWA Direct    │     │   └─────────┘   └─────────┘   └─────────┘   └───────┘  │     │ - Push Notifs   │
│ - Siri Shortcut │     │        │              │              │           │      │     │ - Background    │
│                 │     │        ▼              ▼              ▼           ▼      │     │   Job Results   │
└─────────────────┘     │   ┌─────────────────────────────────────────────────┐  │     └─────────────────┘
                        │   │              CONTEXT ASSEMBLY                    │  │
                        │   │  Memory Tiers + RAG + User Profile + History    │  │
                        │   └─────────────────────────────────────────────────┘  │
                        └─────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
                        ┌─────────────────────────────────────────────────────────┐
                        │                    DATA LAYER                           │
                        │                                                         │
                        │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
                        │  │ items    │  │ jobs     │  │ convos   │  │ vectors │ │
                        │  │ (JSONB)  │  │ (plans)  │  │ (memory) │  │(pgvector│ │
                        │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
                        └─────────────────────────────────────────────────────────┘
```

### Core Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Reasoning over matching** | No predefined categories, enums, or lookup tables |
| **Dynamic planning** | Plans stored as JSONB, structure emerges from content |
| **Flexible output** | No rigid schemas for enrichment results |
| **Context-aware** | 4-tier memory system informs every decision |

---

## LLM Integration Patterns

### Provider Configuration

```typescript
// lib/llm/config.ts

interface LLMConfig {
  provider: 'openai';
  models: {
    perception: string;   // Fast, cheap - content analysis
    reasoning: string;    // Powerful - planning, decisions
    execution: string;    // Fast - tool execution
    summarization: string; // Fast - memory compression
  };
  embeddings: {
    model: string;
    dimensions: number;
  };
}

export const LLM_CONFIG: LLMConfig = {
  provider: 'openai',
  models: {
    perception: 'gpt-4o-mini',      // Fast, cheap
    reasoning: 'gpt-4o',            // Powerful reasoning
    execution: 'gpt-4o-mini',       // Fast tool execution
    summarization: 'gpt-4o-mini',   // Memory compression
  },
  embeddings: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
};
```

### API Client Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LLM CLIENT ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌───────────────────────────────────────┐
                    │           LLMClient (Facade)          │
                    │                                       │
                    │  - Unified interface for all calls    │
                    │  - Automatic tracing (Langfuse)       │
                    │  - Token budget enforcement           │
                    │  - Cost tracking                      │
                    └───────────────────┬───────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
    ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
    │   Perception    │       │    Reasoning    │       │   Execution     │
    │   Handler       │       │    Handler      │       │   Handler       │
    │                 │       │                 │       │                 │
    │ - GPT-4o-mini   │       │ - GPT-4o        │       │ - GPT-4o-mini   │
    │ - Streaming     │       │ - Structured    │       │ - Tool calling  │
    │ - Fast response │       │ - Chain-of-     │       │ - Retries       │
    │                 │       │   thought       │       │                 │
    └─────────────────┘       └─────────────────┘       └─────────────────┘
```

### OpenAI SDK Integration

```typescript
// lib/llm/client.ts

import OpenAI from 'openai';
import { Langfuse } from 'langfuse';
import { LLM_CONFIG } from './config';

export class NovaLLMClient {
  private openai: OpenAI;
  private langfuse: Langfuse;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.langfuse = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
    });
  }

  async perceive(params: PerceiveParams): Promise<PerceptionResult> {
    const trace = this.langfuse.trace({ name: 'perceive' });
    const span = trace.span({ name: 'perception_call' });

    try {
      const response = await this.openai.chat.completions.create({
        model: LLM_CONFIG.models.perception,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: PERCEPTION_SYSTEM_PROMPT },
          { role: 'user', content: params.content }
        ],
      });

      const message = response.choices[0].message;

      span.end({
        output: message.content,
        metadata: {
          input_tokens: response.usage?.prompt_tokens,
          output_tokens: response.usage?.completion_tokens,
        },
      });

      return this.parsePerceptionResponse(response);
    } catch (error) {
      span.end({ level: 'ERROR', statusMessage: error.message });
      throw error;
    }
  }

  async reason(params: ReasonParams): Promise<ReasoningResult> {
    // Similar pattern with GPT-4o model
  }

  async execute(params: ExecuteParams): Promise<ExecutionResult> {
    // Tool execution with GPT-4o-mini
  }
}
```

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
│  this?"     │             │ "What do I  │              │ data, check │
│             │             │  know?"     │              │ cache       │
│ Model:      │             │             │              │             │
│ GPT-4o-mini      │             │ Memory +    │              │             │
│             │             │ RAG + User  │              │             │
└──────┬──────┘             └──────┬──────┘              └──────┬──────┘
       │                           │                           │
       └───────────────────────────┴───────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │     3. REASON       │
                         │                     │
                         │ "What would be      │
                         │  useful to do?"     │
                         │                     │
                         │ Model: GPT-4o         │
                         │ (complex decisions) │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     4. DECIDE       │
                         │                     │
                         │  HIGH confidence    │──────▶ Act directly
                         │  (> 80%)            │
                         │                     │
                         │  MEDIUM confidence  │──────▶ Ask conversationally
                         │  (50-80%)           │       "This looks like X.
                         │                     │        Want me to Y?"
                         │  LOW confidence     │──────▶ Ask openly
                         │  (< 50%)            │       "I'm not sure what
                         │                     │        would be helpful."
                         └──────────┬──────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │                                         │
               ▼                                         ▼
     ┌─────────────────┐                       ┌─────────────────┐
     │   5. PLAN       │                       │   6. RESPOND    │
     │                 │                       │                 │
     │ If work needed: │                       │ Stream message  │
     │ - Break into    │                       │ to user via SSE │
     │   steps         │                       │                 │
     │ - Choose tools  │                       │ Natural tone,   │
     │ - Estimate time │                       │ not robotic     │
     └────────┬────────┘                       └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │  7. EXECUTE     │
     │  (async)        │
     │                 │
     │ Inngest/Trigger │
     │ durable steps   │
     │                 │
     │ Model: GPT-4o-mini   │
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
                                     ▼
                          ┌───────────────────┐
                          │  Classify Task    │
                          └─────────┬─────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   PERCEPTION    │       │    REASONING    │       │   EXECUTION     │
│                 │       │                 │       │                 │
│ GPT-4o-mini          │       │ GPT-4o            │       │ GPT-4o-mini          │
│                 │       │                 │       │                 │
│ Tasks:          │       │ Tasks:          │       │ Tasks:          │
│ - URL analysis  │       │ - Job planning  │       │ - Summarization │
│ - Metadata      │       │ - Confidence    │       │ - Web search    │
│   extraction    │       │   assessment    │       │   synthesis     │
│ - Content type  │       │ - Multi-step    │       │ - Tool calls    │
│   detection     │       │   reasoning     │       │                 │
│ - Image OCR     │       │ - User intent   │       │                 │
│                 │       │   parsing       │       │                 │
│ Cost: ~$0.003/  │       │ Cost: ~$0.015/  │       │ Cost: ~$0.003/  │
│       1K tokens │       │       1K tokens │       │       1K tokens │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Routing Rules

```typescript
// lib/llm/router.ts

interface RoutingDecision {
  model: 'gpt-4o-mini' | 'gpt-4o';
  reason: string;
}

export function routeRequest(params: {
  taskType: 'perception' | 'reasoning' | 'execution';
  confidence?: number;
  stepCount?: number;
  isRetry?: boolean;
}): RoutingDecision {
  const { taskType, confidence, stepCount, isRetry } = params;

  // Perception: Always GPT-4o-mini (fast, good enough)
  if (taskType === 'perception') {
    return { model: 'gpt-4o-mini', reason: 'Perception task - GPT-4o-mini sufficient' };
  }

  // Execution: Always GPT-4o-mini (tool calls don't need GPT-4o)
  if (taskType === 'execution') {
    return { model: 'gpt-4o-mini', reason: 'Execution step - GPT-4o-mini for tools' };
  }

  // Reasoning: GPT-4o for complex decisions
  if (taskType === 'reasoning') {
    // Fallback to GPT-4o-mini with explicit CoT if GPT-4o rate-limited
    if (isRetry) {
      return {
        model: 'gpt-4o-mini',
        reason: 'GPT-4o fallback - using GPT-4o-mini with chain-of-thought'
      };
    }

    // Use GPT-4o for low-confidence or multi-step planning
    if ((confidence && confidence < 0.8) || (stepCount && stepCount > 3)) {
      return {
        model: 'opus',
        reason: `Complex reasoning: confidence=${confidence}, steps=${stepCount}`
      };
    }

    // Simple reasoning can use GPT-4o-mini
    return { model: 'gpt-4o-mini', reason: 'Simple reasoning - GPT-4o-mini sufficient' };
  }

  return { model: 'gpt-4o-mini', reason: 'Default fallback' };
}
```

### Cost Estimation

| Task Type | Avg Tokens | Model | Est. Cost/Call |
|-----------|------------|-------|----------------|
| Perception | 500 in / 300 out | GPT-4o-mini | ~$0.0001 |
| Reasoning | 2000 in / 500 out | GPT-4o | ~$0.02 |
| Execution (per step) | 1000 in / 500 out | GPT-4o-mini | ~$0.0003 |
| Summarization | 2000 in / 200 out | GPT-4o-mini | ~$0.0004 |

*Pricing: GPT-4o-mini: $0.15/1M input, $0.60/1M output. GPT-4o: $2.50/1M input, $10/1M output.*

**Estimated cost per share interaction:**
- Simple (save only): ~$0.001
- Medium (ask + act): ~$0.03
- Complex (multi-step job): ~$0.10

---

## RAG System Architecture

Semantic retrieval powers Nova's contextualization step, enabling relevant context from past interactions.

### Vector Storage (pgvector)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table for semantic search
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source reference (polymorphic)
  source_type TEXT NOT NULL,      -- 'item', 'conversation', 'enrichment'
  source_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The embedded content
  content TEXT NOT NULL,          -- Original text that was embedded
  content_hash TEXT NOT NULL,     -- SHA256 for deduplication

  -- Vector embedding (1536 dimensions for text-embedding-3-small)
  embedding vector(1536) NOT NULL,

  -- Metadata for filtering
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast similarity search
-- m=16: moderate recall/speed balance
-- ef_construction=64: build-time accuracy
CREATE INDEX idx_embeddings_vector ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Lookup indexes
CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX idx_embeddings_user ON embeddings(user_id);
CREATE UNIQUE INDEX idx_embeddings_hash ON embeddings(user_id, content_hash);
```

### Embedding Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          EMBEDDING GENERATION PIPELINE                           │
└─────────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────┐
     │  Source Event   │
     │  (item created, │
     │   job completed)│
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ Content Extract │
     │                 │
     │ Items:          │
     │  title +        │
     │  description +  │
     │  extracted_text │
     │                 │
     │ Enrichments:    │
     │  summary +      │
     │  key_insights   │
     │                 │
     │ Conversations:  │
     │  session_summary│
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ Content Hash    │
     │ (SHA256)        │
     │                 │
     │ Check for dupe  │──────▶ If exists: skip
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ Chunking        │
     │ (if > 8000 char)│
     │                 │
     │ Overlap: 200    │
     │ Max chunk: 1000 │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ OpenAI Embed    │
     │                 │
     │ text-embedding- │
     │ 3-small         │
     │                 │
     │ 1536 dimensions │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │ Store in        │
     │ pgvector        │
     └─────────────────┘
```

### Semantic Retrieval Function

```sql
-- Supabase function for vector similarity search
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL,
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
    (filter_user_id IS NULL OR e.user_id = filter_user_id)
    AND (filter_source_types IS NULL OR e.source_type = ANY(filter_source_types))
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Context Assembly

```typescript
// lib/rag/context.ts

interface ContextAssembly {
  relatedItems: RetrievalResult[];
  relatedEnrichments: RetrievalResult[];
  relevantConversations: RetrievalResult[];
  formatted: string;  // Ready for prompt injection
}

export async function assembleContext(
  query: string,
  userId: string
): Promise<ContextAssembly> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Parallel retrieval with different thresholds
  const [items, enrichments, conversations] = await Promise.all([
    retrieveEmbeddings({
      embedding: queryEmbedding,
      userId,
      sourceTypes: ['item'],
      threshold: 0.7,
      limit: 5,
    }),
    retrieveEmbeddings({
      embedding: queryEmbedding,
      userId,
      sourceTypes: ['enrichment'],
      threshold: 0.75,  // Higher threshold for enrichments
      limit: 3,
    }),
    retrieveEmbeddings({
      embedding: queryEmbedding,
      userId,
      sourceTypes: ['conversation'],
      threshold: 0.7,
      limit: 2,
    }),
  ]);

  // Format for prompt injection
  const formatted = formatContextForPrompt({
    items,
    enrichments,
    conversations,
  });

  return {
    relatedItems: items,
    relatedEnrichments: enrichments,
    relevantConversations: conversations,
    formatted,
  };
}

function formatContextForPrompt(context: ContextParts): string {
  const sections: string[] = [];

  if (context.items.length > 0) {
    sections.push(
      `Related items you've seen:\n${context.items
        .map((i) => `- ${i.content} (similarity: ${i.similarity.toFixed(2)})`)
        .join('\n')}`
    );
  }

  if (context.enrichments.length > 0) {
    sections.push(
      `Related work you've done:\n${context.enrichments
        .map((e) => `- ${e.content}`)
        .join('\n')}`
    );
  }

  return sections.join('\n\n');
}
```

---

## Memory Architecture

Nova's memory system enables contextual awareness across conversations while managing token costs.

### 4-Tier Memory System

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           NOVA'S MEMORY ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: WORKING MEMORY                                        ~2,000 tokens    │
│ ─────────────────────────────────────────────────────────────────────────────── │
│                                                                                  │
│ Contents:                                                                        │
│ - Current conversation messages (last 10-15 turns)                              │
│ - Current item being processed                                                  │
│ - Active job state                                                              │
│                                                                                  │
│ Lifetime: Request duration only                                                 │
│ Storage: In-memory (passed in prompt)                                           │
│ Token Strategy: Truncate oldest messages when approaching limit                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: SESSION SUMMARIES                                     ~500 tokens       │
│ ─────────────────────────────────────────────────────────────────────────────── │
│                                                                                  │
│ Contents:                                                                        │
│ - Rolling summary of older conversation turns                                   │
│ - Key decisions made in current session                                         │
│ - Entities mentioned (items, topics, preferences)                               │
│                                                                                  │
│ Lifetime: Session (conversation.id)                                             │
│ Storage: conversations.summary (JSONB)                                          │
│ Update Trigger: When working memory exceeds 15 messages                         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: LONG-TERM VECTOR MEMORY                               ~1,000 tokens     │
│ ─────────────────────────────────────────────────────────────────────────────── │
│                                                                                  │
│ Contents:                                                                        │
│ - Semantic search results from past items                                       │
│ - Similar content user has shared before                                        │
│ - Relevant past enrichments                                                     │
│                                                                                  │
│ Lifetime: Persistent (embeddings table)                                         │
│ Retrieval: Top-k semantic similarity (k=5, threshold=0.7)                       │
│ Index: HNSW for fast approximate nearest neighbor                               │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TIER 4: USER PROFILE                                          ~300 tokens       │
│ ─────────────────────────────────────────────────────────────────────────────── │
│                                                                                  │
│ Contents:                                                                        │
│ - Learned preferences (compact representation)                                  │
│ - Content patterns observed                                                     │
│ - Interaction style notes                                                       │
│                                                                                  │
│ Lifetime: Persistent, updated every N interactions                              │
│ Storage: user_profile table                                                     │
│ Format: Compact text summary for prompt injection                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Token Budget Guidelines

| Context Component | Target Tokens | Hard Limit | Purpose |
|-------------------|---------------|------------|---------|
| System prompt | 800 | 1,000 | Nova's persona and instructions |
| User profile | 300 | 400 | Learned preferences |
| Session summary | 500 | 700 | Conversation context |
| Working memory | 2,000 | 3,000 | Recent messages |
| RAG context | 1,000 | 1,500 | Semantic retrieval |
| **Total context** | **4,600** | **6,600** | Full prompt |
| **Reserved for response** | **2,000** | **4,000** | Output budget |

### Rolling Summarization

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CONVERSATION SUMMARIZATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────┘

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
    │ (no action)     │    │ into session summary        │
    └─────────────────┘    │                             │
                           │ Model: GPT-4o-mini               │
                           │ Target: 200 tokens          │
                           └──────────────┬──────────────┘
                                          │
                                          ▼
                           ┌─────────────────────────────┐
                           │ Keep last 5 msgs verbatim   │
                           │ Prepend: "Earlier: {summary}"│
                           │                             │
                           │ Store summary in            │
                           │ conversations.summary       │
                           └─────────────────────────────┘
```

### Summarization Prompt

```typescript
const SUMMARIZATION_PROMPT = `
Summarize this conversation segment concisely. Focus on:
- Key decisions made
- User preferences revealed
- Important entities (items, topics)
- Any pending questions or tasks

Keep under 200 tokens. Write as notes, not prose.

Example output:
"User shared arxiv paper on transformers. Requested deep analysis.
Prefers detailed breakdowns. Interested in practical implementations.
Pending: Web search for community discussions."
`;
```

### User Profile Schema

```sql
CREATE TABLE user_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Learned preferences (structured for analysis)
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

-- Trigger: Update profile every 25 interactions
CREATE OR REPLACE FUNCTION maybe_update_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_interactions % 25 = 0 THEN
    -- Queue background job to regenerate profile summary
    PERFORM pg_notify('profile_update', NEW.user_id::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Agent Orchestration

Nova is a single-agent system with a cognitive loop, not a multi-agent system. However, job execution follows an orchestrated pattern.

### Job Planning Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          JOB PLANNING & EXECUTION                                │
└─────────────────────────────────────────────────────────────────────────────────┘

   User: "Dig into this paper"
            │
            ▼
   ┌────────────────────────────────────────────────────────────────────────────┐
   │ PLANNING PHASE (GPT-4o)                                                       │
   │                                                                             │
   │ Nova generates a dynamic plan:                                              │
   │                                                                             │
   │ {                                                                           │
   │   "reasoning": "User wants deep analysis of this research paper",          │
   │   "estimated_duration": "2-3 minutes",                                      │
   │   "steps": [                                                                │
   │     { "action": "fetch_content", "why": "Need full text of PDF" },         │
   │     { "action": "summarize", "config": { "depth": "detailed" },            │
   │       "why": "Extract core ideas and contributions" },                      │
   │     { "action": "web_search", "query": "transformer attention discussion", │
   │       "why": "Find what the community is saying" },                         │
   │     { "action": "synthesize", "why": "Combine into useful output" }        │
   │   ]                                                                         │
   │ }                                                                           │
   └───────────────────────────────────┬────────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────────┐
   │ VALIDATION PHASE                                                            │
   │                                                                             │
   │ - All actions in allowlist? ✓                                               │
   │ - Step count <= 10? ✓                                                       │
   │ - Estimated tokens within budget? ✓                                         │
   │ - No blocked domains in URLs? ✓                                             │
   └───────────────────────────────────┬────────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────────┐
   │ EXECUTION PHASE (Inngest/Trigger.dev)                                       │
   │                                                                             │
   │ Each step is durable - survives restarts                                    │
   │                                                                             │
   │   Step 1: fetch_content ────┐                                               │
   │   ┌─────────────────────────┘                                               │
   │   │ - Fetch PDF from arxiv                                                  │
   │   │ - Extract text                                                          │
   │   │ - Store in step_results[0]                                              │
   │   │ - Update job.current_step = 1                                           │
   │   └──────────────────────────────▶ Step 2: summarize ────┐                  │
   │                                   ┌──────────────────────┘                  │
   │                                   │ - Call GPT-4o-mini with extracted text       │
   │                                   │ - Generate detailed summary             │
   │                                   │ - Store in step_results[1]              │
   │                                   └─────────────────────────▶ ...           │
   └────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────────┐
   │ COMPLETION                                                                  │
   │                                                                             │
   │ - Synthesize all step results into final output                            │
   │ - Update job.status = 'completed'                                          │
   │ - Update item.enrichment with result                                       │
   │ - Send push notification                                                   │
   │ - Emit realtime event for UI update                                        │
   └────────────────────────────────────────────────────────────────────────────┘
```

### Tool Definitions

```typescript
// lib/jobs/tools.ts

interface Tool {
  name: string;
  description: string;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
  timeout: number;  // ms
}

export const AVAILABLE_TOOLS: Record<string, Tool> = {
  fetch_content: {
    name: 'fetch_content',
    description: 'Retrieve content from a URL (web page, PDF, etc.)',
    timeout: 15_000,
    execute: async ({ url }) => {
      // Fetch with timeout, extract text
    },
  },

  summarize: {
    name: 'summarize',
    description: 'Generate a summary of provided content',
    timeout: 30_000,
    execute: async ({ content, depth }) => {
      // Call GPT-4o-mini with summarization prompt
    },
  },

  web_search: {
    name: 'web_search',
    description: 'Search the web for information',
    timeout: 10_000,
    execute: async ({ query, limit }) => {
      // Call Tavily/Serper API
    },
  },

  analyze_image: {
    name: 'analyze_image',
    description: 'Analyze an image using vision model',
    timeout: 20_000,
    execute: async ({ imageUrl, prompt }) => {
      // Call GPT-4o-mini with vision
    },
  },

  extract_metadata: {
    name: 'extract_metadata',
    description: 'Extract structured metadata from content',
    timeout: 10_000,
    execute: async ({ content, schema }) => {
      // Structured extraction with GPT-4o-mini
    },
  },

  synthesize: {
    name: 'synthesize',
    description: 'Combine multiple results into final output',
    timeout: 30_000,
    execute: async ({ results, goal }) => {
      // Synthesis step
    },
  },
};

// Action allowlist for plan validation
export const ALLOWED_ACTIONS = Object.keys(AVAILABLE_TOOLS);
```

---

## Streaming & Response Patterns

### Server-Sent Events (SSE) for Streaming

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STREAMING RESPONSE ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────────┘

    Client                           Server                          OpenAI API
    ──────                           ──────                          ──────────

    POST /api/share
    Accept: text/event-stream
         │
         ▼
         ├──────────────────────────▶ Start perception
         │                                   │
         │  event: status                    │
         │  data: {"phase":"perceiving"}    ◀┘
         │
         │                            Stream from OpenAI
         │                                   │
         │  event: thinking                  │
         │  data: "Looking at this URL..."  ◀┼─── Streamed tokens
         │                                   │
         │  event: thinking                  │
         │  data: "This appears to be..."   ◀┘
         │
         │                            Reasoning phase
         │                                   │
         │  event: status                    │
         │  data: {"phase":"reasoning"}     ◀┘
         │
         │  event: message                   │
         │  data: {"delta":"I see you've"}  ◀┼─── Streamed response
         │  event: message                   │
         │  data: {"delta":" shared..."}    ◀┘
         │
         │  event: done
         │  data: {"item_id":"...",
         │         "conversation_id":"...",
         │         "action":"asked"}
         │
         ▼
    Update UI with
    streamed response
```

### Implementation

```typescript
// app/api/share/route.ts

export async function POST(request: Request) {
  const { content, content_type } = await request.json();

  const acceptsStream = request.headers
    .get('Accept')
    ?.includes('text/event-stream');

  if (acceptsStream) {
    return streamingResponse(content, content_type);
  }

  return jsonResponse(content, content_type);
}

async function streamingResponse(content: string, contentType: string) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // Phase 1: Perception
        send('status', { phase: 'perceiving' });

        const openai = new OpenAI();
        const perceptionStream = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          stream: true,
          messages: [
            { role: 'system', content: PERCEPTION_PROMPT },
            { role: 'user', content: buildPrompt(content, contentType) }
          ],
        });

        // Stream thinking tokens
        for await (const chunk of perceptionStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            send('thinking', delta);
          }
        }

        // Phase 2: Reasoning & Response
        send('status', { phase: 'reasoning' });

        const responseStream = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          stream: true,
          messages: [/* reasoning prompt */],
        });

        for await (const chunk of responseStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            send('message', { delta });
          }
        }

        // Final result
        const result = await processResult(/* ... */);
        send('done', result);

      } catch (error) {
        send('error', { message: error.message });
      } finally {
        controller.close();
      }
    },
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

---

## AI Guardrails & Safety

### Plan Validation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PLAN VALIDATION PIPELINE                                │
└─────────────────────────────────────────────────────────────────────────────────┘

    Nova generates plan
            │
            ▼
    ┌───────────────────────────────────────────────────────────────────────────┐
    │ STEP 1: ACTION ALLOWLIST CHECK                                             │
    │                                                                            │
    │ Allowed actions:                                                           │
    │ - fetch_content    - Retrieve URL/file content                            │
    │ - summarize        - Generate summary                                      │
    │ - web_search       - Search via Tavily/Serper                             │
    │ - analyze_image    - Vision model analysis                                 │
    │ - synthesize       - Combine results                                       │
    │ - extract_metadata - Pull structured data                                  │
    │                                                                            │
    │ BLOCKED: shell_exec, file_write, http_post, eval, code_execute            │
    │                                                                            │
    │ If any action not in allowlist -> REJECT                                   │
    └───────────────────────────────────┬───────────────────────────────────────┘
                                        │ PASS
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────────┐
    │ STEP 2: STEP LIMIT CHECK                                                   │
    │                                                                            │
    │ Max steps per job: 10                                                      │
    │ If plan.steps.length > 10 -> REJECT                                        │
    └───────────────────────────────────┬───────────────────────────────────────┘
                                        │ PASS
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────────┐
    │ STEP 3: URL VALIDATION                                                     │
    │                                                                            │
    │ Blocked: localhost, 127.0.0.1, 10.x.x.x, 192.168.x.x, file://             │
    │ Blocked: Any internal network addresses                                    │
    │ If blocked URL found -> REJECT                                             │
    └───────────────────────────────────┬───────────────────────────────────────┘
                                        │ PASS
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────────┐
    │ STEP 4: TOKEN BUDGET ESTIMATION                                            │
    │                                                                            │
    │ Estimate tokens per step based on action type                              │
    │ If total > per_job budget (50,000) -> REJECT or truncate plan              │
    └───────────────────────────────────┬───────────────────────────────────────┘
                                        │ PASS
                                        ▼
                                Plan approved for execution
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

export const TOKEN_BUDGETS: TokenBudget = {
  per_request: 8_000,       // ~$0.10 max per request (GPT-4o)
  per_job: 50_000,          // ~$0.50 max per job
  per_user_daily: 200_000,  // ~$2.00 daily limit
  per_user_monthly: 2_000_000,  // ~$20 monthly limit
};

export async function checkBudget(userId: string): Promise<{
  allowed: boolean;
  remaining_daily: number;
  remaining_monthly: number;
  reason?: string;
}> {
  const usage = await getUserUsage(userId);

  if (usage.daily >= TOKEN_BUDGETS.per_user_daily) {
    return {
      allowed: false,
      remaining_daily: 0,
      remaining_monthly: usage.monthlyRemaining,
      reason: 'Daily token limit reached. Resets at midnight UTC.',
    };
  }

  if (usage.monthly >= TOKEN_BUDGETS.per_user_monthly) {
    return {
      allowed: false,
      remaining_daily: 0,
      remaining_monthly: 0,
      reason: 'Monthly token limit reached.',
    };
  }

  return {
    allowed: true,
    remaining_daily: TOKEN_BUDGETS.per_user_daily - usage.daily,
    remaining_monthly: TOKEN_BUDGETS.per_user_monthly - usage.monthly,
  };
}
```

### Input Validation

| Input Type | Validations |
|------------|-------------|
| **URL** | Max 2,048 chars, no localhost/internal IPs, no file://, fetch timeout 10s, max response 5MB |
| **Text** | Max 50,000 chars, strip control chars, normalize unicode, prompt injection heuristics |
| **Image** | Allowed: JPEG, PNG, WebP, GIF. Max 10MB. Max 4096x4096 pixels |

### Prompt Injection Detection

```typescript
// lib/security/prompt-injection.ts

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|above)/i,
  /you\s+are\s+now\s+/i,
  /new\s+instructions:/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
];

export function detectPromptInjection(input: string): {
  detected: boolean;
  patterns: string[];
} {
  const matches = INJECTION_PATTERNS.filter((p) => p.test(input));
  return {
    detected: matches.length > 0,
    patterns: matches.map((p) => p.source),
  };
}
```

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CACHING LAYERS                                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: SEMANTIC DEDUPLICATION                                                  │
│                                                                                  │
│ Before processing new content:                                                   │
│ 1. Generate embedding                                                            │
│ 2. Check for existing item with similarity > 0.95                               │
│ 3. If match found -> Skip processing, return existing                           │
│                                                                                  │
│ Prevents: Duplicate processing of reshared content                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: URL METADATA CACHE                                                      │
│                                                                                  │
│ Cache key: SHA256(URL)                                                           │
│ TTL: 24 hours                                                                    │
│ Storage: Redis or Supabase cache table                                          │
│                                                                                  │
│ Cached: title, description, thumbnail, extracted text                           │
│ Prevents: Repeated URL fetching for same links                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: RESPONSE CACHING                                                        │
│                                                                                  │
│ Cache identical requests at application layer:                                  │
│ - System prompt + user content hash -> cached response                          │
│ - Short TTL (5 min) to ensure freshness                                         │
│ - Skip for streaming responses                                                  │
│                                                                                  │
│ Saves: 100% on repeated identical requests                                      │
│ Storage: Redis or in-memory LRU cache                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Observability & Cost Tracking

### Langfuse Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        LANGFUSE TRACING ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │    User Request     │
                    │    (trace start)    │
                    └──────────┬──────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │     TRACE: share_content       │
              │     trace_id: abc-123          │
              │     user_id: user-xyz          │
              └────────────────┬───────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ SPAN: perceive  │  │ SPAN: reason    │  │ SPAN: execute   │
│                 │  │                 │  │ (if job)        │
│ model: gpt-4o-mini   │  │ model: gpt-4o     │  │                 │
│ input_tokens:512│  │ input_tokens:   │  │ ┌─────────────┐ │
│ output_tokens:  │  │   2048          │  │ │SPAN: step_1 │ │
│   256           │  │ output_tokens:  │  │ └─────────────┘ │
│ latency: 1.2s   │  │   512           │  │ ┌─────────────┐ │
│ cost: $0.002    │  │ latency: 3.5s   │  │ │SPAN: step_2 │ │
│                 │  │ cost: $0.04     │  │ └─────────────┘ │
│ cache_hit: true │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Logging Schema

```typescript
// lib/observability/types.ts

interface LLMLogEntry {
  // Identifiers
  trace_id: string;
  span_id: string;
  parent_span_id?: string;

  // Request details
  model: 'gpt-4o-mini' | 'gpt-4o';
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
```

### Cost Tracking Table

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Request details
  request_type TEXT NOT NULL,      -- 'perception', 'reasoning', 'execution'
  model TEXT NOT NULL,             -- 'gpt-4o-mini', 'gpt-4o'

  -- Token usage
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,

  -- Cost
  estimated_cost_cents INTEGER NOT NULL,

  -- Context
  trace_id TEXT,
  job_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_user_date ON usage_tracking(user_id, created_at);
CREATE INDEX idx_usage_daily ON usage_tracking(user_id, DATE(created_at));

-- Aggregated view for dashboards
CREATE VIEW daily_usage_summary AS
SELECT
  DATE(created_at) as date,
  user_id,
  model,
  request_type,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(estimated_cost_cents) / 100.0 as total_cost_usd
FROM usage_tracking
GROUP BY DATE(created_at), user_id, model, request_type;
```

### Wrapped LLM Calls

```typescript
// lib/observability/traced-llm.ts

export async function tracedLLMCall<T>(
  spanName: string,
  fn: () => Promise<T>,
  metadata: {
    model: string;
    requestType: string;
    userId?: string;
    jobId?: string;
  }
): Promise<T> {
  const trace = langfuse.trace({
    name: spanName,
    userId: metadata.userId,
    metadata,
  });

  const span = trace.span({
    name: `llm_${metadata.requestType}`,
    metadata: { model: metadata.model },
  });

  const start = Date.now();

  try {
    const result = await fn();

    // Extract token usage from result
    const usage = extractUsage(result);

    span.end({
      output: result,
      metadata: {
        latency_ms: Date.now() - start,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        cost_usd: calculateCost(metadata.model, usage),
      },
    });

    // Track in database
    await trackUsage({
      userId: metadata.userId,
      model: metadata.model,
      requestType: metadata.requestType,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      traceId: trace.id,
      jobId: metadata.jobId,
    });

    return result;
  } catch (error) {
    span.end({
      level: 'ERROR',
      statusMessage: error.message,
    });
    throw error;
  }
}
```

---

## Error Handling & Resilience

### Error Categories & Responses

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ERROR HANDLING MATRIX                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ LLM ERRORS                                                                       │
│                                                                                  │
│ Error                      │ Response                                           │
│ ───────────────────────────┼────────────────────────────────────────────────────│
│ Rate limit (429)           │ Exponential backoff (1s, 2s, 4s), fallback GPT-4o-mini │
│ Context length exceeded    │ Truncate context, retry                           │
│ Invalid response format    │ Retry with stricter prompt (up to 2x)             │
│ API timeout                │ Retry up to 3 times with increasing timeout       │
│ Service unavailable (503)  │ Queue for retry, notify user of delay             │
│ Invalid API key            │ Alert ops, fail gracefully with user message      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ JOB ERRORS                                                                       │
│                                                                                  │
│ Error                      │ Response                                           │
│ ───────────────────────────┼────────────────────────────────────────────────────│
│ Step timeout               │ Mark step failed, continue if possible            │
│ Tool failure (fetch, etc.) │ Log error, attempt alternative approach           │
│ Plan validation failure    │ Reject job, notify user with reason               │
│ Budget exceeded mid-job    │ Pause job, notify user, allow resume              │
│ All retries exhausted      │ Mark job failed, preserve partial results         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Retry Configuration

```typescript
// lib/resilience/retry.ts

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export const RETRY_CONFIGS: Record<string, RetryConfig> = {
  llm_call: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['rate_limit_error', 'api_error', 'timeout'],
  },

  url_fetch: {
    maxAttempts: 2,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
  },

  embedding_generation: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
    retryableErrors: ['rate_limit_error', 'api_error'],
  },
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  context: { operationName: string; traceId?: string }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const isRetryable = config.retryableErrors.some(
        (e) => error.message.includes(e) || error.code === e
      );

      if (!isRetryable || attempt === config.maxAttempts) {
        throw error;
      }

      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );

      console.log(
        `[${context.operationName}] Attempt ${attempt} failed, retrying in ${delay}ms`
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}
```

### Alerting Rules

| Condition | Severity | Action |
|-----------|----------|--------|
| Error rate > 5% in 5 min | HIGH | Page on-call |
| Cost spike > 200% of rolling avg | MEDIUM | Slack alert |
| Single user > 50% of daily budget | LOW | Review for abuse |
| P95 latency > 10s | MEDIUM | Performance review |
| Job failure rate > 10% | HIGH | Investigate root cause |

---

## Environment Variables

```bash
# OpenAI (LLM + embeddings)
OPENAI_API_KEY=sk-...

# Langfuse (observability)
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Web search (optional)
TAVILY_API_KEY=tvly-...

# Cost controls
DAILY_COST_ALERT_CENTS=300     # $3.00
MONTHLY_BUDGET_CENTS=3000      # $30.00

# Caching (optional)
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...
```

---

## Summary

This AI architecture enables Nova to:

1. **Reason dynamically** - No predefined categories or rigid workflows
2. **Scale cost-effectively** - Smart model routing, caching, and budgets
3. **Remember context** - 4-tier memory with efficient token management
4. **Execute reliably** - Durable job execution with retry logic
5. **Stay observable** - Full tracing and cost tracking via Langfuse
6. **Remain safe** - Plan validation, input sanitization, and guardrails

The architecture prioritizes **simplicity** and **emergent behavior** over complex multi-agent systems, letting a single well-prompted agent handle the cognitive work while infrastructure handles durability and observability.
