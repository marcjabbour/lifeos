---
name: code-cleanup
description: Code simplification and cleanup guidance. Use to identify dead code, unnecessary abstractions, and opportunities for simplification. Enforces DRY without over-engineering. Apply after features are working to keep codebase clean.
---

# Code Cleanup

## Philosophy

1. **Working code first, clean code second** - Don't clean while building
2. **Simplify only what you understand** - Don't refactor unfamiliar code
3. **Remove before refactoring** - Deletion is the best cleanup

## Dead Code Detection

### What to Remove
- Unused imports
- Unused variables, functions, and classes
- Unreachable code branches
- Commented-out code (git has history)
- Unused dependencies in package.json
- Empty files or near-empty files
- Unused CSS classes/styles
- Unused exports

### Detection Approach
```bash
# Find unused exports (TypeScript)
npx ts-prune

# Find unused dependencies
npx depcheck

# Find unused CSS (if using PurgeCSS)
# Check build output warnings
```

## Abstraction Audit

### When to Inline
- **Single-use helpers** - If called once, inline it
- **Pass-through wrappers** - Functions that just call another function
- **Trivial abstractions** - `const add = (a, b) => a + b`

### When to Keep
- **Reused 3+ times** - Rule of three
- **Complex logic** - Encapsulates non-obvious behavior
- **Named concepts** - Gives meaning to magic values

### Refactoring Decisions

```
Is this abstraction used more than once?
  No  → Inline it
  Yes → Continue

Is this abstraction likely to change independently?
  No  → Consider inlining
  Yes → Keep it

Does this abstraction hide complexity?
  No  → Inline it
  Yes → Keep it

Would inlining make the code harder to understand?
  No  → Inline it
  Yes → Keep it
```

## DRY Application Rules

### The Rule of Three
```
1 instance: Just write the code
2 instances: Tolerable duplication
3 instances: Extract an abstraction
```

### Good Duplication
Some duplication is acceptable:
- Similar but domain-different code (users vs products)
- Code likely to diverge
- Duplication that avoids coupling

### Bad Duplication
Must extract:
- Copy-pasted bug-prone logic
- Business rules that must stay in sync
- Complex calculations repeated verbatim

## File Organization

### Merge When
- Two files always change together
- Files are under 50 lines each
- One file only exports to the other

### Split When
- File exceeds ~300 lines
- File has multiple unrelated concerns
- Parts of file change at different rates

### Delete When
- File is empty or only has comments
- File exports nothing used elsewhere
- File contains only dead code

## Simplification Patterns

### Replace Conditionals with Early Returns
```typescript
// Before
function process(data) {
  if (data) {
    if (data.isValid) {
      return transform(data);
    } else {
      return null;
    }
  } else {
    return null;
  }
}

// After
function process(data) {
  if (!data?.isValid) return null;
  return transform(data);
}
```

### Remove Unnecessary Else
```typescript
// Before
if (condition) {
  return a;
} else {
  return b;
}

// After
if (condition) return a;
return b;
```

### Flatten Nested Callbacks
```typescript
// Before
getData((data) => {
  processData(data, (result) => {
    saveResult(result, (response) => {
      console.log(response);
    });
  });
});

// After
const data = await getData();
const result = await processData(data);
const response = await saveResult(result);
console.log(response);
```

### Simplify Boolean Logic
```typescript
// Before
if (isActive === true) { ... }
if (items.length > 0) { ... }
if (!!value) { ... }

// After
if (isActive) { ... }
if (items.length) { ... }
if (value) { ... }
```

## Cleanup Checklist

```
[ ] Remove unused imports
[ ] Remove unused variables and functions
[ ] Remove commented-out code
[ ] Inline single-use helpers
[ ] Remove empty files
[ ] Remove unnecessary type casts
[ ] Simplify complex conditionals
[ ] Remove redundant comments
[ ] Remove unused dependencies
[ ] Consolidate tiny related files
```

## When NOT to Clean

- During active feature development
- When you don't understand the code
- When tests don't cover the area
- When deadline pressure is high
- When the code might be needed soon

## Cleanup Workflow

1. **Identify** - Find cleanup opportunities
2. **Verify** - Ensure tests cover the area
3. **Clean** - Make one type of change at a time
4. **Test** - Run tests after each change
5. **Commit** - Small, focused commits

Never mix cleanup with feature changes in the same commit.
