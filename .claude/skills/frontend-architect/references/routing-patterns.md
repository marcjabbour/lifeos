# Routing Patterns Reference

## Route Structure

### Page Types
```
/                     # Landing/Home
/dashboard            # Authenticated home
/login, /signup       # Auth pages
/settings             # User settings
/users                # List page
/users/:id            # Detail page
/users/:id/edit       # Edit page
/users/new            # Create page
```

### Nested Routes
```
/dashboard
/dashboard/analytics
/dashboard/settings

/projects/:projectId
/projects/:projectId/tasks
/projects/:projectId/tasks/:taskId
/projects/:projectId/settings
```

## File-Based Routing (Next.js, Nuxt, SvelteKit)

### Next.js App Router
```
app/
├── page.tsx                    # /
├── layout.tsx                  # Root layout
├── dashboard/
│   ├── page.tsx                # /dashboard
│   ├── layout.tsx              # Dashboard layout
│   └── settings/
│       └── page.tsx            # /dashboard/settings
├── users/
│   ├── page.tsx                # /users
│   └── [id]/
│       ├── page.tsx            # /users/:id
│       └── edit/
│           └── page.tsx        # /users/:id/edit
└── api/
    └── users/
        └── route.ts            # API route
```

### Dynamic Segments
```
[id]           # Single param: /users/123
[...slug]      # Catch-all: /docs/a/b/c → ['a', 'b', 'c']
[[...slug]]    # Optional catch-all: /docs or /docs/a/b
```

### Route Groups (Next.js)
```
app/
├── (marketing)/
│   ├── page.tsx         # / (marketing home)
│   └── about/
│       └── page.tsx     # /about
├── (app)/
│   ├── layout.tsx       # Shared app layout
│   └── dashboard/
│       └── page.tsx     # /dashboard
```

## Centralized Routing (React Router, Vue Router)

### React Router
```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'users', element: <UserList /> },
      { path: 'users/:id', element: <UserDetail /> },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

### Vue Router
```typescript
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        { path: '', component: Home },
        { path: 'users', component: UserList },
        { path: 'users/:id', component: UserDetail },
      ],
    },
    { path: '/login', component: Login },
  ],
});
```

## Layouts

### Nested Layouts
```tsx
// Root layout (always rendered)
function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}

// Dashboard layout (rendered for /dashboard/*)
function DashboardLayout({ children }) {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

### Layout Pattern (Manual)
```tsx
function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
```

## Route Guards / Protection

### Auth Guard (React)
```tsx
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Usage
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Auth Guard (Vue)
```typescript
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

// Route definition
{ path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } }
```

### Role-Based Guards
```tsx
function AdminRoute({ children }) {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
```

## Navigation

### Programmatic Navigation
```tsx
// React Router
const navigate = useNavigate();
navigate('/users');
navigate('/users/123');
navigate(-1); // Go back

// Vue Router
const router = useRouter();
router.push('/users');
router.push({ name: 'user', params: { id: '123' } });
router.back();
```

### Link Components
```tsx
// React Router
<Link to="/users">Users</Link>
<NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
  Users
</NavLink>

// Vue Router
<RouterLink to="/users">Users</RouterLink>
<RouterLink :to="{ name: 'user', params: { id: user.id } }">
  {{ user.name }}
</RouterLink>
```

## Query Parameters

### Reading Query Params
```tsx
// React Router
const [searchParams, setSearchParams] = useSearchParams();
const page = searchParams.get('page') ?? '1';
const filter = searchParams.get('filter');

// Update
setSearchParams({ page: '2', filter: 'active' });
```

### URL State Pattern
```tsx
function UserList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    page: parseInt(searchParams.get('page') ?? '1'),
    status: searchParams.get('status') ?? 'all',
    search: searchParams.get('q') ?? '',
  };

  const updateFilters = (updates) => {
    setSearchParams({ ...Object.fromEntries(searchParams), ...updates });
  };

  // URL: /users?page=2&status=active&q=john
}
```

## Code Splitting / Lazy Loading

### React
```tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### Vue
```typescript
const routes = [
  {
    path: '/dashboard',
    component: () => import('./pages/Dashboard.vue'),
  },
  {
    path: '/settings',
    component: () => import('./pages/Settings.vue'),
  },
];
```

## Error Handling

### Error Boundaries (React)
```tsx
// Next.js App Router
// app/dashboard/error.tsx
'use client';

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### Not Found Pages
```tsx
// Next.js: app/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <Link href="/">Go home</Link>
    </div>
  );
}

// React Router
<Route path="*" element={<NotFound />} />
```

## Loading States

### Next.js
```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />;
}
```

### React Router with Suspense
```tsx
<Route
  path="/dashboard"
  element={
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  }
/>
```
