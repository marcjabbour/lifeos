/**
 * LifeOS UI Control Tools
 *
 * MCP tools for controlling the LifeOS Intelligence Feed UI.
 * Used by Nova to apply filters and navigate the feed.
 */

import { z } from "zod";
import type { LifeOSApiClient } from "../adapters/lifeos-api.js";

// Tool schemas
export const applyFilterSchema = z.object({
  categories: z
    .array(z.string())
    .optional()
    .describe(
      "Categories to filter by: food, tech, music, entertainment, fitness, travel, work, learning, finance, social",
    ),
  searchQuery: z.string().optional().describe("Text search query to apply"),
});

export const clearFiltersSchema = z.object({});

export type ApplyFilterInput = z.infer<typeof applyFilterSchema>;

export interface FilterResult {
  success: boolean;
  applied: {
    categories: string[];
    searchQuery?: string;
  };
}

/**
 * Apply a filter to the Intelligence Feed UI
 */
export async function applyFilter(
  client: LifeOSApiClient,
  input: ApplyFilterInput,
): Promise<FilterResult> {
  const result = await client.applyFilter({
    categories: input.categories,
    searchQuery: input.searchQuery,
  });

  return {
    success: result.success,
    applied: {
      categories: input.categories || [],
      searchQuery: input.searchQuery,
    },
  };
}

/**
 * Clear all active filters from the Intelligence Feed
 */
export async function clearFilters(
  client: LifeOSApiClient,
): Promise<FilterResult> {
  const result = await client.applyFilter({
    categories: [],
    searchQuery: undefined,
  });

  return {
    success: result.success,
    applied: {
      categories: [],
      searchQuery: undefined,
    },
  };
}

// Tool definitions for MCP registration
export const uiControlTools = [
  {
    name: "lifeos_ui_apply_filter",
    description:
      "Apply a filter to the Intelligence Feed. Use when the user wants to see specific categories or search for something in the UI.",
    inputSchema: {
      type: "object" as const,
      properties: {
        categories: {
          type: "array",
          items: { type: "string" },
          description:
            "Categories to filter by: food, tech, music, entertainment, fitness, travel, work, learning, finance, social",
        },
        searchQuery: {
          type: "string",
          description: "Text search query to apply",
        },
      },
      required: [],
    },
  },
  {
    name: "lifeos_ui_clear_filters",
    description:
      "Clear all active filters from the Intelligence Feed. Use when the user wants to see all items again.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];
