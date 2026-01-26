/**
 * Search Services
 *
 * Exports Tavily search client and LLM-driven enrichment utilities.
 */

export {
  searchWithTavily,
  isTavilyConfigured,
  type TavilySearchOptions,
  type TavilySearchResult,
  type TavilyResponse,
} from "./tavily-client";

export {
  enrichContent,
  generateSearchQuery,
  synthesizeTavilyResults,
  formatEnrichedResponse,
  type SearchContext,
  type EnrichedData,
} from "./enrichment";
