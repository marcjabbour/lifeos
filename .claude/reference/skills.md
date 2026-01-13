# Skills Reference

Full list of available skills and when to use them.

## Skills Overview

| Skill | Purpose |
|-------|---------|
| /design-principles | UI component design system |
| /data-viz | Charts, dashboards, analytics |
| /repo-manager | Git/GitHub operations |
| /backend-architect | Backend reference patterns |
| /frontend-architect | Frontend reference patterns |
| /code-cleanup | Post-feature code simplification |
| /style-extractor | Extract styles from screenshots/URLs |
| /pdf-processor | Process PDF documents |
| /browser-testing | E2E testing with Playwright |
| /skill-creator | Create new skills |
| /mcp-builder | Build MCP servers |

## Detailed Descriptions

### /design-principles
Enforce a precise, minimal design system inspired by Linear, Notion, and Stripe.
- Use when building dashboards, admin interfaces, or any UI
- Every pixel matters - clean, modern, minimalist

### /data-viz
Data visualization and dashboard design patterns.
- Chart types and when to use them
- Dashboard layouts
- Data transformation patterns
- Library selection guidance

### /repo-manager
Git and GitHub repository operations.
- Creating repos and branches
- Managing PRs
- Git workflows

### /backend-architect
Backend architecture reference patterns.
- API design patterns
- Database patterns
- Auth patterns
- *Note: For active decisions, use the backend-architect agent*

### /frontend-architect
Frontend architecture reference patterns.
- Component patterns
- State management patterns
- Routing patterns
- *Note: For active decisions, use the frontend-architect agent*

### /code-cleanup
Code simplification and cleanup guidance.
- Identify dead code
- Remove unnecessary abstractions
- Enforce DRY without over-engineering
- *Use after features are working*

### /style-extractor
Extract comprehensive style guides from screenshots OR live websites.
- Analyzes colors, typography, spacing, shadows
- Produces CSS custom properties
- Component pattern identification

### /pdf-processor
Process and extract content from PDF documents.
- PRDs and specifications
- Documentation
- Contracts
- Structured data extraction

### /browser-testing
Browser automation and E2E testing with Playwright MCP.
- Visual testing
- UI verification
- Screenshot capture
- User flow validation
- Web scraping

### /skill-creator
Guide for creating effective skills.
- Skill structure
- Best practices
- Tool integrations

### /mcp-builder
Guide for building MCP servers.
- Python (FastMCP)
- Node/TypeScript (MCP SDK)
- API integrations

## Auto-Trigger Rules

| Context | Skill |
|---------|-------|
| Building UI components | /design-principles |
| Charts, dashboards, analytics | /data-viz |
| Git/GitHub operations | /repo-manager |
| UI screenshot provided | /style-extractor |
| URL for style extraction | /style-extractor |
| PDF document provided | /pdf-processor |
| Browser testing/scraping | /browser-testing |
| After feature complete | /code-cleanup |
