---
description: Find and configure MCP servers for a use case
argument-hint: <use-case>
allowed-tools: mcp__context7__*, Read, Write, Edit
---

Find MCP servers from mcpservers.org matching: $ARGUMENTS

## Steps

1. **Search**: Use context7 to search mcpservers.org for "$ARGUMENTS"
2. **Present**: Show matching servers with name, package, description, required config
3. **Ask**: Which servers to install
4. **Configure**: Add approved servers to .mcp.json
5. **Remind**: User must restart Claude Code to load new servers
