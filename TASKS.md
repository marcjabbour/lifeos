# LifeOS Project Tasks

## Overview

**Mobile-first personal assistant** that aggregates content from all facets of your life. Primary interface is a PWA with iOS Shortcuts integration for share sheet and voice input. The agent can ask clarifying questions via push notifications, enabling async back-and-forth conversations.

**Key differentiators:**
- Share anything from any app directly to LifeOS via iOS Share Sheet
- Voice input via Siri Shortcuts ("Hey Siri, LifeOS...")
- Agent asks clarifying questions via push notifications
- Conversational flow until content is properly categorized
- Web dashboard for deep organization and browsing

## Architecture Diagram

```
                                    LifeOS Architecture (Mobile-First)

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                         PRIMARY: MOBILE INPUT                                │
    │                                                                              │
    │  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐         │
    │  │  iOS Share Sheet │   │   Siri Shortcut  │   │   PWA Direct     │         │
    │  │  "Share to       │   │   "Hey Siri,     │   │   Chat/Voice     │         │
    │  │   LifeOS"        │   │    LifeOS..."    │   │   in App         │         │
    │  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘         │
    │           │                      │                      │                    │
    │           └──────────────────────┴──────────────────────┘                    │
    │                                  │                                           │
    │                                  ▼                                           │
    │  ┌───────────────────────────────────────────────────────────────────────┐  │
    │  │                    PWA (Installable, Push-enabled)                     │  │
    │  │  • Mobile-first responsive dashboard                                   │  │
    │  │  • Chat interface with agent                                           │  │
    │  │  • Push notification handling (reply inline)                           │  │
    │  │  • Voice recording + transcription                                     │  │
    │  └───────────────────────────────────────────────────────────────────────┘  │
    │                                                                              │
    │  SECONDARY: Slack (still supported) | Data Source Pollers (CRON)           │
    │                                                                              │
    └──────────────────────────────────────┬───────────────────────────────────────┘
                                           ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                         NEXT.JS API (CONVERSATION ENGINE)                    │
    │                                                                              │
    │  ┌─────────────────────┐    ┌─────────────────────────────────────────────┐ │
    │  │ /api/share          │    │ /api/conversation                           │ │
    │  │ - Receives content  │    │ - Manages async back-and-forth              │ │
    │  │ - From iOS Shortcut │    │ - Queues clarifying questions               │ │
    │  │ - Images, URLs, text│    │ - Waits for user replies                    │ │
    │  └─────────────────────┘    └─────────────────────────────────────────────┘ │
    │                                                                              │
    │  ┌─────────────────────┐    ┌─────────────────────────────────────────────┐ │
    │  │ /api/voice          │    │ /api/push                                   │ │
    │  │ - Siri voice input  │    │ - Send push notifications                   │ │
    │  │ - Whisper transc.   │    │ - Actionable (quick reply)                  │ │
    │  │ - Return speech     │    │ - Rich (with images)                        │ │
    │  └─────────────────────┘    └─────────────────────────────────────────────┘ │
    │                                                                              │
    └──────────────────────────────────────┬───────────────────────────────────────┘
                                           ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                        CLAUDE AI (PROCESSING + CONVERSATION)                 │
    │                                                                              │
    │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
    │  │ Content Analysis│  │ Clarification   │  │ Learning        │              │
    │  │ - Categorize    │  │ - Ambiguous?    │  │ - User prefs    │              │
    │  │ - Extract meta  │  │ - Ask question  │  │ - Pattern match │              │
    │  │ - Suggest tags  │  │ - Wait for reply│  │ - Improve       │              │
    │  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
    │                                                                              │
    │  Decision: Confident? ──────┬────────────────────┐                          │
    │                      Yes    │                    │ No                        │
    │                      ▼      ▼                    ▼                           │
    │              ┌──────────────────┐    ┌──────────────────────┐               │
    │              │ Save + Confirm   │    │ Push question        │               │
    │              │ "Added to Music" │    │ "Is this a song or   │               │
    │              └──────────────────┘    │  the background?"    │               │
    │                                      └──────────────────────┘               │
    │                                                                              │
    └──────────────────────────────────────┬───────────────────────────────────────┘
                                           ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                          SUPABASE (DATA LAYER)                               │
    │                                                                              │
    │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
    │  │   items    │ │conversations│ │push_subscr│ │user_prefs  │ │data_sources│ │
    │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
    │                                                                              │
    │  Realtime enabled for: items, conversations                                 │
    │                                                                              │
    └─────────────────────────────────────────────────────────────────────────────┘
```

## Current Status

**Not Yet Started** - Planning phase. Previous scaffolding was deleted to do this properly.

**To Be Built:**
- GitHub repository + branch strategy
- Next.js project with PWA configuration
- Supabase project and schema
- Mobile-first responsive UI
- Push notification system
- iOS Shortcuts integration
- Claude conversation engine
- Vercel deployment
- n8n workflows (secondary, for data source polling)

---

## Phase 0: Foundation (BLOCKING)

These must be completed before parallel work can begin.

### Epic 0.1: Project Setup
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| 0.1.1 | Create GitHub repo `marcjabbour/lifeos` | infra-engineer | [ ] | - |
| 0.1.2 | Push existing dashboard code to repo | infra-engineer | [ ] | 0.1.1 |
| 0.1.3 | Set up branch structure (main, develop, feature/*) | infra-engineer | [ ] | 0.1.2 |

### Epic 0.2: Supabase Setup
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| 0.2.1 | Create Supabase project | backend-architect | [ ] | - |
| 0.2.2 | Set up Row Level Security policies | backend-architect | [ ] | 0.2.1 |
| 0.2.3 | Generate database types for TypeScript | backend-architect | [ ] | 0.2.1 |

### Epic 0.3: Environment Configuration
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| 0.3.1 | Create `.env.local` template with all required vars | infra-engineer | [ ] | 0.2.1 |
| 0.3.2 | Document required API keys (Supabase, Claude, etc.) | infra-engineer | [ ] | - |
| 0.3.3 | Set up Vercel project with environment variables | infra-engineer | [ ] | 0.1.1, 0.2.1 |

---

## Phase 1: Parallel Development Tracks

After Phase 0, these 4 tracks can run in parallel.

---

## Track A: Backend/Database (backend-architect)

### Epic A.1: Database Schema
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| A.1.1 | Create `items` table with all fields from types | backend-architect | [ ] | 0.2.1 |
| A.1.2 | Create `data_sources` table | backend-architect | [ ] | 0.2.1 |
| A.1.3 | Create `sync_logs` table | backend-architect | [ ] | 0.2.1 |
| A.1.4 | Create `user_preferences` table (for AI learning) | backend-architect | [ ] | 0.2.1 |
| A.1.5 | Create `dashboard_layouts` table (for AG-UI config) | backend-architect | [ ] | 0.2.1 |
| A.1.6 | Create `conversations` table (for chat history) | backend-architect | [ ] | 0.2.1 |
| A.1.7 | Create indexes for common queries (category, created_at) | backend-architect | [ ] | A.1.1 |
| A.1.8 | Set up Supabase realtime subscriptions on `items` | backend-architect | [ ] | A.1.1 |

### Epic A.2: Next.js API Routes
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| A.2.1 | Create `GET /api/items` with filtering/pagination | backend-architect | [ ] | A.1.1 |
| A.2.2 | Create `POST /api/items` for adding new items | backend-architect | [ ] | A.1.1 |
| A.2.3 | Create `PATCH /api/items/[id]` for updates | backend-architect | [ ] | A.1.1 |
| A.2.4 | Create `DELETE /api/items/[id]` for deletion | backend-architect | [ ] | A.1.1 |
| A.2.5 | Create `GET /api/data-sources` endpoint | backend-architect | [ ] | A.1.2 |
| A.2.6 | Create `POST /api/data-sources` for adding sources | backend-architect | [ ] | A.1.2 |
| A.2.7 | Create `GET /api/sync-logs` for source health | backend-architect | [ ] | A.1.3 |
| A.2.8 | Create `GET /api/layouts` for dashboard config | backend-architect | [ ] | A.1.5 |
| A.2.9 | Create `PUT /api/layouts` for saving config | backend-architect | [ ] | A.1.5 |

### Epic A.3: Webhook Endpoints (for n8n)
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| A.3.1 | Create `POST /api/webhook/slack` for Slack events | backend-architect | [ ] | A.2.2 |
| A.3.2 | Create `POST /api/webhook/data-source` for n8n sync | backend-architect | [ ] | A.2.2 |
| A.3.3 | Add webhook signature verification | backend-architect | [ ] | A.3.1, A.3.2 |
| A.3.4 | Add rate limiting to webhook endpoints | backend-architect | [ ] | A.3.1, A.3.2 |

---

## Track B: Frontend (frontend-architect)

### Epic B.1: PWA Foundation
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| B.1.1 | Create Next.js project with TypeScript, Tailwind, Framer Motion | frontend-architect | [ ] | 0.1.1 |
| B.1.2 | Configure PWA: manifest.json, service worker, icons | frontend-architect | [ ] | B.1.1 |
| B.1.3 | Set up Web Push API for notifications | frontend-architect | [ ] | B.1.2 |
| B.1.4 | Implement push subscription management | frontend-architect | [ ] | B.1.3 |
| B.1.5 | Create Supabase client configuration | frontend-architect | [ ] | 0.2.1 |
| B.1.6 | Design system setup (colors, typography, glow effects, animations) | frontend-architect | [ ] | B.1.1 |

### Epic B.2: Mobile-First Layout
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| B.2.1 | Create responsive shell (mobile nav, desktop sidebar) | frontend-architect | [ ] | B.1.6 |
| B.2.2 | Build Card component with hover-pop glow effect | frontend-architect | [ ] | B.1.6 |
| B.2.3 | Build CardGrid with responsive columns | frontend-architect | [ ] | B.2.2 |
| B.2.4 | Build Sidebar component (categories, sources) | frontend-architect | [ ] | B.1.6 |
| B.2.5 | Build mobile bottom navigation | frontend-architect | [ ] | B.1.6 |
| B.2.6 | Create CommandInput with pulse glow animation | frontend-architect | [ ] | B.1.6 |

### Epic B.3: Chat Interface
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| B.3.1 | Create ChatView component (message list) | frontend-architect | [ ] | B.1.6 |
| B.3.2 | Create ChatBubble component (user/assistant styles) | frontend-architect | [ ] | B.3.1 |
| B.3.3 | Create ChatInput with voice button | frontend-architect | [ ] | B.3.1 |
| B.3.4 | Implement `useConversation` hook with realtime | frontend-architect | [ ] | A.1.6, B.3.1 |
| B.3.5 | Add typing indicator animation | frontend-architect | [ ] | B.3.1 |
| B.3.6 | Handle quick-reply buttons from agent | frontend-architect | [ ] | B.3.2 |

### Epic B.4: Data Integration
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| B.4.1 | Create `useItems` hook with filtering/realtime | frontend-architect | [ ] | A.2.1, B.1.5 |
| B.4.2 | Create `useCategories` hook for sidebar counts | frontend-architect | [ ] | B.4.1 |
| B.4.3 | Set up Supabase realtime for live updates | frontend-architect | [ ] | A.1.8, B.4.1 |
| B.4.4 | Create ItemDetailModal (slide-over on mobile) | frontend-architect | [ ] | B.4.1 |
| B.4.5 | Wire up dashboard with real data | frontend-architect | [ ] | B.4.1, B.2.3 |

### Epic B.5: Voice Input
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| B.5.1 | Implement Web Speech API for voice recognition | frontend-architect | [ ] | - |
| B.5.2 | Add voice recording UI (waveform, timer) | frontend-architect | [ ] | B.5.1 |
| B.5.3 | Connect voice to chat input | frontend-architect | [ ] | B.5.1, B.3.3 |
| B.5.4 | Add haptic feedback on mobile (if supported) | frontend-architect | [ ] | B.5.1 |

### Epic B.6: Push Notifications UI
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| B.6.1 | Create notification permission request flow | frontend-architect | [ ] | B.1.3 |
| B.6.2 | Handle incoming push while app is open | frontend-architect | [ ] | B.1.4 |
| B.6.3 | Create in-app notification toast component | frontend-architect | [ ] | B.6.2 |
| B.6.4 | Handle notification click -> navigate to conversation | frontend-architect | [ ] | B.6.2, B.3.4 |

### Epic B.7: Polish & Animations
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| B.7.1 | Add loading skeletons (shimmer effect) | frontend-architect | [ ] | B.4.1 |
| B.7.2 | Add page transitions (fade/slide) | frontend-architect | [ ] | B.2.1 |
| B.7.3 | Optimize list virtualization for many items | frontend-architect | [ ] | B.4.5 |
| B.7.4 | Add pull-to-refresh on mobile | frontend-architect | [ ] | B.4.1 |
| B.7.5 | Add swipe gestures for card actions | frontend-architect | [ ] | B.2.2 |

---

## Track C: AI/Agent (ai-engineer)

### Epic C.1: OpenAI Integration
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| C.1.1 | Set up OpenAI SDK in Next.js | ai-engineer | [ ] | 0.3.1 |
| C.1.2 | Create OpenAI service with retry/error handling | ai-engineer | [ ] | C.1.1 |
| C.1.3 | Design prompt templates for categorization | ai-engineer | [ ] | - |
| C.1.4 | Design prompt templates for content parsing | ai-engineer | [ ] | - |
| C.1.5 | Design prompt for ambiguity detection + question generation | ai-engineer | [ ] | - |
| C.1.6 | Implement URL metadata extraction with GPT-4o | ai-engineer | [ ] | C.1.2 |
| C.1.7 | Implement screenshot/image analysis with GPT-4o Vision | ai-engineer | [ ] | C.1.2 |

### Epic C.2: Conversation Engine
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| C.2.1 | Create `POST /api/share` endpoint for iOS Shortcut | ai-engineer | [ ] | C.1.2, A.2.2 |
| C.2.2 | Create `POST /api/conversation/reply` for user responses | ai-engineer | [ ] | C.2.1, A.1.6 |
| C.2.3 | Implement confidence scoring for categorization | ai-engineer | [ ] | C.1.3 |
| C.2.4 | Implement clarification question generation | ai-engineer | [ ] | C.1.5, C.2.3 |
| C.2.5 | Create conversation state machine (pending → asked → answered → saved) | ai-engineer | [ ] | C.2.2 |
| C.2.6 | Handle multi-turn conversations (follow-up questions) | ai-engineer | [ ] | C.2.5 |

### Epic C.3: Push Notifications
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| C.3.1 | Create `POST /api/push/send` endpoint | ai-engineer | [ ] | B.1.4 |
| C.3.2 | Design notification payloads (title, body, actions) | ai-engineer | [ ] | C.3.1 |
| C.3.3 | Implement quick-reply action buttons | ai-engineer | [ ] | C.3.2 |
| C.3.4 | Trigger push when clarification needed | ai-engineer | [ ] | C.2.4, C.3.1 |
| C.3.5 | Send confirmation push when item saved | ai-engineer | [ ] | C.3.1 |

### Epic C.4: Content Processing
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| C.4.1 | Implement tag suggestion from content | ai-engineer | [ ] | C.1.4 |
| C.4.2 | Implement title generation for URLs | ai-engineer | [ ] | C.1.6 |
| C.4.3 | Implement thumbnail extraction for URLs | ai-engineer | [ ] | C.1.6 |
| C.4.4 | Handle different content types (URL, image, text, tweet) | ai-engineer | [ ] | C.1.6, C.1.7 |

### Epic C.5: Learning System (v2 - defer for MVP)
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| C.5.1 | Track user corrections (re-categorizations) | ai-engineer | [ ] | A.1.4 |
| C.5.2 | Build user preference patterns from history | ai-engineer | [ ] | C.5.1 |
| C.5.3 | Include learned patterns in categorization prompts | ai-engineer | [ ] | C.5.2 |

### Epic C.6: AG-UI Integration (v2 - defer for MVP)
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| C.6.1 | Research AG-UI protocol and streaming | ai-engineer | [ ] | - |
| C.6.2 | Create layout modification agent actions | ai-engineer | [ ] | C.6.1 |
| C.6.3 | Implement natural language dashboard config | ai-engineer | [ ] | C.6.2 |

---

## Track D: Infrastructure & Integrations (infra-engineer)

### Epic D.1: Deployment
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| D.1.1 | Deploy to Vercel (production) | infra-engineer | [ ] | 0.3.3 |
| D.1.2 | Configure custom domain (if any) | infra-engineer | [ ] | D.1.1 |
| D.1.3 | Set up Vercel Analytics | infra-engineer | [ ] | D.1.1 |
| D.1.4 | Configure preview deployments for PRs | infra-engineer | [ ] | D.1.1 |

### Epic D.2: n8n Core Workflows
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| D.2.1 | Create Slack webhook trigger workflow | infra-engineer | [ ] | A.3.1 |
| D.2.2 | Add Claude API node for processing | infra-engineer | [ ] | D.2.1, C.2.1 |
| D.2.3 | Add Supabase insert node | infra-engineer | [ ] | D.2.2, A.1.1 |
| D.2.4 | Add error handling and Slack notification | infra-engineer | [ ] | D.2.3 |
| D.2.5 | Test end-to-end: Slack message -> Dashboard | infra-engineer | [ ] | D.2.4 |

### Epic D.3: Data Source Workflows (v2 - defer for MVP)
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| D.3.1 | Create Twitter retweets polling workflow (CRON) | infra-engineer | [ ] | A.3.2 |
| D.3.2 | Create YouTube watch later polling workflow | infra-engineer | [ ] | A.3.2 |
| D.3.3 | Create GitHub stars polling workflow | infra-engineer | [ ] | A.3.2 |
| D.3.4 | Add deduplication logic to all pollers | infra-engineer | [ ] | D.3.1-D.3.3 |
| D.3.5 | Create sync status dashboard in n8n | infra-engineer | [ ] | D.3.4 |

### Epic D.4: Monitoring & Observability
| ID | Task | Owner | Status | Depends On |
|----|------|-------|--------|------------|
| D.4.1 | Set up error tracking (Sentry or similar) | infra-engineer | [ ] | D.1.1 |
| D.4.2 | Create health check endpoint | infra-engineer | [ ] | - |
| D.4.3 | Set up uptime monitoring | infra-engineer | [ ] | D.1.1 |
| D.4.4 | Configure Supabase usage alerts | infra-engineer | [ ] | 0.2.1 |

---

## n8n Workflow Architecture

Note: For MVP, n8n is optional. The primary flow is iOS Share → Next.js API → Claude → Supabase.
n8n becomes useful for data source polling in v2.

### Workflow 1: Slack Inbound (v2 - optional)

```
┌────────────────────────────────────────────────────────────────────────┐
│                     Slack -> LifeOS Inbound Workflow                   │
│                     (Secondary input method for desktop)               │
└────────────────────────────────────────────────────────────────────────┘

┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│  Slack    │────▶│  Parse    │────▶│  Claude   │────▶│ Supabase  │
│  Webhook  │     │  Content  │     │  Process  │     │  Insert   │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                       │                                    │
                       │                                    ▼
                       │                            ┌───────────┐
                       └──── If URL ───────────────▶│  Fetch    │
                                                    │ Metadata  │
                                                    └───────────┘

Trigger: Slack webhook POST to n8n
Content Types:
  - Text message: Extract and categorize
  - URL: Fetch metadata, extract title/description/thumbnail
  - Image/Screenshot: Send to Claude Vision for analysis
  - Tweet URL: Fetch tweet content via Twitter API
```

### Workflow 2: Twitter Retweets Poller

```
┌────────────────────────────────────────────────────────────────────────┐
│                    Twitter Retweets CRON Workflow                       │
└────────────────────────────────────────────────────────────────────────┘

┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│   CRON    │────▶│  Twitter  │────▶│   Check   │────▶│ Supabase  │
│ (15 min)  │     │   API     │     │   Dups    │     │  Insert   │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                       │                 │
                       │                 │ If new
                       ▼                 ▼
                 ┌───────────┐     ┌───────────┐
                 │   Get     │     │  Claude   │
                 │ Retweets  │     │ Categorize│
                 └───────────┘     └───────────┘

Schedule: Every 15 minutes
Source: GET /2/users/:id/liked_tweets (or retweets)
Default Category: "social"
```

### Workflow 3: YouTube Watch Later

```
┌────────────────────────────────────────────────────────────────────────┐
│                   YouTube Watch Later CRON Workflow                     │
└────────────────────────────────────────────────────────────────────────┘

┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│   CRON    │────▶│ YouTube   │────▶│   Check   │────▶│ Supabase  │
│ (1 hour)  │     │ Data API  │     │   Dups    │     │  Insert   │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                       │                 │
                       ▼                 ▼
                 ┌───────────┐     ┌───────────┐
                 │   Get     │     │   Add     │
                 │ Playlist  │     │ Thumbnail │
                 └───────────┘     └───────────┘

Schedule: Every 1 hour
Source: YouTube Data API v3 - Playlist Items
Default Category: "watch"
Note: Requires OAuth2 for private watch later playlist
```

### Workflow 4: GitHub Stars

```
┌────────────────────────────────────────────────────────────────────────┐
│                     GitHub Stars CRON Workflow                          │
└────────────────────────────────────────────────────────────────────────┘

┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│   CRON    │────▶│  GitHub   │────▶│   Check   │────▶│ Supabase  │
│ (6 hours) │     │   API     │     │   Dups    │     │  Insert   │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                       │                 │
                       ▼                 ▼
                 ┌───────────┐     ┌───────────┐
                 │  Get      │     │  Claude   │
                 │ Starred   │     │ Categorize│
                 └───────────┘     └───────────┘

Schedule: Every 6 hours
Source: GET /users/:username/starred
Default Category: "research"
```

---

## Supabase Schema

```sql
-- Items: Core content items from all sources
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'uncategorized',
  tags TEXT[] DEFAULT '{}',
  source_type TEXT NOT NULL, -- 'slack', 'voice', 'data_source', 'manual'
  source_id TEXT, -- Reference to data_source.id if applicable
  metadata JSONB DEFAULT '{}',
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Sources: Configuration for polled external sources
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'cron', 'webhook'
  icon TEXT,
  workflow_id TEXT, -- n8n workflow ID
  webhook_url TEXT, -- For webhook-type sources
  poll_interval TEXT, -- '15m', '1h', '6h', '1d'
  config JSONB DEFAULT '{}', -- API credentials, filters, etc.
  default_category TEXT NOT NULL DEFAULT 'uncategorized',
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync Logs: Track data source sync history
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID REFERENCES data_sources(id),
  status TEXT NOT NULL, -- 'success', 'error', 'partial'
  items_added INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- User Preferences: For AI learning system
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  preference_type TEXT NOT NULL, -- 'category_override', 'tag_pattern', etc.
  pattern TEXT NOT NULL, -- The pattern to match
  action TEXT NOT NULL, -- The action to take
  confidence FLOAT DEFAULT 0.5,
  times_applied INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard Layouts: For AG-UI runtime configuration
CREATE TABLE dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'Default',
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations: Chat history for AI interactions
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'awaiting_reply', 'resolved'
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push Subscriptions: For Web Push notifications
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL, -- { p256dh, auth }
  device_info JSONB, -- { userAgent, platform, etc. }
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_items_source_type ON items(source_type);
CREATE INDEX idx_items_is_completed ON items(is_completed);
CREATE INDEX idx_data_sources_is_active ON data_sources(is_active);
CREATE INDEX idx_sync_logs_data_source ON sync_logs(data_source_id);

-- Enable realtime for items and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

---

## Environment Variables

```bash
# .env.local template

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI API
OPENAI_API_KEY=sk-...

# Web Push (generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key

# Optional: External APIs (for v2 data sources)
# TWITTER_BEARER_TOKEN=
# GITHUB_TOKEN=
# YOUTUBE_API_KEY=
```

---

## MVP Definition

**MVP = Phase 0 + Track A (core) + Track B (core) + Track C (core) + Track D.1 + D.2**

### MVP Feature Set

**Mobile Capture (Primary):**
1. Share any content from iOS apps via Share Sheet → LifeOS
2. Agent analyzes content, categorizes with confidence
3. If unsure, agent sends push notification with clarifying question
4. User replies via notification or in-app chat
5. Agent saves item and confirms via push

**Web Consumption (Secondary):**
1. Beautiful dashboard with category sidebar
2. Cards with hover-pop glow effects
3. Filter by category
4. Click to view item details
5. Real-time updates (new items appear instantly)

**Core Loop:**
```
Share → Claude Analyzes → Confident? ─┬─ Yes → Save + Confirm
                                       │
                                       └─ No → Push Question → Reply → Save
```

**Deferred for v2:**
- Data source pollers (Twitter, YouTube, GitHub)
- Voice input in dashboard
- AI learning from corrections
- AG-UI natural language layout configuration
- Settings page
- Slack integration (mobile share is primary now)
- Full search/command palette

---

## Workstream Assignment for Parallel Development

After Phase 0 is complete, assign agents to tracks:

| Track | Agent | Branch | Focus |
|-------|-------|--------|-------|
| A | backend-architect | `feat/backend-core` | Database, API routes, webhooks |
| B | frontend-architect | `feat/frontend-core` | Data hooks, UI components, polish |
| C | ai-engineer | `feat/ai-processing` | Claude integration, processing pipeline |
| D | infra-engineer | `feat/infra-setup` | Deployment, n8n workflows, monitoring |

---

## Next Steps

1. **Phase 0 blocker**: Create GitHub repo, Supabase project, and environment template
2. **Kickoff parallel tracks**: After Phase 0, all 4 tracks can start simultaneously
3. **Integration point**: After Track A.2 and B.1 are done, frontend can use real data
4. **MVP milestone**: After D.2.5 (end-to-end Slack test), MVP is complete
