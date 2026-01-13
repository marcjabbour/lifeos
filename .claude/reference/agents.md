# Agents Reference

Full definitions of all available agents.

## Agent Overview

| Agent | Model | Primary Use |
|-------|-------|-------------|
| orchestrator | Opus | PRD → production coordination |
| backend-architect | Opus | API, database, auth |
| frontend-architect | Opus | Components, state, routing |
| infra-engineer | Opus | DevOps, CI/CD, deployment |
| debugger | Opus | Error diagnosis, debugging |
| ai-engineer | Opus | LLM, RAG, agents |
| code-reviewer | Opus | PR reviews |
| project-manager | Haiku | Task tracking |
| workflow-advisor | Haiku | Workflow optimization |

## Detailed Responsibilities

### orchestrator
**Model:** Opus
**Entry point for all new projects/features.**
- Analyzes PRDs and requirements
- Coordinates architecture decisions
- Manages parallel workstreams
- Delegates to specialist agents
- Ensures plan-first mandate is followed

### backend-architect
**Model:** Opus
- API design and implementation
- Database schema design
- Authentication/authorization
- Backend structure decisions
- Clean separation principles

### frontend-architect
**Model:** Opus
- Component structure
- State management patterns
- Routing decisions
- Frontend organization
- UI implementation

### infra-engineer
**Model:** Opus
- Docker configuration
- CI/CD pipelines
- Cloud deployment
- Environment management
- Monitoring/observability

### debugger
**Model:** Opus
- Stack trace analysis
- Log parsing
- Systematic diagnosis
- Error recovery
- Build/test failure resolution

### ai-engineer
**Model:** Opus
- LLM integration
- RAG systems
- Vector search
- Agent orchestration
- Prompt engineering
- AI infrastructure

### code-reviewer
**Model:** Opus
- Security-first PR reviews
- Performance analysis
- Maintainability assessment
- Simplicity enforcement

### project-manager
**Model:** Haiku (fast, cost-effective)
- TASKS.md maintenance
- Progress tracking
- Task breakdown
- Status updates

### workflow-advisor
**Model:** Haiku
- Pattern analysis
- Workflow improvements
- Friction point identification
- Process optimization

## Auto-Trigger Rules

| Context | Agent |
|---------|-------|
| New project from PRD | orchestrator |
| API, database, auth design | backend-architect |
| Component structure, state, routing | frontend-architect |
| Deployment, CI/CD, Docker | infra-engineer |
| Build/test failures, runtime errors | debugger |
| LLM/AI/RAG/vector/agent work | ai-engineer |
| PR ready for review | code-reviewer |
| Task tracking needed | project-manager |
| Workflow optimization | workflow-advisor |
