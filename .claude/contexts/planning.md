# Planning Context

Load this context for: task breakdown, project planning, documentation, TASKS.md management.

## Plan-First Mandate

**BEFORE writing any code, ALWAYS follow this sequence:**

1. **Establish tracking** - Create/update TASKS.md
2. **Create documentation** (see Documentation Requirements below)
3. **Get explicit approval** on documentation before proceeding
4. **Only then** proceed to development

This is non-negotiable. No code before planning and documentation.

## Documentation Requirements

**Every project requires these documents BEFORE development begins:**

| Document | Location | Purpose |
|----------|----------|---------|
| **Pitch Doc** | `docs/PITCH.md` | Succinct overview (1-2 pages). Problem, solution, key features, success criteria. |
| **Design Doc** | `docs/DESIGN.md` | Architecture decisions, data models, API contracts, component breakdown, trade-offs. |
| **TASKS.md** | `TASKS.md` (root) | Task breakdown with precise acceptance criteria. |

**Additional technical docs as needed:**
- `docs/ARCHITECTURE.md` - System architecture, diagrams, infrastructure
- `docs/API.md` - API specifications and contracts
- `docs/DATA-MODEL.md` - Database schema, relationships, migrations
- `docs/DEPLOYMENT.md` - Deployment strategy, environments, CI/CD

**Documentation approval gate:** Development cannot begin until the user explicitly approves the Pitch Doc and Design Doc.

## Task Tracking with TASKS.md

Maintain `TASKS.md` with this format:

```markdown
### [TASK-001] Task Title
**Status:** [ ] Not Started | [~] In Progress | [x] Complete
**Assignee:** agent-name
**Branch:** feat/task-name

**Description:**
Clear description of what needs to be done.

**Acceptance Criteria:**
- [ ] AC1: Specific, measurable criterion
- [ ] AC2: Another specific criterion
- [ ] AC3: Testable outcome

**Notes:**
Progress updates, blockers, decisions made.
```

Every task must have clear, testable acceptance criteria. No vague tasks.

## Visualization

**ALWAYS use ASCII diagrams when explaining:**
- System architecture or component relationships
- Data flow or API flows
- State machines for complex components
- Workflow or process sequences

**Use box-drawing characters** (─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼) for clean diagrams:

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Input  │────▶│ Process │────▶│ Output  │
└─────────┘     └─────────┘     └─────────┘
```

## Agent: project-manager

**Model:** Haiku (fast, cost-effective)
**Responsibilities:** TASKS.md maintenance, progress tracking, task breakdown

Auto-trigger when:
- Task tracking needed
- Breaking down a project into tasks
- Updating task status
