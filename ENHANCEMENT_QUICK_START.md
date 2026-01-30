# LifeOS Enhancement Plan - Quick Start Guide

**TL;DR:** 8 parallelizable tasks, 2-3 days, 6 start immediately, 2 wait for Phase 1.

---

## Start Immediately (Day 1)

### 🚀 Ready Now (6 tasks, no dependencies)

```
TASK-601: Delete fix                      1-2h   → feat/task-601-delete-revert
TASK-701: Card editing                    2-3h   → feat/task-701-card-editing
TASK-801: Nova insights (real data)       2h     → feat/task-801-nova-insights-realdata
TASK-802: Voice Q&A                       2-3h   → feat/task-802-voice-qa
TASK-901: Coming soon pages               1h     → feat/task-901-coming-soon-pages
TASK-602: Whisper transcription           2-3h   → feat/task-602-whisper-transcription
```

### ⏳ Wait for TASK-602 ~80% done

```
TASK-603: Image processing fix            1-2h   → feat/task-603-image-processing-fix
```

### ⏸ Wait for Phase 1 complete

```
TASK-702: ADK Orchestrator (complex!)     4-6h   → feat/task-702-adk-orchestrator
```

---

## The 8 Tasks in 30 Seconds

| # | Name | What | Why | When |
|---|------|------|-----|------|
| 601 | Delete Revert | Fix delete bug (item reappears) | Breaks user trust | Now |
| 602 | Whisper | Add audio transcription | Enable audio messages | Now |
| 603 | Image Fix | Debug image processing | Enable image analysis | After 602 |
| 701 | Edit Cards | Make items editable | Users want to refine | Now |
| 702 | Orchestrator | 3-agent pipeline | Foundation for agents | After 602+603 |
| 801 | Insights | Real data widget | Replace mock data | Now |
| 802 | Voice Q&A | Ask Nova questions | Smart search | Now |
| 901 | Placeholders | Missing route pages | Navigation complete | Now |

---

## Parallel Team Assignment

### Option 1: 5 Team Members
```
Day 1:
  Instance A: 601 → 701
  Instance B: 602 → wait for 603 → start 702
  Instance C: 901 → 603
  Instance D: 801
  Instance E: 802

Result: All Phase 1-3 done Day 1, Phase 2 TASK-702 Day 2
```

### Option 2: 3 Team Members
```
Day 1:
  Instance A: 601, 701, 901
  Instance B: 602, 603, 801
  Instance C: 802

Day 2:
  Instance A or B: 702

Result: Same timeline, fewer parallel tracks
```

### Option 3: 1 Sequential (slow)
```
Day 1: 601 → 602 → 901 → 801 → 802
Day 2: 603 → 701
Day 3: 702
```

---

## Branch Names (Copy-Paste)

```bash
git checkout -b feat/task-601-delete-revert
git checkout -b feat/task-602-whisper-transcription
git checkout -b feat/task-603-image-processing-fix
git checkout -b feat/task-701-card-editing
git checkout -b feat/task-702-adk-orchestrator
git checkout -b feat/task-801-nova-insights-realdata
git checkout -b feat/task-802-voice-qa
git checkout -b feat/task-901-coming-soon-pages
```

---

## Verification Checklist (Copy-Paste)

### ✅ TASK-601: Delete Fix
- [ ] Create item → Delete → Simulate network error → Item reverts
- [ ] Error toast shows
- [ ] Auth token in DELETE request

### ✅ TASK-602: Whisper
- [ ] Send voice message → Transcription appears in item
- [ ] Supports multiple audio formats
- [ ] Langfuse trace recorded

### ✅ TASK-603: Image Fix
- [ ] Send image → Vision analysis in enrichment
- [ ] Works with JPEG, PNG, WebP
- [ ] Failed analysis doesn't block item

### ✅ TASK-701: Edit Cards
- [ ] Click Edit → Form appears
- [ ] Change title/tags → Save → Persists
- [ ] Cancel reverts changes
- [ ] Error handling works

### ✅ TASK-702: Orchestrator
- [ ] Send content → 3-agent pipeline runs
- [ ] Langfuse shows: InputAnalyzer → ActionDecider → ActionExecutor
- [ ] Feature flag `USE_ADK_ORCHESTRATOR=false` disables it
- [ ] Old pipeline still works as fallback

### ✅ TASK-801: Insights
- [ ] Widget loads real data from `nova_activity` table
- [ ] Shows last 24h activity
- [ ] Loading skeleton while fetching
- [ ] Error message if fetch fails

### ✅ TASK-802: Voice Q&A
- [ ] Say "what restaurants?" → Get semantic search results
- [ ] Shows relevant items + Nova answer
- [ ] Non-questions still filter (existing behavior)

### ✅ TASK-901: Placeholders
- [ ] /notes → Coming Soon
- [ ] /timeline → Coming Soon
- [ ] /analytics → Coming Soon
- [ ] /collections → Coming Soon
- [ ] /settings → Coming Soon
- [ ] /notifications → Coming Soon

---

## Key Files to Modify

### TASK-601: Delete
- `src/components/feed/items-feed.tsx` - Error handling
- `src/hooks/use-items.ts` - Add revertRemove()

### TASK-602: Whisper
- `lib/services/ai/audio/transcription.ts` (NEW)
- `lib/services/jobs/functions.ts` - Call transcription

### TASK-603: Image
- `lib/services/jobs/functions.ts` - Add logging

### TASK-701: Edit
- `src/components/feed/item-edit-form.tsx` (NEW)
- `src/components/feed/item-detail-modal.tsx` - Edit toggle
- `src/hooks/use-items.ts` - updateItem()

### TASK-702: Orchestrator
- `lib/services/ai/agents/` (14+ NEW files)
- `lib/services/jobs/functions.ts` - Feature flag

### TASK-801: Insights
- `src/app/api/nova/activity/route.ts` - Query real data
- `src/components/layout/widgets-container.tsx` - Fetch on mount

### TASK-802: Voice
- `lib/services/ai/voice/question-answering.ts` (NEW)
- `lib/services/ai/voice/filter-intent.ts` - Detection

### TASK-901: Pages
- `src/components/ui/coming-soon.tsx` (NEW)
- `src/app/{notes,timeline,analytics,collections,settings,notifications}/page.tsx` (NEW)

---

## PR Template

```markdown
# [Enhancement] TASK-XXX: Brief Title

## Task
TASK-XXX: [Full task name]

## Changes
- [What was changed]
- [New components/functions]
- [Files modified]

## How to Test
1. [Step 1]
2. [Step 2]
3. [Verify result]

## Dependencies
- [ ] Ready to merge
- [ ] (If blocking: Depends on TASK-YYY)

## Checklist
- [ ] Code works locally
- [ ] No console errors
- [ ] Acceptance criteria met
- [ ] Langfuse traces added (if applicable)
```

---

## Merge Order (Important!)

### Wave 1: Independent (merge anytime)
```
✅ TASK-601 → PR → Merge
✅ TASK-901 → PR → Merge
✅ TASK-801 → PR → Merge
✅ TASK-802 → PR → Merge
✅ TASK-701 → PR → Merge
```

### Wave 2: After 602 merged
```
✅ TASK-602 → PR → Merge
⏳ TASK-603 → PR (wait for 602) → Merge
```

### Wave 3: After all Phase 1
```
✅ TASK-702 → PR (after 602+603) → Merge
```

---

## Environment Variables

### Already Set
```
✓ OPENAI_API_KEY
✓ Supabase connection
✓ Langfuse integration
```

### Add/Verify for Enhancements
```
# TASK-602 (Whisper already uses OPENAI_API_KEY)
# No new env vars needed

# TASK-702 (Orchestrator)
USE_ADK_ORCHESTRATOR=false  # Default (safe)

# TASK-702 (Web search)
TAVILY_API_KEY=...  # Already have? If not, add

# TASK-801 (Nova insights)
# No new env vars needed

# TASK-802 (Voice Q&A)
# No new env vars needed
```

---

## Common Issues & Fixes

### "TASK-602 times out on Whisper API"
```
✓ Add timeout: 30 seconds
✓ Retry with exponential backoff
✓ Fallback: "Audio analysis unavailable"
```

### "TASK-703 conflicts with existing job function"
```
✓ Use feature flag to disable
✓ TEST: USE_ADK_ORCHESTRATOR=false → old pipeline works
```

### "TASK-801 widget shows stale data"
```
✓ Add cache invalidation on nova_activity insert
✓ Or: Poll every 5 seconds
✓ Or: Use Realtime subscription (already enabled)
```

### "TASK-802 semantic search returns wrong items"
```
✓ Verify embeddings table populated
✓ Check similarity threshold (0.7)
✓ Improve query: "restaurants I saved" vs just "restaurants"
```

---

## Git Workflow

```bash
# Start a task
git checkout develop
git pull
git checkout -b feat/task-XXX-description

# During development
git add .
git commit -m "feat(task-601): add delete error handling"
git push origin feat/task-XXX-description

# Create PR
# (on GitHub)

# After review → merge to develop
# Don't delete branch yet (keep for history)

# Back to develop for next task
git checkout develop
git pull
git checkout -b feat/task-YYY-next-task
```

---

## Success Timeline

| Time | What | Result |
|------|------|--------|
| **Day 1 Start** | All 6 independent tasks start | 80% progress by end of day |
| **Day 1 Evening** | Wave 1 merges (601, 901, 801, 802, 701) | 5 features live on develop |
| **Day 1-2** | TASK-602, 603 merge (foundation ready) | Audio/image processing working |
| **Day 2-3** | TASK-702 (orchestrator) merges | Multi-agent pipeline ready |
| **Day 3** | Final testing, docs, celebrate | ✅ MVP+ ready |

---

## Quick Answers

**Q: Can I start now?** Yes, pick any task except 603 and 702.

**Q: What's the hardest task?** TASK-702 (orchestrator) - 4-6 hours, 3-agent architecture.

**Q: What's the quickest task?** TASK-901 (pages) - 1 hour, just 7 simple files.

**Q: Will my branch break main?** No! Each task is isolated. Use feature flags for 702.

**Q: How do I know when I'm done?** Check the verification checklist above.

**Q: What if I find a bug?** Document it, ask in standup, fix as follow-up.

**Q: Should I merge my branch?** Yes, after review. Merge in the order specified above.

**Q: Can I work on multiple tasks?** Yes! But keep branches separate. Don't mix tasks.

**Q: What if I finish early?** Pick another task from the "Ready Now" list.

---

## Resources

### Full Documentation
- `TASKS.md` - Complete task list with acceptance criteria
- `ENHANCEMENT_PARALLELIZATION.md` - Detailed scheduling
- `ENHANCEMENT_FILE_MANIFEST.md` - Exact files to change
- `ENHANCEMENT_SUMMARY.md` - Executive overview

### Code References
- `/Users/marcjabbour/.claude/plans/fluttering-sprouting-snowflake.md` - Original plan
- `lib/services/jobs/functions.ts` - Where jobs run
- `src/components/feed/items-feed.tsx` - Main feed component
- `lib/services/ai/` - AI services (templates for new code)

### Key Branches
- `develop` - Main development branch
- `feat/task-XXX-*` - Your task branch
- Feature flag: `USE_ADK_ORCHESTRATOR` (TASK-702)

---

## Need Help?

1. **Clarify requirements?** → Read `ENHANCEMENT_SUMMARY.md`
2. **Know exact files?** → Read `ENHANCEMENT_FILE_MANIFEST.md`
3. **Schedule/timeline?** → Read `ENHANCEMENT_PARALLELIZATION.md`
4. **Task details?** → Read `TASKS.md` (search for TASK-XXX)
5. **Original plan?** → Read `/Users/marcjabbour/.claude/plans/fluttering-sprouting-snowflake.md`

---

**Status: Ready for Execution**
**Total Effort: 15-22 hours (2-3 days with 3-5 parallel instances)**
**Critical Path: TASK-602 → TASK-603 → TASK-702**
**Start: Now (6 tasks ready immediately)**

🚀 Let's go!
