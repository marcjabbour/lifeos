# LifeOS Enhancement Plan - Parallelization Strategy

## Overview

The LifeOS Enhancement Plan consists of 8 tasks organized into 4 phases. This document details how to parallelize them for concurrent execution by multiple Claude instances with separate feature branches.

**Total Tasks:** 8
**Estimated Duration:** 4-5 days (fully parallelized), 2 days (critical path)

---

## Quick Reference: Task Dependencies

```
TASK-601 (Delete fix)    ─────┐
                               ├─→ No deps
TASK-602 (Whisper)      ──────┤
                               │
TASK-603 (Image fix)    ──────┘     (depends on 602)
        │
        └──→ TASK-702 (Orchestrator) ──→ (depends on 602, 603)

TASK-701 (Card edit)    ──────→ No deps (independent)

TASK-801 (Insights)     ──────→ No deps (independent)

TASK-802 (Voice Q&A)    ──────→ No deps (independent)

TASK-901 (Placeholders) ──────→ No deps (independent)
```

---

## Recommended Parallelization Schedule

### Immediate Start (Day 1)

All three Phase 1 bug fix tasks can start immediately in parallel:

| Task | Instance | Duration | Branch | Status |
|------|----------|----------|--------|--------|
| TASK-601 | Claude A | 1-2 hrs | `feat/task-601-delete-revert` | Ready |
| TASK-602 | Claude B | 2-3 hrs | `feat/task-602-whisper-transcription` | Ready |
| TASK-901 | Claude C | 1 hr | `feat/task-901-coming-soon-pages` | Ready |

### Conditional Start (After Task-602 ~80% complete)

Once audio transcription is mostly done:

| Task | Instance | Duration | Branch | Depends On |
|------|----------|----------|--------|------------|
| TASK-603 | Claude C | 1-2 hrs | `feat/task-603-image-processing-fix` | TASK-602 ~80% |

### Day 1-2 Parallel Execution

While Phase 1 tasks are completing:

| Task | Instance | Duration | Branch | Status |
|------|----------|----------|--------|--------|
| TASK-701 | Claude A | 2-3 hrs | `feat/task-701-card-editing` | Ready (independent) |
| TASK-801 | Claude D | 2 hrs | `feat/task-801-nova-insights-realdata` | Ready (independent) |
| TASK-802 | Claude E | 2-3 hrs | `feat/task-802-voice-qa` | Ready (independent) |

### Day 2-3 (After Phase 1 Complete)

Once Phase 1 bug fixes are merged:

| Task | Instance | Duration | Branch | Depends On |
|------|----------|----------|--------|------------|
| TASK-702 | Claude B | 4-6 hrs | `feat/task-702-adk-orchestrator` | TASK-602, TASK-603 complete |

---

## Phase-by-Phase Breakdown

### Phase 1: Bug Fixes (Critical) - Day 1

**Status:** Not Started
**Total Effort:** 4-7 hours
**Parallelizable:** 100% (all 3 tasks independent, can start simultaneously)

#### TASK-601: Fix Delete Items Functionality
- **Branch:** `feat/task-601-delete-revert`
- **Duration:** 1-2 hours
- **Effort:** Small
- **Dependencies:** None
- **Assigned to:** Claude Instance A

**Quick Summary:**
- Add `revertRemove()` to `useItems` hook
- Catch API errors in delete handler
- Show error toast on failure
- **Files:** items-feed.tsx, use-items.ts

**Why it's quick:** Delete error handling is straightforward - just need error catch and rollback logic.

---

#### TASK-602: Add Audio Transcription with Whisper API
- **Branch:** `feat/task-602-whisper-transcription`
- **Duration:** 2-3 hours
- **Effort:** Small
- **Dependencies:** None
- **Assigned to:** Claude Instance B

**Quick Summary:**
- Create `lib/services/ai/audio/transcription.ts`
- Implement `transcribeAudio()` using OpenAI Whisper API
- Update Inngest job to call transcribeAudio for audio content
- **Files:** transcription.ts (new), functions.ts (modify)

**Why it's second priority:** Foundation for TASK-603 and TASK-702, but standalone.

---

#### TASK-603: Fix Image Processing Flow
- **Branch:** `feat/task-603-image-processing-fix`
- **Duration:** 1-2 hours
- **Effort:** Small
- **Dependencies:** TASK-602 (should start after 602 ~80% complete)
- **Assigned to:** Claude Instance C (after Instance B finishes 602)

**Quick Summary:**
- Debug image handling in `processContentJob`
- Add logging to trace flow
- Verify GPT-4o Vision is called and results stored
- **Files:** functions.ts (debug), possibly vision service

**Why it depends on 602:** Different content types processed in same job, good to see audio working first as reference.

---

### Phase 2: Core Features - Days 1-3

**Status:** Not Started
**Total Effort:** 6-9 hours
**Parallelizable:** 50% (TASK-701 independent, TASK-702 depends on Phase 1)

#### TASK-701: Make Cards Editable
- **Branch:** `feat/task-701-card-editing`
- **Duration:** 2-3 hours
- **Effort:** Medium
- **Dependencies:** None
- **Assigned to:** Claude Instance A (after TASK-601 complete, or in parallel if A starts this)

**Quick Summary:**
- Create `item-edit-form.tsx` component
- Add edit mode toggle to ItemDetailModal
- Wire form to PATCH /api/items/:id
- Add optimistic update to useItems
- **Files:** item-detail-modal.tsx, item-edit-form.tsx (new), use-items.ts

**Why it's independent:** Backend already has PATCH endpoint, just UI work.

---

#### TASK-702: Google ADK Orchestrator Architecture
- **Branch:** `feat/task-702-adk-orchestrator`
- **Duration:** 4-6 hours
- **Effort:** Large (most complex task)
- **Dependencies:** TASK-602 AND TASK-603 (both must be complete)
- **Assigned to:** Claude Instance B or C (whoever finishes Phase 1 first)

**Quick Summary:**
- Create 3-agent pipeline: InputAnalyzer → ActionDecider → ActionExecutor
- Each agent has tools: vision, transcription, web-fetch, web-search, etc.
- Create `orchestratedProcessingJob` Inngest function
- Add `USE_ADK_ORCHESTRATOR` feature flag
- **Files:** 14+ new files in `lib/services/ai/agents/`

**Why it's blocking future work:** This is foundational for advanced agent architecture. Builds on audio/image fixes.

---

### Phase 3: Nova Intelligence - Days 1-2

**Status:** Not Started
**Total Effort:** 4-5 hours
**Parallelizable:** 100% (both tasks independent)

#### TASK-801: Fix Nova's Insights with Real Data
- **Branch:** `feat/task-801-nova-insights-realdata`
- **Duration:** 2 hours
- **Effort:** Small-Medium
- **Dependencies:** None
- **Assigned to:** Claude Instance D

**Quick Summary:**
- Query `nova_activity` table in API route
- Update widgets to fetch real data instead of mock
- Add loading states and error handling
- **Files:** route.ts, widgets-container.tsx, nova-activity-modal.tsx

**Why it's quick:** Table already exists, just need to query and display it.

---

#### TASK-802: Enhanced Voice Agent with Q&A
- **Branch:** `feat/task-802-voice-qa`
- **Duration:** 2-3 hours
- **Effort:** Small-Medium
- **Dependencies:** None
- **Assigned to:** Claude Instance E

**Quick Summary:**
- Create `question-answering.ts` service
- Detect questions vs. filter commands
- Generate embedding, search items, generate answer
- Update filter-intent.ts and items-feed.tsx
- **Files:** question-answering.ts (new), filter-intent.ts, items-feed.tsx

**Why it's independent:** Uses existing embeddings and Nova capabilities, just new combination.

---

### Phase 4: Navigation & Placeholders - Day 1

**Status:** Not Started
**Total Effort:** 1 hour
**Parallelizable:** 100% (all pages independent)

#### TASK-901: Create Coming Soon Placeholder Pages
- **Branch:** `feat/task-901-coming-soon-pages`
- **Duration:** 1 hour
- **Effort:** Small
- **Dependencies:** None
- **Assigned to:** Claude Instance C (after TASK-603, or in parallel)

**Quick Summary:**
- Create `coming-soon.tsx` component
- Create 6 placeholder pages (/notes, /timeline, /analytics, /collections, /settings, /notifications)
- Each page uses ComingSoon component with appropriate feature name
- **Files:** coming-soon.tsx (new), 6 page files (new)

**Why it's quick:** Simple, repetitive work. Can be done quickly with reusable component.

---

## Optimal Parallel Execution Plan

### Start (Day 1, Morning)

**Parallel Track 1 (Frontend & Bug Fixes):**
```
Claude A: Start TASK-601 (delete fix)
          ↓ (1-2 hours)
          Switch to TASK-701 (card edit) OR wait for Phase 1 complete
```

**Parallel Track 2 (AI/Audio Foundation):**
```
Claude B: Start TASK-602 (Whisper)
          ↓ (2-3 hours)
          Merge/ready, waits for TASK-603

Claude C: Start TASK-901 (placeholders) - quick win
          ↓ (1 hour)
          Then start TASK-603 (image fix) when TASK-602 ~80%
```

**Parallel Track 3 (Nova Intelligence):**
```
Claude D: Start TASK-801 (insights real data)
          ↓ (2 hours)
          Merge/ready

Claude E: Start TASK-802 (voice Q&A)
          ↓ (2-3 hours)
          Merge/ready
```

### Middle (Day 1-2)

**After TASK-602 ~80%:**
- Claude C: Start TASK-603 (image fix)

**If all Phase 1 tasks complete:**
- Claude A: Continue TASK-701 if not started, or start TASK-702 prep

### End (Day 2-3)

**After ALL Phase 1 tasks merged:**
- Claude B or whoever available: Start TASK-702 (orchestrator)
  - This is the largest task (4-6 hours)
  - Most complex due to 3-agent architecture

---

## Merge & Integration Order

### Day 1 Evening
1. TASK-601 → PR → Merge (delete fix, low risk)
2. TASK-602 → PR → Merge (Whisper, foundation for 603)
3. TASK-901 → PR → Merge (placeholders, no risk)
4. TASK-801 → PR → Merge (insights, low risk)
5. TASK-802 → PR → Merge (voice, low risk)

### Day 1-2
6. TASK-603 → PR (requires 602 merged) → Merge (image fix)

### Day 2-3
7. TASK-701 → PR (independent) → Merge (card edit)

### Day 3
8. TASK-702 → PR (requires 602+603) → Merge (orchestrator)

---

## GitHub Workflow

### PR Title Format
```
[Enhancement] TASK-XXX: Brief description

Examples:
[Enhancement] TASK-601: Fix delete items with revert capability
[Enhancement] TASK-702: Add Google ADK orchestrator pipeline
```

### PR Body Template
```markdown
## Task
TASK-XXX: [Task Name]

## Branch
feat/task-XXX-description

## Changes
- [Brief list of changes]

## Testing
- [How to verify]

## Dependencies
- [ ] TASK-YYY (if any)
- [ ] Ready to merge

## Closes
(Leave empty if not closing an issue)
```

---

## Verification Checklist

Before marking task complete, verify:

### TASK-601
- [ ] Delete item, network error occurs
- [ ] Item reverts to list
- [ ] Error toast shows
- [ ] Database is_archived field correct

### TASK-602
- [ ] Send audio via WhatsApp
- [ ] Transcription appears in item content
- [ ] Duration and language metadata captured
- [ ] Langfuse shows transcription call

### TASK-603
- [ ] Send image via WhatsApp
- [ ] Vision analysis appears in enrichment
- [ ] Works with JPEG, PNG, WebP
- [ ] Error handling doesn't block item creation

### TASK-701
- [ ] Open item → Click Edit
- [ ] Edit title/tags → Save
- [ ] Changes persist in DB
- [ ] Error shows if save fails
- [ ] Cancel reverts changes

### TASK-702
- [ ] Send content through orchestrator
- [ ] Langfuse shows 3-agent pipeline
- [ ] Each agent receives correct context
- [ ] Results match or improve on previous method
- [ ] Feature flag `USE_ADK_ORCHESTRATOR=false` falls back correctly

### TASK-801
- [ ] Widget fetches real data from API
- [ ] Shows recent Nova activity
- [ ] Loading skeleton displays
- [ ] Error handling works
- [ ] Timestamps format correctly

### TASK-802
- [ ] Voice input "what restaurants did I save?"
- [ ] Returns relevant items via semantic search
- [ ] Nova generates natural language answer
- [ ] QueryResultModal displays results

### TASK-901
- [ ] Navigate to /notes, /timeline, /analytics, /collections, /settings, /notifications
- [ ] All pages show ComingSoon component
- [ ] Feature names are specific (not generic)
- [ ] Responsive on mobile and desktop

---

## Time Budget Summary

| Phase | Task | Estimate | Best Case | Worst Case |
|-------|------|----------|-----------|------------|
| 1 | TASK-601 | 1-2h | 1h | 2h |
| 1 | TASK-602 | 2-3h | 2h | 3h |
| 1 | TASK-603 | 1-2h | 1h | 2h |
| 2 | TASK-701 | 2-3h | 2h | 3h |
| 2 | TASK-702 | 4-6h | 4h | 6h |
| 3 | TASK-801 | 2h | 1.5h | 2.5h |
| 3 | TASK-802 | 2-3h | 2h | 3h |
| 4 | TASK-901 | 1h | 0.5h | 1h |
| | **TOTAL** | **15-21h** | **13.5h** | **22h** |

**Parallelized Timeline:** 2-3 days (working in parallel)
**Critical Path:** Phase 1 → Phase 2 TASK-702
**All Other Tasks:** Can proceed in parallel with Phase 1

---

## Phase Dependencies Diagram

```
Phase 1: Bug Fixes (Day 1)
├─ TASK-601 (Delete) - 1-2h ─┐
├─ TASK-602 (Whisper) - 2-3h ├─→ Phase 2 TASK-702 (Orchestrator)
├─ TASK-603 (Image) - 1-2h   ├─→ and Phase 4 (complete Phase 1)
└─ TASK-901 (Pages) - 1h     │

Phase 2A: Card Edit (Day 1-2)
└─ TASK-701 (Edit) - 2-3h ─→ Ready immediately

Phase 2B: Orchestrator (Day 2-3)
└─ TASK-702 (Orchestrator) - 4-6h ─→ Depends on Phase 1

Phase 3: Nova Intelligence (Day 1-2) - PARALLEL
├─ TASK-801 (Insights) - 2h ─→ Ready immediately
└─ TASK-802 (Voice) - 2-3h ─→ Ready immediately
```

---

## Notes

- **Feature flags matter:** TASK-702 needs `USE_ADK_ORCHESTRATOR` to avoid breaking existing code
- **Backend ready:** PATCH /api/items/:id already exists for TASK-701
- **Start fast:** TASK-601, TASK-901, TASK-801, TASK-802 have zero dependencies
- **Don't wait:** Phases 3 and 4 can start while Phase 1 is in progress
- **Orchestrator is the long pole:** TASK-702 is 4-6 hours, everything else is 1-3 hours
- **Quality matters:** Audio/image fixes (Phase 1) must be solid before orchestrator (Phase 2)
- **Test thoroughly:** Each task has clear verification checklist
