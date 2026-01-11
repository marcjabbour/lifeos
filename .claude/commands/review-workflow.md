---
name: review-workflow
description: Trigger workflow-advisor to analyze patterns and suggest improvements. Run periodically or after project milestones.
---

# Review Workflow

Triggers the workflow-advisor agent to analyze your workflow patterns and suggest improvements.

## What It Does

1. **Analyzes workflow-log.md** - Reviews logged prompts for patterns
2. **Identifies friction points** - Finds repeated clarifications, blockers, rework
3. **Evaluates tool usage** - Checks which agents/skills are used vs. available
4. **Suggests improvements** - Recommends CLAUDE.md updates, new skills, or workflow changes

## When to Run

- After completing a major project or epic
- Weekly during active development
- When you notice repeated friction or inefficiency
- After onboarding new team members or tools

## Usage

```
/review-workflow
```

Or specify a time range:
```
/review-workflow last 7 days
/review-workflow since 2024-01-01
```

## Expected Output

The workflow-advisor will produce:

```markdown
## Workflow Analysis Report

### Patterns Observed
- [Pattern 1]: Seen N times
- [Pattern 2]: Seen N times

### Friction Points
- [Issue 1]: [Impact] → [Suggestion]
- [Issue 2]: [Impact] → [Suggestion]

### Underutilized Capabilities
- [Agent/Skill]: Could help with [use case]

### Recommendations
1. [Actionable improvement]
2. [Actionable improvement]

### Suggested CLAUDE.md Updates
[Specific additions or changes]
```

## Delegation

This command delegates to the **workflow-advisor agent** with context from:
- `.claude/workflow-log.md` - Session prompt history
- `.claude/CLAUDE.md` - Current workflow configuration
- Recent git history - What work was done
