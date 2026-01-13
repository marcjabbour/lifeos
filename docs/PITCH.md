# LifeOS: Your AI-Powered Life Dashboard

## The Problem

Your digital life is scattered across a dozen apps. That interesting article you saved? Somewhere in Safari Reading List. The podcast episode someone recommended? Lost in a Twitter DM. The YouTube video to watch later? Buried in a playlist you never open.

**Content enters your life from everywhere:**
- Social media (Twitter/X, Reddit, LinkedIn)
- Messaging apps (iMessage, WhatsApp, Slack)
- Browsers (articles, documentation, tools)
- Media apps (YouTube, Spotify, podcasts)
- Screenshots and images

**And it stays scattered.** Each app has its own "save for later" feature, but none of them talk to each other. Finding that thing you saved last week becomes a scavenger hunt across your phone.

The result: **Digital clutter leads to cognitive clutter.** Important content slips through the cracks, and you spend mental energy just trying to remember where you put things.

---

## The Solution: LifeOS + Nova

**LifeOS is a two-component system powered by Nova, your personal AI assistant.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 LifeOS                                       │
├─────────────────────────────────┬───────────────────────────────────────────┤
│      📱 MOBILE (Gatherer)       │         💻 WEB (Dashboard Hub)            │
│                                 │                                            │
│  • iOS Share Sheet capture      │  • Infinite scroll "Featured" feed        │
│  • Quick voice input via Siri   │  • Deep organization & browsing           │
│  • Push notification replies    │  • Full conversations with Nova           │
│  • On-the-go interactions       │  • AG-UI dynamic layout control           │
│                                 │  • Reports, research, insights            │
└─────────────────────────────────┴───────────────────────────────────────────┘
                                  │
                          ┌───────▼───────┐
                          │     NOVA      │
                          │  Your AI      │
                          │  Assistant    │
                          └───────────────┘
```

### Meet Nova

Nova isn't a categorization engine with predefined buckets. Nova is a **reasoning agent** that figures out what to do with anything you throw at it.

**The magic: Nova thinks, not matches.**

> You share a research paper link.
>
> Nova thinks: "This looks like an academic paper. Given what I know about this user, they probably want more than just a bookmark. Let me plan what would be useful..."
>
> Nova: "I see you've shared a research paper. Want me to dig into this? I could summarize the key ideas, find who's talking about it online, or just save it for later."
>
> You: "Yeah, dig into it."
>
> *Nova plans and executes—searches the web, reads the paper, finds discussions, synthesizes insights. The output isn't a fixed template; it's whatever Nova decides is most valuable for THIS paper.*
>
> Later:
> Nova: "That paper you shared? I put together some notes. The core idea is [X], there's interesting debate on Twitter about [Y], and I found a company actually implementing this. Take a look when you have a minute."

**Nova is general-purpose:**

Share a song? Nova figures out it's music and handles it appropriately.
Share a screenshot of a recipe? Nova extracts the recipe.
Share something Nova's never seen before? Nova reasons about it and asks if needed.

There are no predefined "job types" or "content categories" hardcoded into the system. Nova decides dynamically based on:
- What the content actually is
- What you might want from it
- What tools and actions make sense
- How to structure useful output

**Nova learns through conversation, not configuration:**

```
                    Traditional "Smart" Apps

    Input ──────▶  [Lookup Table]  ──────▶  Predefined Action
                   "research_paper"          "run_paper_analysis_v2"


                    Nova's Approach

    Input ──────▶  [Reasoning]  ──────▶  Dynamic Plan ──────▶  Execution
                   "What is this?         "I'll do X,           Whatever
                    What makes sense?      then Y,              format fits
                    What would help?"      then Z"              the task
```

---

## How It Works

**Mobile (Gathering):**
1. **Share anything from any app** using the iOS Share Sheet
2. **Nova reasons about it** and decides what to do
3. **If confident**, Nova acts and confirms via push notification
4. **If unsure**, Nova asks a natural question (not a category picker)
5. **Nova works in the background** if there's useful work to do

**Web (Dashboard):**
1. **Scroll your "Featured" feed**—everything you've sent to LifeOS
2. **Discover Nova's work**—insights, summaries, research mixed into your feed
3. **Chat with Nova** for deeper interactions
4. **Control the dashboard with natural language**

---

## Key Differentiators

### 1. Emergent Intelligence, Not Rigid Categories

Most "AI-powered" apps are really just classifiers with fancy UIs. They map inputs to predefined buckets and run templated workflows.

Nova is different:
- **No predefined job types**: Nova plans what to do based on the content
- **No rigid output schemas**: Output structure emerges from what's useful
- **No category enums**: Nova describes things naturally, not from a dropdown
- **Continuous reasoning**: Nova gets smarter through conversation, not configuration

### 2. Async Background Work

Share something, forget about it. Nova works asynchronously:
- Plans what would be useful
- Executes using available tools (web search, summarization, etc.)
- Delivers results when ready
- Notifies based on your preferences

### 3. Native iOS Integration

- **Share Sheet**: Two taps from any app to Nova
- **Siri Shortcuts**: Voice capture on the go
- **Push conversations**: Reply without opening the app

### 4. Conversational, Not Transactional

Nova doesn't just process and file. Nova converses:
- Asks clarifying questions naturally
- Provides context about what it did
- Remembers past interactions
- Gets better over time

---

## MVP Scope

### What's In (v1)
- Nova AI with reasoning-first architecture
- iOS Share Sheet integration
- Dynamic content analysis (no predefined types)
- Push notification conversations
- In-app chat with Nova
- "Featured" feed dashboard
- Mobile-first responsive design
- Real-time updates via Supabase

### What's In (v1.5 - Async Work)
- Background job system with dynamic planning
- Nova-generated insights and summaries
- Web search integration
- Flexible output formats

### What's Deferred (v2+)
- AG-UI dynamic layout control
- MCP-powered integrations (Twitter, GitHub, etc.)
- Siri voice input
- Theme customization via Nova

---

## Success Criteria

### Launch Ready (MVP)
1. Share any content -> Nova handles it intelligently within 10 seconds
2. Nova asks good questions when unsure (not category pickers)
3. Dashboard shows content with Nova's natural descriptions
4. PWA installs correctly on iOS 17+

### Week 1 Metrics
- Items captured feel effortless
- Nova's questions make sense (not robotic)
- Users trust Nova's decisions

### Month 1 Goals
- Nova noticeably improves at handling your content
- Dashboard becomes the "where did I save that?" destination
- Background work delivers genuine value

---

## Tech Stack Summary

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | Next.js 15 + React 19 | PWA support, excellent mobile perf |
| Styling | Tailwind + Framer Motion | Rapid iteration, smooth animations |
| Backend | Next.js API Routes | Serverless, scales to zero |
| Database | Supabase (Postgres) | Realtime, flexible JSONB storage |
| AI | Claude API | Best reasoning capabilities |
| Hosting | Vercel | Zero-config deployment |
| Push | Web Push API | Native feel, no app store |

---

## One-Liner

**LifeOS: Nova reasons about anything you share, works in the background, and surfaces insights—no rigid categories, no configuration, just intelligence.**
