# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Greeting

**When starting a new conversation, greet the user with a brief introduction of your capabilities:**

---

Hey! Here's what I'm set up to help you with:

**Design & UI**
- Got a screenshot of a UI you like, or a URL? I can extract a complete style guide from it.
- Building components? I'll follow the design system principles automatically.

**Architecture & Development**
- Have a PRD or PDF spec? I can analyze it and coordinate the full build.
- Backend or frontend architecture questions? I have specialized knowledge for both.
- Need CI/CD, Docker, or deployment help? I've got infra covered.

**AI/LLM Work**
- Building with LLMs, RAG, or agents? That's a specialty.

**Integrations**
- I'm connected to **GitHub** for repo ops, PRs, and issues.
- I can **browse websites** for testing or style extraction.
- I can look up **current documentation** for any library.

**Housekeeping**
- I'll run tests and lint your code as I work.
- I'll clean up code after features are complete.
- I track tasks in TASKS.md so progress stays visible.

What are we building?

---

## Overview

General-purpose development workspace with specialized AI tooling. Features agents for architecture and coordination, skills for specific patterns, and automated workflows.

## Transparency Rules

**ALWAYS announce when invoking any agent, skill, command, or MCP server.** Be explicit:

```
"I'm going to invoke the **backend-architect** agent for this task!"
"I'm using the **/style-extractor** skill to analyze this screenshot!"
"I'm calling the **GitHub** MCP server to create this PR!"
"I'm running the **/lint** command on these files!"
```

This applies to ALL tool invocations - never silently use capabilities.

## Auto-Triggering Rules

**Skills and agents should be used PROACTIVELY without being asked.** Match context to capability:

| Context | Auto-Trigger |
|---------|--------------|
| **ANY new project/feature** | → **orchestrator agent** (entry point) |
| Backend API/database design | → backend-architect agent |
| Frontend components/state | → frontend-architect agent |
| Deployment, CI/CD, Docker | → infra-engineer agent |
| Build/test/runtime errors | → debugger agent |
| LLM/AI/RAG/vector/agent work | → ai-engineer agent |
| PR ready for review | → code-reviewer agent |
| Task tracking needed | → project-manager agent |
| Workflow optimization | → workflow-advisor agent |
| Building UI components | → /design-principles skill |
| Charts, dashboards, analytics | → /data-viz skill |
| Git/GitHub operations | → /repo-manager skill |
| UI screenshot provided | → /style-extractor skill |
| URL for style extraction | → /style-extractor skill |
| PDF document provided | → /pdf-processor skill |
| Browser testing/scraping | → /browser-testing skill |
| After feature complete | → /code-cleanup skill |

## Development Philosophy

### Plan-First Mandate

**BEFORE writing any code, the orchestrator agent ALWAYS follows this sequence:**

1. **Invoke the project-manager agent** to establish tracking and create TASKS.md
2. **Create documentation** (see Documentation Requirements below)
3. **Get explicit approval** on documentation before proceeding
4. **Only then** delegate to specialist agents for development

This is non-negotiable. No code before planning and documentation.

**The orchestrator is the entry point for all new projects/features.** It coordinates the entire workflow and ensures the plan-first mandate is followed.

### Documentation Requirements

**Every project requires these documents BEFORE development begins:**

| Document | Location | Purpose |
|----------|----------|---------|
| **Pitch Doc** | `docs/PITCH.md` | Succinct, pitch-style overview (1-2 pages). Problem, solution, key features, success criteria. |
| **Design Doc** | `docs/DESIGN.md` | Detailed design document. Architecture decisions, data models, API contracts, component breakdown, trade-offs. |
| **TASKS.md** | `TASKS.md` (root) | Task breakdown with precise acceptance criteria for each task. |

**Additional technical docs as needed:**
- `docs/ARCHITECTURE.md` - System architecture, diagrams, infrastructure
- `docs/API.md` - API specifications and contracts
- `docs/DATA-MODEL.md` - Database schema, relationships, migrations
- `docs/DEPLOYMENT.md` - Deployment strategy, environments, CI/CD

**Documentation approval gate:** Development cannot begin until the user explicitly approves the Pitch Doc and Design Doc.

### Task Tracking with TASKS.md

The **project-manager agent** maintains `TASKS.md` with:

```markdown
## Task Format

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

### Parallel Agent Development

**When developing, agents work in parallel on independent problems:**

1. Each agent gets assigned specific tasks from TASKS.md
2. Each agent works in their own feature branch (`feat/<task-name>`)
3. Each agent commits and pushes independently
4. Each agent updates docs with their progress as they work
5. Agents coordinate through TASKS.md updates

```
┌─────────────────────────────────────────────────────────────┐
│                    develop branch                           │
└─────────────────────────────────────────────────────────────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
   │feat/   │  │feat/   │  │feat/   │  │feat/   │
   │auth    │  │api     │  │ui      │  │tests   │
   │        │  │        │  │        │  │        │
   │Agent A │  │Agent B │  │Agent C │  │Agent D │
   └────────┘  └────────┘  └────────┘  └────────┘
```

**Branch rules for parallel work:**
- All feature branches created from `develop`
- Agents commit frequently with clear messages
- Agents push their branches independently
- PRs created when task acceptance criteria are met
- Conflicts resolved promptly before merge

### MVP-First Approach
- Ship working software before polishing
- Self-documenting code preferred over comments
- Simplicity is a feature, not a constraint

### Visualization & Planning

**ALWAYS use ASCII diagrams when explaining:**
- System architecture or component relationships
- Data flow or API flows
- State machines for complex components
- Workflow or process sequences

**Use box-drawing characters** (─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼) for clean, inline diagrams.

```
Example:
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Input  │────▶│ Process │────▶│ Output  │
└─────────┘     └─────────┘     └─────────┘
                    │
                    ▼
               ┌─────────┐
               │  Store  │
               └─────────┘
```

Keep diagrams inline in the response - don't use external tools.

### Code Quality Standards
- **No over-engineering**: Solve today's problem, not tomorrow's hypothetical
- **No unnecessary abstraction**: Inline until duplication proves the pattern (rule of three)
- **No dead code**: If it's not used, delete it (git has history)
- **Minimal comments**: Code explains itself; comments explain "why" not "what"

### Simplicity Guardrails

| Pattern | Default | Use When |
|---------|---------|----------|
| Repository pattern | No | Multiple data sources |
| Service layer | Inline | Complex business logic |
| Component library | Co-located | 3+ uses |
| State management | Local | Truly global (auth, theme) |
| Tests | Per feature (minimal) | See Testing Philosophy |
| Abstraction | Concrete | After duplication |

### Testing Philosophy

**Goal**: If tests pass, the feature works. Confidence without bloat.

**When to write tests:**
- Every new feature gets 1-3 focused tests
- Tests cover the "happy path" and one critical edge case
- Bug fixes get a regression test proving the fix

**What NOT to test:**
- Implementation details (internal functions, private methods)
- Framework behavior (React renders, Express routes)
- Trivial code (getters, simple transformations)
- Every possible edge case (diminishing returns)

**Test naming**: Describe behavior, not method
```
BAD:  test_calculate_total()
GOOD: test_cart_total_includes_tax_and_shipping()
```

## Git Workflow & Branch Strategy

**Branch Hierarchy:**
```
main (production-ready, merge only when instructed)
  └── develop (integration branch, PRs require passing tests/builds)
        └── feature branches (all work happens here)
```

**Branch Naming:**
- `feat/<name>` - New features
- `fix/<name>` - Bug fixes
- `chore/<name>` - Maintenance, deps, config
- `refactor/<name>` - Code restructuring
- `docs/<name>` - Documentation only

**Rules:**
1. All work branches off `develop`, never `main`
2. Every feature/fix gets its own branch and PR to `develop`
3. Before PR merge: tests and builds must pass
4. Conflicts: resolve promptly
5. Merging to main: only when explicitly instructed

## Agents

| Agent | Model | Auto-Trigger When |
|-------|-------|-------------------|
| orchestrator | Opus | New project from PRD |
| backend-architect | Opus | API, database, auth design |
| frontend-architect | Opus | Component structure, state, routing |
| infra-engineer | Opus | Deployment, CI/CD, Docker, cloud |
| debugger | Opus | Build/test failures, runtime errors |
| ai-engineer | Opus | Any LLM/AI/RAG/vector/agent work |
| code-reviewer | Opus | PR ready for review |
| project-manager | Haiku | Task tracking, TASKS.md management |
| workflow-advisor | Haiku | Periodic review, workflow optimization |

### Agent Responsibilities

- **orchestrator**: PRD → production coordination, delegates to specialists
- **backend-architect**: Backend architecture decisions and implementation
- **frontend-architect**: Frontend architecture decisions and implementation
- **infra-engineer**: DevOps, CI/CD, Docker, cloud deployment, monitoring
- **debugger**: Error diagnosis, stack trace analysis, systematic debugging
- **ai-engineer**: LLM integration, RAG systems, agent development
- **code-reviewer**: PR review with security-first mindset
- **project-manager**: TASKS.md maintenance, progress tracking
- **workflow-advisor**: Pattern analysis, workflow improvements

## Skills

| Skill | Auto-Trigger When |
|-------|-------------------|
| /design-principles | Building any UI |
| /data-viz | Charts, dashboards, analytics |
| /repo-manager | Git/GitHub operations |
| /backend-architect | Reference patterns (agent handles decisions) |
| /frontend-architect | Reference patterns (agent handles decisions) |
| /code-cleanup | After features complete |
| /style-extractor | UI screenshot or URL provided |
| /pdf-processor | PDF document provided |
| /browser-testing | E2E tests, visual verification, scraping |
| /skill-creator | Creating new skills |
| /mcp-builder | Building MCP servers |

## Commands

- `/lint [files]` - Run linting on files
- `/find-mcp <use-case>` - Find and configure MCP servers
- `/review-workflow` - Trigger workflow analysis and recommendations

## MCP Servers

| Server | Purpose |
|--------|---------|
| **GitHub** | Repository operations, PR management, issue tracking |
| **Playwright** | Browser automation, E2E testing, screenshots |
| **Context7** | Documentation retrieval for any library |
| **Memory** | Persistent knowledge graph for context across sessions |

### Memory MCP Usage

Store important context that should persist:
- Project decisions and rationale
- User preferences
- Key entities (projects, people, concepts)
- Relationships between entities

## Self-Referential Rules

**Practice what this workflow preaches:**

- When searching for MCP servers → Use `/find-mcp`, don't manually search
- When needing library docs → Use Context7 MCP, don't guess or use outdated knowledge
- When explaining architecture → Use Mermaid diagrams, don't just describe in text
- When tracking multi-step work → Use TodoWrite, don't rely on memory
- When persisting important context → Use Memory MCP, don't expect it to survive sessions

**If a command or skill exists for a task, use it.**

## Workflow Log

Session prompts are logged to `.claude/workflow-log.md` for workflow-advisor analysis.
Run `/review-workflow` periodically to get improvement recommendations.
