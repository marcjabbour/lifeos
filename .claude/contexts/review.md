# Review Context

Load this context for: PR reviews, code quality checks, security reviews.

## Agent: code-reviewer

**Model:** Opus
**Responsibilities:** PR review with security-first mindset

**Review Focus Areas:**
1. **Security** - OWASP top 10, injection vulnerabilities, auth issues
2. **Performance** - N+1 queries, memory leaks, unnecessary re-renders
3. **Maintainability** - Code clarity, appropriate abstraction, test coverage
4. **Simplicity** - Catches over-engineering, unnecessary complexity

## Review Checklist

### Security
- [ ] No hardcoded secrets or credentials
- [ ] Input validation at system boundaries
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (proper escaping)
- [ ] Auth/authz properly enforced
- [ ] Sensitive data not logged

### Code Quality
- [ ] Single responsibility principle
- [ ] No dead code or commented-out code
- [ ] Error handling is appropriate (not excessive)
- [ ] No unnecessary abstractions
- [ ] Follows existing patterns in codebase

### Performance
- [ ] No N+1 query patterns
- [ ] Appropriate use of indexes (for DB changes)
- [ ] No memory leaks (event listeners cleaned up)
- [ ] Lazy loading where appropriate

### Tests
- [ ] Happy path covered
- [ ] Critical edge case covered
- [ ] Tests are focused and readable
- [ ] No testing implementation details

## PR Process

1. **Before creating PR:**
   - Tests pass locally
   - Build succeeds
   - Self-review completed

2. **PR description must include:**
   - What changed and why
   - How to test
   - Any migration steps

3. **After approval:**
   - Squash and merge to develop
   - Delete feature branch
   - Update TASKS.md

## Auto-Trigger

Invoke code-reviewer agent when:
- PR is ready for review
- User asks for code review
- Before merging significant changes
