# CLAUDE.md

## Quick Start

Tell me what context to load, or I'll ask based on your task:

| Context | Load With | Use For |
|---------|-----------|---------|
| **Planning** | "Load planning context" | Task breakdown, TASKS.md, documentation |
| **Development** | "Load development context" | Building features, code quality, git workflow |
| **Review** | "Load review context" | PR reviews, code quality checks |
| **AI/LLM** | "Load AI context" | LLM integration, RAG, agents, vectors |
| **Infrastructure** | "Load infra context" | CI/CD, Docker, deployment, cloud |

Or say "Load all contexts" for full capabilities (higher token usage).

## Core Rules (Always Active)

**Transparency:** Always announce when invoking agents, skills, or MCP servers.

**Available Integrations:**
- **GitHub MCP** - Repo ops, PRs, issues
- **Playwright MCP** - Browser automation, testing
- **Context7 MCP** - Library documentation lookup
- **Memory MCP** - Cross-session persistence

**Available Commands:**
- `/lint [files]` - Run linting
- `/find-mcp <use-case>` - Find MCP servers
- `/review-workflow` - Workflow analysis

## Context Files

Detailed instructions live in `.claude/contexts/`:
- `planning.md` - Project manager agent, TASKS.md format, documentation requirements
- `development.md` - Architects, git workflow, code standards, testing
- `review.md` - Code reviewer agent, PR process
- `ai-work.md` - AI engineer agent, LLM patterns
- `infrastructure.md` - Infra engineer agent, DevOps patterns

Reference docs in `.claude/reference/`:
- `agents.md` - Full agent definitions and responsibilities
- `skills.md` - Available skills and auto-triggers
- `design-philosophy.md` - MVP-first, simplicity guardrails, testing philosophy
