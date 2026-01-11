---
name: frontend-architect
description: Frontend architecture reference patterns. Contains component, state, and routing pattern documentation. For active architecture decisions, use the frontend-architect agent instead.
---

# Frontend Architecture Reference

This skill contains reference documentation for frontend patterns. For active architecture decisions and implementation, use the **frontend-architect agent**.

## Reference Files

- `references/component-patterns.md` - Atomic design, composition patterns
- `references/state-patterns.md` - Local, context, global state strategies
- `references/routing-patterns.md` - File-based, centralized, guards, layouts

## Quick Reference

### API Layer Pattern

```typescript
// lib/api.ts - Single source of truth for backend calls
export const api = {
  users: {
    list: () => fetch(`${API_BASE}/users`).then(r => r.json()),
    get: (id: string) => fetch(`${API_BASE}/users/${id}`).then(r => r.json()),
  },
};

// Components use: api.users.list()
// NOT: fetch('/api/users')
```

### Project Structure

```
src/
├── components/    # Reusable UI
├── pages/         # Route components
├── hooks/         # Custom hooks
├── lib/
│   ├── api.ts     # THE boundary
│   └── utils.ts   # Utilities
├── stores/        # Global state (if needed)
└── styles/        # Design tokens
```

### State Management Decision Tree

```
Single component?     → Local state
Parent + children?    → Lift to parent
Drilling > 2 levels?  → Context
Truly global?         → Global store
Server data?          → TanStack Query / SWR
```

### When to Add Complexity

| Pattern | Default | Use When |
|---------|---------|----------|
| Component library | Co-located | 3+ uses |
| Atomic design | Flat | 30+ components |
| Global state | Local | Auth, theme only |
| State library | Context | Complex logic + devtools |
