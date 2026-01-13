# Design Philosophy Reference

Core principles for how we build software.

## MVP-First Approach

- Ship working software before polishing
- Self-documenting code preferred over comments
- Simplicity is a feature, not a constraint

## Code Quality Standards

- **No over-engineering**: Solve today's problem, not tomorrow's hypothetical
- **No unnecessary abstraction**: Inline until duplication proves the pattern (rule of three)
- **No dead code**: If it's not used, delete it (git has history)
- **Minimal comments**: Code explains itself; comments explain "why" not "what"

## Simplicity Guardrails

| Pattern | Default | Use When |
|---------|---------|----------|
| Repository pattern | No | Multiple data sources |
| Service layer | Inline | Complex business logic |
| Component library | Co-located | 3+ uses |
| State management | Local | Truly global (auth, theme) |
| Tests | Per feature (minimal) | See Testing Philosophy |
| Abstraction | Concrete | After duplication |

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
- Every possible edge case (diminishing returns)

**Test naming**: Describe behavior, not method
```
BAD:  test_calculate_total()
GOOD: test_cart_total_includes_tax_and_shipping()
```

## Visualization Standards

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
                    │
                    ▼
               ┌─────────┐
               │  Store  │
               └─────────┘
```

Keep diagrams inline - don't use external tools.

## Anti-Patterns to Avoid

1. **Premature abstraction** - Wait for the pattern to emerge (rule of three)
2. **Speculative generality** - Don't build for hypothetical future requirements
3. **God objects** - Keep classes/modules focused
4. **Feature creep** - Scope ruthlessly
5. **Gold plating** - Ship when it works, polish later
6. **Backwards-compatibility hacks** - Delete unused code, don't preserve it

## Decision Framework

When in doubt, ask:
1. Does this solve a problem we have TODAY?
2. Is this the simplest solution that works?
3. Will we need this more than once?
4. Can I delete this later without breaking things?

If any answer is "no" or "I don't know" - simplify.
