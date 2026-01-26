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

## Other Planned Features

*Additional features will be documented here as they are defined.*
