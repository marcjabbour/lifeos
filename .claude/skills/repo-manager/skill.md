---
name: repo-manager
description: Git and GitHub repository operations. Use for creating repos, managing branches, creating PRs, and other git/GitHub workflows. Offloads repository operations from the orchestrator.
---

# Repo Manager

Handles all Git and GitHub operations. Use this skill for repository setup, branch management, and PR workflows.

## Capabilities

### Repository Operations
- Create new GitHub repositories
- Clone and initialize local repos
- Configure remotes
- Set up .gitignore and initial files

### Branch Management
- Create feature branches
- Switch between branches
- Delete stale branches
- Manage branch protection (via GitHub)

### Pull Request Workflow
- Create PRs with proper descriptions
- Link PRs to issues
- Request reviews
- Merge PRs

## Common Workflows

### Create New Repository

```bash
# 1. Create on GitHub
mcp__github__create_repository
  - name: project-name
  - description: "Project description"
  - private: true

# 2. Initialize locally
mkdir project-name && cd project-name
git init
git remote add origin https://github.com/user/project-name.git

# 3. Initial commit
git add .
git commit -m "Initial project skeleton"
git push -u origin main
```

### Feature Branch Workflow

```bash
# 1. Create branch from develop
git checkout develop
git pull origin develop
git checkout -b feat/feature-name

# 2. Work on feature...
git add .
git commit -m "feat: add feature description"

# 3. Push and create PR
git push -u origin feat/feature-name

mcp__github__create_pull_request
  - head: feat/feature-name
  - base: develop
  - title: "feat: Feature description"
  - body: "## Summary\n- Change 1\n- Change 2"
```

### Create Feature Branches for Project

```bash
# Create multiple feature branches from develop
mcp__github__create_branch
  - branch: feature/backend/auth
  - from: develop

mcp__github__create_branch
  - branch: feature/backend/api
  - from: develop

mcp__github__create_branch
  - branch: feature/frontend/components
  - from: develop

mcp__github__create_branch
  - branch: feature/frontend/pages
  - from: develop
```

## Branch Naming Convention

```
feature/<area>/<name>
  area: backend, frontend, infra, docs
  name: descriptive-slug

Examples:
  feature/backend/user-auth
  feature/frontend/dashboard-ui
  feature/infra/docker-setup
  fix/api/null-pointer
  chore/deps/update-packages
```

## PR Description Template

```markdown
## Summary
- [Brief description of changes]

## Changes
- [Specific change 1]
- [Specific change 2]

## Testing
- [ ] Tests pass locally
- [ ] Manual testing completed

## Related
- Closes #[issue-number]
```

## MCP Tools Reference

| Action | Tool |
|--------|------|
| Create repo | `mcp__github__create_repository` |
| Push files | `mcp__github__push_files` |
| Create branch | `mcp__github__create_branch` |
| Create PR | `mcp__github__create_pull_request` |
| Merge PR | `mcp__github__merge_pull_request` |
| List PRs | `mcp__github__list_pull_requests` |
| Get PR details | `mcp__github__get_pull_request` |
| List issues | `mcp__github__list_issues` |
| Create issue | `mcp__github__create_issue` |

## Guardrails

### Do
- Always create branches from `develop`, not `main`
- Use conventional commit messages (`feat:`, `fix:`, `chore:`)
- Include meaningful PR descriptions
- Link PRs to related issues

### Don't
- Don't push directly to `main`
- Don't force push to shared branches
- Don't merge without passing CI
- Don't create empty commits
