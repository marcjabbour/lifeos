"use client";

/**
 * FilterContext
 *
 * React context for managing filter state across the Intelligence Feed.
 * Provides:
 * - Filter state (categories, search query)
 * - Nova command submission
 * - Filter application and clearing
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { TagCategory } from "@/types/categories";
import { api } from "@/lib/api";

// Nova command response types (matching API)
interface NovaFilterResponse {
  type: "filter";
  filter: {
    categories: string[];
    searchQuery?: string;
  };
  message: string;
  confidence: number;
}

interface NovaQueryResponse {
  type: "query";
  answer: string;
  items: Array<{
    id: string;
    title: string;
    category: string;
    url?: string;
    source_type: string;
    created_at: string;
  }>;
}

interface NovaClearResponse {
  type: "clear";
  message: string;
}

type NovaCommandResponse =
  | NovaFilterResponse
  | NovaQueryResponse
  | NovaClearResponse;

// Query result for display
export interface QueryResult {
  answer: string;
  items: Array<{
    id: string;
    title: string;
    category: string;
    url?: string;
    source_type: string;
    created_at: string;
  }>;
}

// Context state
interface FilterState {
  categories: TagCategory[];
  searchQuery: string;
  isLoading: boolean;
  lastMessage: string | null;
  queryResult: QueryResult | null;
}

// Context actions
interface FilterActions {
  setCategories: (categories: TagCategory[]) => void;
  setSearchQuery: (query: string) => void;
  toggleCategory: (category: TagCategory) => void;
  clearFilters: () => void;
  submitCommand: (command: string) => Promise<void>;
  dismissQueryResult: () => void;
}

// Combined context type
type FilterContextType = FilterState & FilterActions;

// Create context with undefined default
const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Provider props
interface FilterProviderProps {
  children: ReactNode;
  initialCategories?: TagCategory[];
  initialSearchQuery?: string;
}

/**
 * FilterProvider component
 * Manages filter state and provides context to children
 */
export function FilterProvider({
  children,
  initialCategories = [],
  initialSearchQuery = "",
}: FilterProviderProps) {
  // State
  const [categories, setCategories] =
    useState<TagCategory[]>(initialCategories);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  // Toggle a single category
  const toggleCategory = useCallback((category: TagCategory) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
    setLastMessage(null);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setCategories([]);
    setSearchQuery("");
    setLastMessage("Showing all items");
    setQueryResult(null);
  }, []);

  // Dismiss query result modal
  const dismissQueryResult = useCallback(() => {
    setQueryResult(null);
  }, []);

  // Submit a natural language command to Nova
  const submitCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;

    setIsLoading(true);
    setLastMessage(null);
    setQueryResult(null);

    try {
      const data = await api.post<NovaCommandResponse>("/api/nova/command", {
        command,
      });

      switch (data.type) {
        case "filter":
          // Apply filter response
          setCategories(data.filter.categories as TagCategory[]);
          if (data.filter.searchQuery) {
            setSearchQuery(data.filter.searchQuery);
          }
          setLastMessage(data.message);
          break;

        case "clear":
          // Clear filters
          setCategories([]);
          setSearchQuery("");
          setLastMessage(data.message);
          break;

        case "query":
          // Show query results
          setQueryResult({
            answer: data.answer,
            items: data.items,
          });
          setLastMessage(null);
          break;
      }
    } catch (error) {
      console.error("Error submitting command:", error);
      setLastMessage("Sorry, I couldn't understand that. Try again?");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<FilterContextType>(
    () => ({
      categories,
      searchQuery,
      isLoading,
      lastMessage,
      queryResult,
      setCategories,
      setSearchQuery,
      toggleCategory,
      clearFilters,
      submitCommand,
      dismissQueryResult,
    }),
    [
      categories,
      searchQuery,
      isLoading,
      lastMessage,
      queryResult,
      toggleCategory,
      clearFilters,
      submitCommand,
      dismissQueryResult,
    ],
  );

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

/**
 * useFilter hook
 * Returns the filter context, throws if used outside provider
 */
export function useFilter(): FilterContextType {
  const context = useContext(FilterContext);

  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterProvider");
  }

  return context;
}

/**
 * useFilterState hook (subset - just state, no actions)
 * Useful for components that only need to read filter state
 */
export function useFilterState(): FilterState {
  const { categories, searchQuery, isLoading, lastMessage, queryResult } =
    useFilter();
  return { categories, searchQuery, isLoading, lastMessage, queryResult };
}

// Export context for advanced use cases
export { FilterContext };
