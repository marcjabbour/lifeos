/**
 * LifeOS MCP Server Entry Point
 *
 * Run with: npx tsx src/index.ts
 * Or after build: node dist/index.js
 */

import { LifeOSMcpServer } from "./server.js";

async function main() {
  const server = new LifeOSMcpServer();
  await server.start();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
