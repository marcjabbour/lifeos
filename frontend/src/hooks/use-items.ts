"use client";

import { useState, useCallback, useEffect } from "react";
import { getSupabase } from "@/lib/core/database/client";
import { api, type ApiError } from "@/lib/api";
import type { Item, UpdateItemRequest } from "@/types/database";
import type { TagCategory } from "@/types/categories";

export interface UseItemsOptions {
  categories?: TagCategory[];
  searchQuery?: string;
  limit?: number;
}

export interface UseItemsReturn {
  items: Item[];
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  removeItem: (itemId: string) => void;
  revertRemove: (itemId: string, item: Item) => void;
  updateItem: (itemId: string, updates: UpdateItemRequest) => Promise<Item>;
  getItemById: (itemId: string) => Item | undefined;
}

const DEFAULT_LIMIT = 20;

export function useItems(options: UseItemsOptions = {}): UseItemsReturn {
  const { categories = [], searchQuery = "", limit = DEFAULT_LIMIT } = options;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  // Stable category string for dependency tracking
  const categoriesKey = categories.join(",");

  const fetchItems = useCallback(
    async (isLoadMore = false, currentCursor: string | null = null) => {
      if (isLoadMore) {
        setLoading(true);
      } else {
        setInitialLoading(true);
      }
      setError(null);

      try {
        const supabase = getSupabase();

        // Check if user is authenticated
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setError("Not authenticated");
          setItems([]);
          setInitialLoading(false);
          setLoading(false);
          return;
        }

        // Build query
        let query = supabase
          .from("items")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_archived", false)
          .order("created_at", { ascending: false })
          .limit(limit + 1); // Fetch one extra to check if there are more

        // Apply cursor for pagination (only when loading more)
        if (isLoadMore && currentCursor) {
          query = query.lt("created_at", currentCursor);
        }

        // Apply category filter
        if (categories.length > 0) {
          query = query.in("category", categories);
        }

        // Apply search filter
        if (searchQuery.trim()) {
          query = query.or(
            `title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`,
          );
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          throw new Error(queryError.message);
        }

        const fetchedItems = data as Item[];
        const hasMoreItems = fetchedItems.length > limit;
        const resultItems = hasMoreItems
          ? fetchedItems.slice(0, limit)
          : fetchedItems;

        // Update cursor for next page
        const nextCursor = hasMoreItems
          ? resultItems[resultItems.length - 1]?.created_at
          : null;

        if (isLoadMore) {
          // Deduplicate when loading more
          setItems((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = resultItems.filter(
              (item) => !existingIds.has(item.id),
            );
            return [...prev, ...newItems];
          });
        } else {
          setItems(resultItems);
        }

        setCursor(nextCursor);
        setHasMore(hasMoreItems);
      } catch (err) {
        console.error("Failed to fetch items:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch items");
      } finally {
        setInitialLoading(false);
        setLoading(false);
      }
    },
    [categoriesKey, searchQuery, limit],
  );

  // Initial fetch and refetch when filters change
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    fetchItems(false, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesKey, searchQuery, limit]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await fetchItems(true, cursor);
  }, [loading, hasMore, fetchItems, cursor]);

  const refetch = useCallback(async () => {
    setCursor(null);
    setHasMore(true);
    await fetchItems(false, null);
  }, [fetchItems]);

  // Optimistically remove an item from the local state
  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // Revert a removed item back into the list (used when delete fails)
  const revertRemove = useCallback((itemId: string, item: Item) => {
    setItems((prev) => {
      // Check if item already exists (to avoid duplicates)
      if (prev.some((i) => i.id === itemId)) {
        return prev;
      }
      // Insert item at the correct position based on created_at (descending order)
      const insertIndex = prev.findIndex(
        (i) => new Date(i.created_at) < new Date(item.created_at),
      );
      if (insertIndex === -1) {
        // Item is older than all items, add to end
        return [...prev, item];
      }
      // Insert at the correct position
      const newItems = [...prev];
      newItems.splice(insertIndex, 0, item);
      return newItems;
    });
  }, []);

  // Update an item with optimistic update and revert on error
  const updateItem = useCallback(
    async (itemId: string, updates: UpdateItemRequest): Promise<Item> => {
      // Find the original item for potential revert
      const originalItem = items.find((i) => i.id === itemId);

      if (!originalItem) {
        throw new Error("Item not found");
      }

      // Optimistic update - apply changes immediately to UI
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                ...updates,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      );

      try {
        const updatedItem = await api.patch<Item>(
          `/api/items/${itemId}`,
          updates,
        );

        // Update with the server response (ensures we have the correct data)
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? updatedItem : item)),
        );

        return updatedItem;
      } catch (error) {
        // Revert to original item on error
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? originalItem : item)),
        );

        throw error;
      }
    },
    [items],
  );

  // Get a single item by ID from the current list
  const getItemById = useCallback(
    (itemId: string): Item | undefined => {
      return items.find((item) => item.id === itemId);
    },
    [items],
  );

  return {
    items,
    loading,
    initialLoading,
    error,
    hasMore,
    loadMore,
    refetch,
    removeItem,
    revertRemove,
    updateItem,
    getItemById,
  };
}
