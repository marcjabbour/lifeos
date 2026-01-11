# State Management Patterns Reference

## State Categories

### 1. Local UI State
Exists within a single component:
- Form input values
- Toggle/accordion open state
- Hover/focus state
- Modal open/close

**Solution:** `useState` / `ref`

### 2. Lifted State
Shared between parent and children:
- Selected item in a list
- Filter/sort preferences
- Accordion group (only one open)

**Solution:** Lift to common ancestor, pass via props

### 3. Global UI State
Used across many unrelated components:
- Theme (light/dark)
- Sidebar collapsed state
- Toast notifications

**Solution:** Context (React) / Provide-Inject (Vue) / Svelte stores

### 4. Server State
Data from APIs:
- User data
- List data
- Dashboard metrics

**Solution:** TanStack Query / SWR / Apollo Client

### 5. URL State
Should survive refresh, be shareable:
- Current page/filters
- Search query
- Selected tab

**Solution:** URL params / query strings

## React Patterns

### Local State
```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Lifted State
```tsx
function Parent() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <List items={items} selected={selected} onSelect={setSelected} />
      <Detail itemId={selected} />
    </>
  );
}
```

### Context (Sparingly)
```tsx
// Create context
const ThemeContext = createContext<'light' | 'dark'>('light');

// Provider at app level
function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return (
    <ThemeContext.Provider value={theme}>
      <AppContent />
    </ThemeContext.Provider>
  );
}

// Consume anywhere
function Button() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}
```

### Zustand (Recommended for Global State)
```tsx
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

// Usage
function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  // ...
}
```

### TanStack Query (Server State)
```tsx
function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <List items={data} />;
}
```

## Vue Patterns

### Local State (Composition API)
```vue
<script setup>
import { ref } from 'vue';

const count = ref(0);
const increment = () => count.value++;
</script>

<template>
  <button @click="increment">{{ count }}</button>
</template>
```

### Pinia (Global State)
```typescript
// stores/auth.ts
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
  }),
  actions: {
    login(user: User) {
      this.user = user;
    },
    logout() {
      this.user = null;
    },
  },
});

// Usage in component
const authStore = useAuthStore();
authStore.login(userData);
```

### Provide/Inject (Scoped Global)
```vue
<!-- Parent.vue -->
<script setup>
import { provide, ref } from 'vue';

const theme = ref('light');
provide('theme', theme);
</script>

<!-- DeepChild.vue -->
<script setup>
import { inject } from 'vue';

const theme = inject('theme');
</script>
```

## Svelte Patterns

### Local State
```svelte
<script>
  let count = 0;
</script>

<button on:click={() => count++}>{count}</button>
```

### Stores (Global State)
```typescript
// stores/auth.ts
import { writable } from 'svelte/store';

export const user = writable<User | null>(null);

// Usage
import { user } from './stores/auth';

// Subscribe
$user // auto-subscription in Svelte files

// Update
user.set(userData);
user.update(u => ({ ...u, name: 'New Name' }));
```

## Anti-Patterns

### Don't: Global State for Form Data
```tsx
// Bad: Form state in global store
const useFormStore = create((set) => ({
  email: '',
  password: '',
  setEmail: (email) => set({ email }),
}));

// Good: Local state in form component
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
}
```

### Don't: Derived State as Separate State
```tsx
// Bad: Storing derived value
const [items, setItems] = useState([]);
const [filteredItems, setFilteredItems] = useState([]);

useEffect(() => {
  setFilteredItems(items.filter(i => i.active));
}, [items]);

// Good: Compute on render
const [items, setItems] = useState([]);
const filteredItems = items.filter(i => i.active);

// Or memoize if expensive
const filteredItems = useMemo(
  () => items.filter(i => i.active),
  [items]
);
```

### Don't: Over-fetching with Multiple useEffects
```tsx
// Bad: Separate effects for related data
useEffect(() => { fetchUser(); }, []);
useEffect(() => { fetchPosts(); }, []);
useEffect(() => { fetchComments(); }, []);

// Good: Single data fetching solution
const { data } = useQuery({
  queryKey: ['dashboard'],
  queryFn: fetchDashboardData,
});
```

## State Location Decision Tree

```
Start
  │
  ├─ Is it URL-worthy (shareable, bookmarkable)?
  │    └─ Yes → URL State (query params, path)
  │
  ├─ Is it server data?
  │    └─ Yes → Server State Library (TanStack Query, SWR)
  │
  ├─ Is it used in only one component?
  │    └─ Yes → Local State (useState, ref)
  │
  ├─ Is it shared between parent and direct children?
  │    └─ Yes → Lifted State (pass via props)
  │
  ├─ Is prop drilling > 2 levels?
  │    └─ Yes → Context / Provide-Inject
  │
  └─ Is it truly global (auth, theme, cart)?
       └─ Yes → Global Store (Zustand, Pinia, Svelte stores)
```
