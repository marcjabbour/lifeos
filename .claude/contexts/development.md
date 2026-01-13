# Development Context

Load this context for: building features, code implementation, git workflow, testing.

## Agents Available

| Agent | Model | Use For |
|-------|-------|---------|
| orchestrator | Opus | Coordinating full builds from PRD |
| backend-architect | Opus | API, database, auth design & implementation |
| frontend-architect | Opus | Component structure, state, routing |
| debugger | Opus | Build/test failures, runtime errors |

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

## Parallel Agent Development

When developing, agents work in parallel on independent problems:

```
┌─────────────────────────────────────────────────────────────┐
│                    develop branch                           │
└─────────────────────────────────────────────────────────────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
   │feat/   │  │feat/   │  │feat/   │  │feat/   │
   │auth    │  │api     │  │ui      │  │tests   │
   └────────┘  └────────┘  └────────┘  └────────┘
```

- Each agent works in their own feature branch
- Agents commit and push independently
- PRs created when task acceptance criteria are met

## Code Quality Standards

- **No over-engineering**: Solve today's problem, not tomorrow's hypothetical
- **No unnecessary abstraction**: Inline until duplication proves the pattern (rule of three)
- **No dead code**: If it's not used, delete it (git has history)
- **Minimal comments**: Code explains itself; comments explain "why" not "what"

## Testing Philosophy

**Goal**: If tests pass, the feature works. Confidence without bloat.

**When to write tests:**
- Every new feature gets 1-3 focused tests
- Tests cover the "happy path" and one critical edge case
- Bug fixes get a regression test proving the fix

**What NOT to test:**
- Implementation details (internal functions, private methods)
- Framework behavior (React renders, Express routes)
- Trivial code (getters, simple transformations)

**Test naming**: Describe behavior, not method
```
BAD:  test_calculate_total()
GOOD: test_cart_total_includes_tax_and_shipping()
```

## Skills Available

| Skill | Use For |
|-------|---------|
| /design-principles | Building any UI components |
| /data-viz | Charts, dashboards, analytics |
| /repo-manager | Git/GitHub operations |
| /code-cleanup | After features complete |
| /browser-testing | E2E tests, visual verification |
