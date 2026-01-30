/**
 * Structured logger for ADK Agent Service
 */

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

export function createAgentLogger(agentName: string) {
  return logger.child({ agent: agentName });
}

export function createToolLogger(toolName: string) {
  return logger.child({ tool: toolName });
}
