/**
 * LifeOS Query Tools
 *
 * MCP tools for searching and retrieving items from LifeOS.
 * Used by WhatsApp bot and Nova UI for querying saved content.
 */

import { z } from "zod";
import type {
  LifeOSApiClient,
  FeedItem,
  CategoryCount,
  NovaCommandResponse,
} from "../adapters/lifeos-api.js";

// Tool schemas
export const searchSchema = z.object({
  query: z
    .string()
    .describe("Search query - can be natural language or keywords"),
  categories: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by categories: food, tech, music, entertainment, fitness, travel, work, learning, finance, social",
    ),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum number of results to return"),
});

export const recentSchema = z.object({
  limit: z
    .number()
    .optional()
    .default(5)
    .describe("Number of recent items to retrieve"),
  categories: z.array(z.string()).optional().describe("Filter by categories"),
});

export const askNovaSchema = z.object({
  question: z
    .string()
    .describe(
      "A question about the user's saved content that requires reasoning",
    ),
});

export const categoriesSchema = z.object({});

export type SearchInput = z.infer<typeof searchSchema>;
export type RecentInput = z.infer<typeof recentSchema>;
export type AskNovaInput = z.infer<typeof askNovaSchema>;

export interface SearchResult {
  items: FeedItem[];
  total: number;
  query: string;
}

export interface RecentResult {
  items: FeedItem[];
}

export interface NovaAnswer {
  answer: string;
  items?: FeedItem[];
  type: string;
}

/**
 * Search for items using semantic and text search
 */
export async function searchItems(
  client: LifeOSApiClient,
  input: SearchInput,
): Promise<SearchResult> {
  const result = await client.searchItems(
    input.query,
    input.categories,
    input.limit || 10,
  );

  return {
    items: result.items,
    total: result.total,
    query: input.query,
  };
}

/**
 * Get recently saved items
 */
export async function getRecentItems(
  client: LifeOSApiClient,
  input: RecentInput,
): Promise<RecentResult> {
  const result = await client.getItems({
    categories: input.categories,
    limit: input.limit || 5,
  });

  return {
    items: result.items,
  };
}

/**
 * Ask Nova a complex question about saved content
 */
export async function askNova(
  client: LifeOSApiClient,
  input: AskNovaInput,
): Promise<NovaAnswer> {
  const response = await client.sendNovaCommand(input.question);

  return {
    answer:
      response.answer || "I couldn't find a specific answer to that question.",
    items: response.items,
    type: response.type,
  };
}

/**
 * Get categories with item counts
 */
export async function getCategories(
  client: LifeOSApiClient,
): Promise<CategoryCount[]> {
  return client.getCategories();
}

// Tool definitions for MCP registration
export const queryTools = [
  {
    name: "lifeos_query_search",
    description:
      "Search for items in LifeOS using natural language or keywords. Returns matching items with titles, descriptions, and categories.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query - can be natural language or keywords",
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description:
            "Filter by categories: food, tech, music, entertainment, fitness, travel, work, learning, finance, social",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "lifeos_query_recent",
    description:
      "Get the most recently saved items. Useful for 'what did I save today/recently' queries.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of items to return (default: 5)",
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Filter by categories",
        },
      },
      required: [],
    },
  },
  {
    name: "lifeos_query_ask_nova",
    description:
      "Ask Nova a complex question that requires reasoning about saved content. Use for questions like 'what was that restaurant someone recommended?' or 'summarize my saved articles about AI'.",
    inputSchema: {
      type: "object" as const,
      properties: {
        question: {
          type: "string",
          description: "A question about the user's saved content",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "lifeos_query_categories",
    description:
      "Get a list of all categories with item counts. Useful for understanding what the user has saved.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];
