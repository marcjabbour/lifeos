# LifeOS Enhancement Tasks - File Manifest

Complete reference for all files that need to be created or modified for each enhancement task.

---

## TASK-601: Fix Delete Items Functionality

### Files to Modify

#### `src/components/feed/items-feed.tsx`
**Changes:**
- Add try-catch error handling around DELETE API call in `handleDeleteConfirm()`
- On catch, call `revertRemove(itemId, itemSnapshot)`
- Show error toast with failure message
- Verify auth token is in request headers

```typescript
// Pseudocode
const handleDeleteConfirm = async () => {
  const itemSnapshot = itemToDelete;
  removeItem(itemSnapshot.id); // Optimistic remove
  try {
    const res = await fetch(`/api/items/${itemSnapshot.id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` } // Ensure auth
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  } catch (error) {
    revertRemove(itemSnapshot.id, itemSnapshot);
    toast.error("Failed to delete item. Try again.");
  }
  closeModal();
};
```

#### `src/hooks/use-items.ts`
**Changes:**
- Add `revertRemove(itemId, item)` function to items state
- Function restores item to correct position in list (typically at original position or top)
- Maintain order consistency

```typescript
// Pseudocode
const revertRemove = (itemId: string, item: Item) => {
  // Re-insert item at correct position
  // Could use binary search if list is sorted by date
  // Or just insert at top since it was recently accessed
  setItems(prev => [item, ...prev.filter(i => i.id !== itemId)]);
};
```

### Files to Create
None - only modifications

### Summary
- **Files touched:** 2
- **Lines changed:** ~20-30
- **Risk level:** Low (error handling, reversible operation)

---

## TASK-602: Add Audio Transcription with Whisper API

### Files to Create

#### `lib/services/ai/audio/transcription.ts` (NEW)
**Purpose:** Whisper API integration for audio transcription

```typescript
/**
 * Transcribe audio using OpenAI Whisper API
 * @param audioUrl - URL to audio file (must be publicly accessible)
 * @returns {transcript, duration, language}
 */
export async function transcribeAudio(audioUrl: string): Promise<{
  transcript: string;
  duration?: number;
  language?: string;
}> {
  // 1. Fetch audio from URL
  // 2. Convert to File object
  // 3. Call openai.audio.transcriptions.create()
  // 4. Return results
  // 5. Error handling with retry
}

/**
 * Batch transcribe multiple audio files
 */
export async function batchTranscribeAudio(
  audioUrls: string[]
): Promise<Array<{ url: string; transcript: string }>> {
  // Process multiple in parallel with rate limiting
}
```

**Required imports:**
- `OpenAI` from openai SDK
- Langfuse for tracing
- Error handling utilities

### Files to Modify

#### `lib/services/jobs/functions.ts`
**Changes:**
- In `processContentJob()` Inngest function
- Add branch for `content_type === "audio"`
- Call `transcribeAudio(content_url)`
- Store transcript in item.content or enrichment
- Add Langfuse tracing

```typescript
// Pseudocode addition
if (contentType === "audio") {
  const { transcript, duration, language } = await transcribeAudio(contentUrl);
  item.content = transcript;
  item.enrichment.audio_metadata = { duration, language };
  // Trace this
}
```

#### `lib/services/whatsapp/message-parser.ts`
**Changes:**
- Verify audio URL extraction is correct
- Ensure audio MIME types are recognized
- May need to validate that URLs are properly formatted

```typescript
// Verify existing logic:
// - Audio messages have media.url
// - Media type is correctly identified as "audio"
// - URL is accessible from backend
```

### Files to Create
- `lib/services/ai/audio/transcription.ts`

### Summary
- **Files touched:** 3
- **Lines changed:** ~50-70
- **Risk level:** Low (isolated new service, error handling)

---

## TASK-603: Fix Image Processing Flow

### Files to Modify

#### `lib/services/jobs/functions.ts`
**Changes:**
- Add comprehensive logging to trace image processing
- Debug GPT-4o Vision invocation for images
- Verify vision results are stored correctly
- Add detailed error handling

```typescript
// Pseudocode
if (contentType === "image") {
  console.log(`[Image] Processing: ${contentUrl}`);

  try {
    console.log(`[Image] Calling GPT-4o Vision API`);
    const visionResult = await analyzeImageWithVision(imageUrl);
    console.log(`[Image] Vision result:`, visionResult);

    item.enrichment.image_analysis = visionResult;
    console.log(`[Image] Stored in enrichment`);
  } catch (err) {
    console.error(`[Image] Vision analysis failed:`, err);
    // Don't throw - allow item creation with failed analysis
  }
}
```

#### Vision Service (if exists: `lib/services/ai/vision/index.ts`)
**Changes:**
- Add logging at entry/exit points
- Verify error handling for various image formats
- Test with different image types

**Or create if doesn't exist:**

#### `lib/services/ai/vision/index.ts` (CREATE IF MISSING)
```typescript
export async function analyzeImageWithVision(imageUrl: string): Promise<{
  description: string;
  objects: string[];
  text?: string;
  categories: string[];
}> {
  // Use GPT-4o Vision
  // Return structured analysis
}
```

### Files to Create
- `lib/services/ai/vision/index.ts` (if doesn't exist already)

### Summary
- **Files touched:** 2-3
- **Lines changed:** ~30-50
- **Risk level:** Low (mostly logging and verification)

---

## TASK-701: Make Cards Editable

### Files to Create

#### `src/components/feed/item-edit-form.tsx` (NEW)
**Purpose:** Form component for editing items

```typescript
interface ItemEditFormProps {
  item: Item;
  onSave: (updates: Partial<Item>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ItemEditForm({ item, onSave, onCancel, isLoading }: ItemEditFormProps) {
  // Form fields:
  // - title (TextInput, required)
  // - content (TextArea)
  // - category (Select from existing categories)
  // - tags (TagInput, multi-select)
  // - url (TextInput, optional)
  // - thumbnail_url (TextInput, optional)

  // Form submission:
  // - Validate required fields
  // - Call onSave() with changes
  // - Handle errors with toast
  // - Show loading state
}
```

### Files to Modify

#### `src/components/feed/item-detail-modal.tsx`
**Changes:**
- Add state: `isEditMode: boolean`
- Add "Edit" button in header or footer
- Toggle edit mode on button click
- Conditionally render ItemEditForm or read-only content
- Save/Cancel buttons switch modes

```typescript
// Pseudocode
const [isEditMode, setIsEditMode] = useState(false);

return (
  <Modal>
    {isEditMode ? (
      <ItemEditForm
        item={item}
        onSave={handleSave}
        onCancel={() => setIsEditMode(false)}
      />
    ) : (
      <>
        <ItemContent item={item} />
        <button onClick={() => setIsEditMode(true)}>Edit</button>
      </>
    )}
  </Modal>
);
```

#### `src/hooks/use-items.ts`
**Changes:**
- Add `updateItem(itemId: string, updates: Partial<Item>)` function
- Implement optimistic update
- Call PATCH /api/items/:id
- On error, revert optimistic update
- Return updated item

```typescript
// Pseudocode
const updateItem = async (itemId: string, updates: Partial<Item>) => {
  // Save previous state
  const previous = items.find(i => i.id === itemId);

  // Optimistic update
  setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));

  try {
    const res = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error("Update failed");
    // Success - updated state is fine
  } catch (err) {
    // Revert
    if (previous) {
      setItems(prev => prev.map(i => i.id === itemId ? previous : i));
    }
    throw err;
  }
};
```

### Files to Create
- `src/components/feed/item-edit-form.tsx`

### Summary
- **Files touched:** 3
- **Lines changed:** ~80-120
- **Risk level:** Medium (form handling, optimistic updates)

---

## TASK-702: Google ADK Orchestrator Architecture

### Files to Create (14+ files)

#### Core Orchestrator

##### `lib/services/ai/agents/config.ts`
- Agent configuration: models, token budgets, timeouts
- System prompts for each agent
- Tool definitions

##### `lib/services/ai/agents/orchestrator.ts`
- SequentialAgent pipeline orchestrator
- Handles agent handoff and error handling
- Tracks context through pipeline
- Integrates with Langfuse

#### InputAnalyzer Agent

##### `lib/services/ai/agents/input-analyzer/index.ts`
- Main agent logic
- Detects content type and extracts key information
- Routes to appropriate tools

##### `lib/services/ai/agents/input-analyzer/prompts.ts`
- System prompt for GPT-4o-mini
- Instructs agent to normalize input
- Output format specification

##### `lib/services/ai/agents/input-analyzer/tools/vision-tool.ts`
- Wrapper around GPT-4o Vision for image analysis
- Input: image URL or base64
- Output: {description, objects, text, categories}

##### `lib/services/ai/agents/input-analyzer/tools/transcription.ts`
- Wrapper around Whisper (reuse from TASK-602)
- Input: audio URL
- Output: {transcript, duration, language}

#### ActionDecider Agent

##### `lib/services/ai/agents/action-decider/index.ts`
- Classifies content intent and decides actions
- Determines what needs to happen next
- Routes to ActionExecutor

##### `lib/services/ai/agents/action-decider/prompts.ts`
- System prompt for GPT-4o
- Instructs agent to classify and decide
- Output format specification

##### `lib/services/ai/agents/action-decider/tools/web-fetch.ts`
- Fetch content from URLs
- Input: URL
- Output: {title, text, metadata}

##### `lib/services/ai/agents/action-decider/tools/web-search.ts`
- Tavily web search integration
- Input: query
- Output: {results: [{title, url, snippet}]}

#### ActionExecutor Agent

##### `lib/services/ai/agents/action-executor/index.ts`
- Executes decided actions
- Creates items, generates embeddings
- Final output formatting

##### `lib/services/ai/agents/action-executor/prompts.ts`
- System prompt for GPT-4o-mini
- Instructs agent to execute and format
- Output format specification

##### `lib/services/ai/agents/action-executor/tools/item-creator.ts`
- Database operations for items
- Creates new items in DB
- Updates existing items if needed

##### `lib/services/ai/agents/action-executor/tools/embedding.ts`
- Generates embeddings (reuse from existing code)
- Stores in vector database
- Returns embedding ID

### Files to Modify

#### `lib/services/jobs/functions.ts`
**Changes:**
- Add new `orchestratedProcessingJob()` Inngest function
- Read `USE_ADK_ORCHESTRATOR` environment variable
- Route to new orchestrator or fallback to existing `processContentJob`
- Maintain backward compatibility

```typescript
// Pseudocode
export const orchestratedProcessingJob = inngest.createFunction(
  { id: "orchestrated-content-processing" },
  { event: "content/process" },
  async ({ event, step }) => {
    const useOrchestrator = process.env.USE_ADK_ORCHESTRATOR === "true";

    if (useOrchestrator) {
      return await step.run("orchestrator", async () => {
        return await runOrchestratorPipeline(event);
      });
    } else {
      return await processContentJob(event, step);
    }
  }
);
```

#### `lib/env.ts`
**Changes:**
- Add `USE_ADK_ORCHESTRATOR` to environment variables
- Default to `false` for gradual rollout

### Files to Create
- 14+ files in `lib/services/ai/agents/` directory structure as listed above

### Summary
- **Files created:** 14-16 new files
- **Files modified:** 2 (functions.ts, env.ts)
- **Lines written:** ~800-1200
- **Risk level:** High (complex architecture, but isolated by feature flag)

---

## TASK-801: Fix Nova's Insights with Real Data

### Files to Modify

#### `src/app/api/nova/activity/route.ts`
**Changes:**
- Query `nova_activity` table from Supabase
- Filter by user_id and recent timeframe
- Return structured activity data

```typescript
export async function GET(request: Request) {
  const user = await getUser(); // from auth context

  const activities = await supabase
    .from("nova_activity")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24h
    .order("created_at", { ascending: false })
    .limit(10);

  return Response.json(activities.data);
}
```

#### `src/components/layout/widgets-container.tsx`
**Changes:**
- Add useEffect to fetch from /api/nova/activity on mount
- Add loading skeleton state
- Add error handling
- Display real data instead of mock

```typescript
const [activities, setActivities] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/nova/activity");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setActivities(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  fetchActivities();
}, []);
```

#### `src/components/layout/nova-activity-modal.tsx`
**Changes:**
- Remove hardcoded mock data
- Accept `activities` as prop or fetch from context
- Format timestamps with `formatDistanceToNow()` (relative time)
- Handle loading/error states

#### `lib/services/jobs/functions.ts`
**Changes:**
- Track Nova actions by inserting into `nova_activity` table
- Insert after significant actions: item created, analysis complete, etc.
- Store action type, description, and metadata

```typescript
// Pseudocode
await supabase.from("nova_activity").insert({
  user_id: userId,
  action_type: "item_created",
  description: "Created item from URL share",
  metadata: { item_id: item.id, content_type: "url" },
  created_at: new Date()
});
```

### Files to Create
None - modifications only

### Summary
- **Files modified:** 4
- **Lines changed:** ~60-80
- **Risk level:** Low (query + display, no mutation)

---

## TASK-802: Enhanced Voice Agent with Q&A

### Files to Create

#### `lib/services/ai/voice/question-answering.ts` (NEW)
**Purpose:** Semantic search and Q&A for voice queries

```typescript
export async function answerQuestion(
  query: string,
  userId: string
): Promise<{
  answer: string;
  relevantItems: Item[];
  confidence: number;
}> {
  // 1. Generate embedding of query
  // 2. Search item embeddings (threshold 0.7)
  // 3. Pass matched items to GPT-4o for answer
  // 4. Return structured response
}
```

### Files to Modify

#### `lib/services/ai/voice/filter-intent.ts`
**Changes:**
- Add question detection logic
- Check if input matches known filter commands
- If not a command, treat as question
- Route to appropriate handler

```typescript
// Pseudocode
export async function detectIntent(input: string): Promise<{
  type: "filter" | "question";
  intent?: FilterIntent;
  query?: string;
}> {
  const knownCommands = ["show links", "show articles", "show images", ...];
  const isCommand = knownCommands.some(cmd => input.toLowerCase().includes(cmd));

  if (isCommand) {
    return { type: "filter", intent: parseFilter(input) };
  } else {
    return { type: "question", query: input };
  }
}
```

#### `src/components/feed/items-feed.tsx`
**Changes:**
- Handle question responses from voice agent
- Display in QueryResultModal or new component
- Show relevant items + Nova answer
- Add error handling

```typescript
// Pseudocode
const handleVoiceInput = async (input: string) => {
  const intent = await detectIntent(input);

  if (intent.type === "filter") {
    // Existing filter logic
  } else if (intent.type === "question") {
    const { answer, relevantItems } = await answerQuestion(intent.query);
    showQueryResultModal({ answer, items: relevantItems });
  }
};
```

### Files to Create
- `lib/services/ai/voice/question-answering.ts`

### Summary
- **Files created:** 1
- **Files modified:** 2
- **Lines written:** ~100-150
- **Risk level:** Low (new service, non-destructive)

---

## TASK-901: Create Coming Soon Placeholder Pages

### Files to Create

#### `src/components/ui/coming-soon.tsx` (NEW)
**Purpose:** Reusable Coming Soon component

```typescript
interface ComingSoonProps {
  feature: string;
  description?: string;
  icon?: React.ReactNode;
}

export function ComingSoon({ feature, description, icon }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <h1 className="text-2xl font-bold mb-2">{feature}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
      <p className="text-sm text-muted-foreground mt-4">Coming soon...</p>
    </div>
  );
}
```

#### `src/app/notes/page.tsx` (NEW)
```typescript
import { ComingSoon } from "@/components/ui/coming-soon";

export default function NotesPage() {
  return <ComingSoon feature="Notes" description="Organize and capture your thoughts" />;
}
```

#### `src/app/timeline/page.tsx` (NEW)
```typescript
import { ComingSoon } from "@/components/ui/coming-soon";

export default function TimelinePage() {
  return <ComingSoon feature="Timeline" description="View your memories chronologically" />;
}
```

#### `src/app/analytics/page.tsx` (NEW)
```typescript
import { ComingSoon } from "@/components/ui/coming-soon";

export default function AnalyticsPage() {
  return <ComingSoon feature="Analytics" description="Insights about your content patterns" />;
}
```

#### `src/app/collections/page.tsx` (NEW)
```typescript
import { ComingSoon } from "@/components/ui/coming-soon";

export default function CollectionsPage() {
  return <ComingSoon feature="Collections" description="Curate and organize your items" />;
}
```

#### `src/app/settings/page.tsx` (NEW)
```typescript
import { ComingSoon } from "@/components/ui/coming-soon";

export default function SettingsPage() {
  return <ComingSoon feature="Settings" description="Customize your LifeOS experience" />;
}
```

#### `src/app/notifications/page.tsx` (NEW)
```typescript
import { ComingSoon } from "@/components/ui/coming-soon";

export default function NotificationsPage() {
  return <ComingSoon feature="Notifications" description="Stay updated with Nova's insights" />;
}
```

### Files to Create
- `src/components/ui/coming-soon.tsx`
- `src/app/notes/page.tsx`
- `src/app/timeline/page.tsx`
- `src/app/analytics/page.tsx`
- `src/app/collections/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/notifications/page.tsx`

### Summary
- **Files created:** 7 new files
- **Lines written:** ~100-120 total
- **Risk level:** Very Low (isolated new pages)

---

## File Count Summary

| Phase | Task | New Files | Modified Files | Total |
|-------|------|-----------|----------------|-------|
| 1 | TASK-601 | 0 | 2 | 2 |
| 1 | TASK-602 | 1 | 2 | 3 |
| 1 | TASK-603 | 0-1 | 2 | 2-3 |
| 2 | TASK-701 | 1 | 2 | 3 |
| 2 | TASK-702 | 14-16 | 2 | 16-18 |
| 3 | TASK-801 | 0 | 4 | 4 |
| 3 | TASK-802 | 1 | 2 | 3 |
| 4 | TASK-901 | 7 | 0 | 7 |
| | **TOTAL** | **25-31** | **18** | **43-49** |

---

## Risk Assessment

### Low Risk (Can merge quickly)
- TASK-601: Error handling only
- TASK-602: Isolated new service
- TASK-603: Logging and debugging
- TASK-801: Query and display only
- TASK-802: New service, non-destructive
- TASK-901: New pages only

### Medium Risk (Needs testing)
- TASK-701: Form handling and optimistic updates

### High Risk (Needs careful review)
- TASK-702: Complex architecture, but isolated by feature flag

---

## Notes

- **Reuse existing code:** TASK-602 transcription can be reused in TASK-702 vision tool
- **Feature flag is crucial:** TASK-702 needs `USE_ADK_ORCHESTRATOR=false` by default
- **Test incrementally:** Each task has clear verification checklist
- **Database migrations:** Ensure `nova_activity` table exists before TASK-801
- **API routes exist:** PATCH /api/items/:id exists for TASK-701
- **Parallel file writing:** Multiple Claude instances can work on different files simultaneously
