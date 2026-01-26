/**
 * LifeOS MCP Server
 *
 * Main server setup that registers all tools and handles MCP protocol.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { LifeOSApiClient, createClientFromEnv } from "./adapters/lifeos-api.js";
import {
  ingestionTools,
  ingestContent,
  ingestImage,
  ingestContentSchema,
  ingestImageSchema,
} from "./tools/ingestion.js";
import {
  queryTools,
  searchItems,
  getRecentItems,
  askNova,
  getCategories,
  searchSchema,
  recentSchema,
  askNovaSchema,
} from "./tools/query.js";
import {
  uiControlTools,
  applyFilter,
  clearFilters,
  applyFilterSchema,
} from "./tools/ui-control.js";

export class LifeOSMcpServer {
  private server: Server;
  private client: LifeOSApiClient;

  constructor(client?: LifeOSApiClient) {
    this.client = client || createClientFromEnv();
    this.server = new Server(
      {
        name: "lifeos-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [...ingestionTools, ...queryTools, ...uiControlTools],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Ingestion tools
          case "lifeos_ingest_content": {
            const input = ingestContentSchema.parse(args);
            const result = await ingestContent(this.client, input);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "lifeos_ingest_image": {
            const input = ingestImageSchema.parse(args);
            const result = await ingestImage(this.client, input);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          // Query tools
          case "lifeos_query_search": {
            const input = searchSchema.parse(args);
            const result = await searchItems(this.client, input);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "lifeos_query_recent": {
            const input = recentSchema.parse(args);
            const result = await getRecentItems(this.client, input);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "lifeos_query_ask_nova": {
            const input = askNovaSchema.parse(args);
            const result = await askNova(this.client, input);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "lifeos_query_categories": {
            const result = await getCategories(this.client);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          // UI control tools
          case "lifeos_ui_apply_filter": {
            const input = applyFilterSchema.parse(args);
            const result = await applyFilter(this.client, input);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "lifeos_ui_clear_filters": {
            const result = await clearFilters(this.client);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("LifeOS MCP Server running on stdio");
  }
}
