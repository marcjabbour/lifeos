# Contributing to LifeOS

Thank you for your interest in contributing to LifeOS! This guide will help you get started.

## Code of Conduct

Be respectful, inclusive, and constructive. We're building something meaningful together.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- Supabase CLI (optional, for database work)

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/lifeos.git
   cd lifeos
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy environment file:
   ```bash
   cp .env.example .env.local
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `refactor/what-changed` - Code refactoring
- `test/what-testing` - Test additions

### Commit Messages

Follow conventional commits:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

Examples:
```
feat(chat): add typing indicator for Nova responses
fix(auth): resolve session timeout on mobile browsers
docs(api): add rate limiting documentation
```

### Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests: `npm test`
4. Run linting: `npm run lint`
5. Run type check: `npm run type-check`
6. Push your branch
7. Open a PR against `develop`

### PR Requirements

- [ ] Tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Documentation updated (if needed)
- [ ] PR description explains changes
- [ ] Linked to issue (if applicable)

## Code Standards

### TypeScript

- Use strict mode
- Prefer `interface` over `type` for object shapes
- Export types from dedicated files
- Use meaningful variable names

```typescript
// Good
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

// Avoid
type User = {
  id: string;
  e: string;
  n: string;
};
```

### React Components

- Use functional components with hooks
- Prefer composition over inheritance
- Keep components focused and small
- Use semantic HTML

```tsx
// Good - focused component
export function UserAvatar({ user }: { user: User }) {
  return (
    <div className="avatar">
      <img src={user.avatarUrl} alt={user.displayName} />
    </div>
  );
}

// Avoid - doing too much
export function UserCard({ user, posts, settings, onUpdate, onDelete }) {
  // Too many responsibilities
}
```

### Styling

- Use Tailwind CSS utility classes
- Follow the design system in `STYLE-GUIDE.md`
- Use CSS variables for theming
- Mobile-first responsive design

### File Organization

```
src/
  app/           # Next.js app router pages
  components/    # React components
    ui/          # Reusable UI components
    features/    # Feature-specific components
  lib/           # Utilities and helpers
  hooks/         # Custom React hooks
  types/         # TypeScript types
```

## Testing

### Unit Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

### E2E Tests

```bash
npm run test:e2e           # Run E2E tests
npm run test:e2e -- --ui   # Run with UI
```

### Writing Tests

- Test behavior, not implementation
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
test('user can submit a new item', async () => {
  // Arrange
  const user = await createTestUser();

  // Act
  await submitItem(user, { content: 'https://example.com' });

  // Assert
  const items = await getUserItems(user);
  expect(items).toHaveLength(1);
});
```

## Documentation

- Update README if changing setup process
- Add JSDoc comments for complex functions
- Update API.md for API changes
- Add inline comments for non-obvious logic

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Browser/environment info

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative solutions considered

## Questions?

- Check existing issues and discussions
- Read the documentation in `/docs`
- Ask in community Discord

## License

By contributing, you agree that your contributions will be licensed under the project's MIT license.
