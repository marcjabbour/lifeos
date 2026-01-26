# Future Features

This document tracks planned features and enhancements for LifeOS.

---

## Create Entities

**Status:** Planned
**Priority:** High
**Category:** Core Feature

### Overview

The "Create Entities" feature allows users to curate multiple items from their Intelligence Feed into organized plans or collections. This enables structured learning journeys, project planning, and knowledge synthesis across different content sources.

### Use Case Example

Imagine you have 5 different items about LoRA adapters saved in your feed:
- 3 items from Tweets
- 1 item from a screenshot
- 1 item from a research paper

With Create Entities, you can:
1. Create a new entity called "LoRA Adapter Plan"
2. Search and select which items to include
3. Define a goal (e.g., "Learn about LoRA adapters")
4. Nova generates a learning plan with a visual diagram showing the optimal flow through the content

### User Flow

1. **Initiate Creation**
   - Click "Create Entity" from the left sidebar (new "Entities" section)
   - Or select multiple items from the feed and click "Create Entity"

2. **Search and Select Items**
   - A modal appears with a searchable list of all saved items
   - User can filter by category, tags, source type, or date
   - Multi-select items to include in the entity
   - Preview selected items before confirming

3. **Define the Entity**
   - Name the entity (e.g., "LoRA Adapter Plan")
   - Optionally add a description
   - Set a goal or objective (e.g., "Learn the fundamentals of LoRA fine-tuning")

4. **Nova Generates the Plan**
   - Nova analyzes the selected items and the stated goal
   - Creates an optimized sequence/flow for consuming the content
   - Generates a visual diagram showing:
     - Recommended order of content
     - Connections between items
     - Estimated time to complete
     - Prerequisites and dependencies

5. **Save and Access**
   - Entity is saved to the "Entities" section in the left sidebar
   - Can be revisited, edited, or marked as complete
   - Progress tracking for each item in the plan

### UI Placement

**Left Sidebar Addition:**
```
[Nova Icon]
------------
[Grid]      Feed
[File]      Notes
[Clock]     Timeline
[Chart]     Analytics
[Folder]    Collections
[Layers]    Entities    <-- NEW
------------
[Bell]      Notifications
[Settings]  Settings
```

### Entity View Layout

When viewing an entity:

1. **Header**
   - Entity name
   - Goal/objective
   - Progress indicator (e.g., "2 of 5 items completed")
   - Created date

2. **Flow Diagram**
   - Visual representation of the learning journey
   - Nodes represent items
   - Edges show recommended flow/dependencies
   - Interactive - click nodes to open items

3. **Item List**
   - Ordered list of items in the entity
   - Checkbox to mark as completed
   - Quick preview on hover
   - Reorder via drag-and-drop

4. **Nova Insights Panel**
   - Why this order was recommended
   - Key connections Nova found
   - Suggestions for additional items to include

### Technical Considerations

- **Data Model:**
  - New `entities` table in Supabase
  - Many-to-many relationship with `items` via `entity_items` junction table
  - Store generated plan/diagram as JSON

- **AI Integration:**
  - Use existing Nova infrastructure for plan generation
  - Leverage item embeddings for connection analysis
  - Generate Mermaid or similar diagram format

- **Performance:**
  - Lazy load diagram rendering
  - Cache generated plans
  - Incremental updates when items are added/removed

### Future Enhancements

- Share entities with other users
- Collaborative entities (multiple contributors)
- Export to external tools (Notion, Obsidian)
- Scheduled reminders for incomplete entities
- AI-suggested entities based on related saves

---

---

## WhatsApp Integration via MCP Server

**Status:** In Progress
**Priority:** High
**Category:** Integration

### Overview

Enable LifeOS interaction through WhatsApp, allowing users to:
1. Share content (links, screenshots, text) to LifeOS by messaging a WhatsApp bot
2. Query saved items ("What was the movie I recently saved?")
3. Receive rich responses with thumbnails, links, and formatted lists

### Architecture: MCP Server

A single MCP (Model Context Protocol) server exposes LifeOS capabilities as tools that Claude can invoke:

```
┌─────────────────────────────────────────────────────┐
│              LifeOS MCP Server                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │ Ingestion │  │   Query   │  │    UI     │       │
│  │   Tools   │  │   Tools   │  │  Control  │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                      │                              │
│              ┌───────┴───────┐                      │
│              │ LifeOS API    │                      │
│              │   Adapter     │                      │
│              └───────────────┘                      │
└─────────────────────────────────────────────────────┘
```

### MCP Tools

| Tool | Purpose |
|------|---------|
| `lifeos_ingest_content` | Save URLs, text, notes |
| `lifeos_ingest_image` | Save screenshots/photos with OCR |
| `lifeos_query_search` | Semantic + text search |
| `lifeos_query_recent` | Get recently saved items |
| `lifeos_query_ask_nova` | Complex questions requiring reasoning |
| `lifeos_query_categories` | List categories with counts |
| `lifeos_ui_apply_filter` | Apply filter to Intelligence Feed |
| `lifeos_ui_clear_filters` | Clear all active filters |

### WhatsApp Provider: Twilio

Using Twilio WhatsApp API for:
- Simple webhook integration
- Built-in signature validation
- Easy media handling (for screenshots)
- Sandbox for development

### User Flow

1. **Link Phone Number**: User generates a code in LifeOS settings, sends to WhatsApp bot
2. **Share Content**: Send a link, screenshot, or text to the bot
3. **Query Items**: Ask questions like "Show me my Italian restaurants"
4. **Receive Responses**: Rich formatted messages with thumbnails and links

### Database Changes

New tables:
- `whatsapp_users` - Links phone numbers to LifeOS accounts
- `whatsapp_messages` - Message log for debugging and context

### Files to Create

```
mcp-server/
├── src/
│   ├── index.ts
│   ├── tools/ingestion.ts
│   ├── tools/query.ts
│   ├── tools/ui-control.ts
│   └── adapters/lifeos-api.ts

src/app/api/whatsapp/
├── webhook/route.ts
└── link/route.ts

lib/services/whatsapp/
├── twilio-client.ts
├── message-parser.ts
└── response-formatter.ts
```

---

## Nova UI Command Integration

**Status:** In Progress
**Priority:** High
**Category:** Core Feature

### Overview

Enable natural language commands in the "Ask Nova anything about your life" input that can:
1. **Filter the feed**: "Show me all Italian restaurants I saved"
2. **Query conversationally**: "What was the last movie I saved?"

### Implementation

**Nova Command Endpoint** (`POST /api/nova/command`):
- Accepts natural language command
- Parses intent using existing `parseFilterIntent()`
- Returns either:
  - Filter response: UI applies filters automatically
  - Query response: Conversational answer with item details

**FilterContext Provider**:
- React context managing filter state
- `submitCommand(command)` method for Nova integration
- Automatically syncs filter changes to ItemsFeed

### User Flow

1. User types "Show me food items" in CommandInput
2. Nova parses intent → filter action
3. FilterContext updates → ItemsFeed re-renders with filtered items
4. Nova responds: "Got it! Showing food items."

Or:

1. User types "What movie did I save last week?"
2. Nova parses intent → query action
3. Nova searches items, generates conversational response
4. User sees: "You saved 'Interstellar' on January 20th..."

---

## Other Planned Features

*Additional features will be documented here as they are defined.*
