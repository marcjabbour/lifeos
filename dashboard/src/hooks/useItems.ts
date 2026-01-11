"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, Item, ItemsFilter, ApiError } from "@/lib/api";

interface UseItemsOptions {
  initialFilters?: ItemsFilter;
  enabled?: boolean;
}

interface UseItemsReturn {
  items: Item[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setFilters: (filters: ItemsFilter) => void;
  filters: ItemsFilter;
}

export function useItems(options: UseItemsOptions = {}): UseItemsReturn {
  const { initialFilters = {}, enabled = true } = options;

  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ItemsFilter>(initialFilters);

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);

  const fetchItems = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.items.list(filters);
      if (mountedRef.current) {
        setItems(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof ApiError ? err : new Error("Failed to fetch items"),
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters, enabled]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateFilters = useCallback((newFilters: ItemsFilter) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return {
    items,
    isLoading,
    error,
    refetch: fetchItems,
    setFilters: updateFilters,
    filters,
  };
}

// ---------------------------------------------------------------------------
// Single Item Hook
// ---------------------------------------------------------------------------

interface UseItemReturn {
  item: Item | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useItem(id: string | null): UseItemReturn {
  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);

  const fetchItem = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      setItem(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.items.get(id);
      if (mountedRef.current) {
        setItem(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof ApiError ? err : new Error("Failed to fetch item"),
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    item,
    isLoading,
    error,
    refetch: fetchItem,
  };
}

// ---------------------------------------------------------------------------
// Search Hook
// ---------------------------------------------------------------------------

interface UseSearchReturn {
  results: Item[];
  isSearching: boolean;
  error: Error | null;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useSearch(): UseSearchReturn {
  const [results, setResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const data = await api.items.search(query);
      if (mountedRef.current) {
        setResults(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof ApiError ? err : new Error("Search failed"));
      }
    } finally {
      if (mountedRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    results,
    isSearching,
    error,
    search,
    clearResults,
  };
}
