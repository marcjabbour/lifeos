# Component Patterns Reference

## Component Design Principles

### Single Responsibility
Each component should do one thing well:
```tsx
// Bad: Component does too much
function UserDashboard() {
  // fetches data, manages state, renders list, handles forms...
}

// Good: Composed of focused components
function UserDashboard() {
  return (
    <DashboardLayout>
      <UserStats />
      <UserActivityList />
      <QuickActions />
    </DashboardLayout>
  );
}
```

### Props Interface
Keep props minimal and obvious:
```tsx
// Bad: Too many props, unclear purpose
interface ButtonProps {
  text: string;
  type: string;
  size: string;
  disabled: boolean;
  loading: boolean;
  icon: ReactNode;
  iconPosition: 'left' | 'right';
  // ... 10 more props
}

// Good: Essential props, sensible defaults
interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}
```

## Composition Patterns

### Children Composition
```tsx
function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

// Usage
<Card>
  <h2>Title</h2>
  <p>Content</p>
</Card>
```

### Compound Components
For components that belong together:
```tsx
function Tabs({ children }) { /* ... */ }
Tabs.List = function TabList({ children }) { /* ... */ };
Tabs.Tab = function Tab({ children }) { /* ... */ };
Tabs.Panel = function TabPanel({ children }) { /* ... */ };

// Usage
<Tabs defaultValue="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
    <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
  <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
</Tabs>
```

### Render Props (When Needed)
For sharing stateful logic with flexible rendering:
```tsx
function Toggle({ children }) {
  const [on, setOn] = useState(false);
  return children({ on, toggle: () => setOn(!on) });
}

// Usage
<Toggle>
  {({ on, toggle }) => (
    <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>
  )}
</Toggle>
```

## File Organization

### Co-location (Recommended for Most Projects)
```
components/
├── Button/
│   ├── Button.tsx
│   ├── Button.module.css
│   └── index.ts
├── Card/
│   ├── Card.tsx
│   └── index.ts
```

### Single File (For Simple Components)
```
components/
├── Button.tsx
├── Card.tsx
├── Badge.tsx
```

### Index Exports
```typescript
// components/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button';

// components/index.ts
export * from './Button';
export * from './Card';
```

## Naming Conventions

### Components
- PascalCase: `UserCard`, `SettingsModal`
- Descriptive: prefer `UserProfileHeader` over `Header`

### Props
- camelCase: `onClick`, `isDisabled`, `userName`
- Boolean props: `is*`, `has*`, `can*` prefix

### Event Handlers
```tsx
// Props: on* prefix
interface Props {
  onClick?: () => void;
  onSubmit?: (data: FormData) => void;
}

// Internal handlers: handle* prefix
function Component({ onClick }) {
  const handleClick = () => {
    // internal logic
    onClick?.();
  };
}
```

## State Colocation

Keep state as close to where it's used as possible:
```tsx
// Bad: State lifted unnecessarily high
function App() {
  const [searchQuery, setSearchQuery] = useState('');
  return <SearchPage query={searchQuery} setQuery={setSearchQuery} />;
}

// Good: State in the component that uses it
function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  return <SearchInput value={searchQuery} onChange={setSearchQuery} />;
}
```

## Form Components

### Controlled Inputs
```tsx
function Input({ value, onChange, ...props }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
}
```

### Form Container Pattern
```tsx
function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input value={email} onChange={setEmail} placeholder="Email" />
      <Input value={password} onChange={setPassword} type="password" />
      <Button type="submit">Login</Button>
    </form>
  );
}
```

## List Rendering

### Key Usage
```tsx
// Bad: Using index as key
{items.map((item, index) => <Item key={index} {...item} />)}

// Good: Using stable, unique ID
{items.map((item) => <Item key={item.id} {...item} />)}
```

### Empty States
```tsx
function UserList({ users }) {
  if (users.length === 0) {
    return <EmptyState message="No users found" />;
  }

  return (
    <ul>
      {users.map((user) => <UserCard key={user.id} user={user} />)}
    </ul>
  );
}
```

## Performance Patterns

### Memoization (Use Sparingly)
```tsx
// Only memoize when:
// 1. Component receives complex objects/arrays as props
// 2. Component is expensive to render
// 3. Parent re-renders frequently

const MemoizedList = memo(function ExpensiveList({ items }) {
  return items.map(item => <ComplexItem key={item.id} {...item} />);
});
```

### Callback Memoization
```tsx
// Only when passing to memoized children or in dependency arrays
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```
