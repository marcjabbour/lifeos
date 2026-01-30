"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useContext,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TagCategory } from "@/lib/services/ai/embeddings/tags";
import {
  CompactCard,
  CompactCardItem,
  CompactCardSkeleton,
} from "./compact-card";
import { FeedFilterBar } from "./feed-filter-bar";
import { ItemDetailModal } from "./item-detail-modal";
import { QueryResultModal } from "./query-result-modal";
import { Button, ConfirmDialog, useToastActions } from "@/components/ui";
import { NovaIcon } from "@/components/icons";
import { FilterContext } from "@/contexts/FilterContext";
import { useItems } from "@/hooks/use-items";
import { getSupabase } from "@/lib/core/database/client";
import type { Item } from "@/types/database";

// Types
export type ItemType = "hero" | "split" | "article" | "memory";

export interface FeedItem extends CompactCardItem {
  type?: ItemType;
  quote?: string;
  memoryDate?: string;
  memoryImages?: string[];
}

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  if (diffDays < 365)
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? "s" : ""} ago`;
}

// Helper to get favicon URL from a URL
function getFaviconUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return undefined;
  }
}

// Helper to format source name from source_type
function formatSourceName(sourceType: string, url?: string | null): string {
  // Try to extract domain from URL first
  if (url) {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      // Capitalize first letter of domain
      return domain.charAt(0).toUpperCase() + domain.slice(1).split(".")[0];
    } catch {
      // Fall through to source type
    }
  }

  // Format source type as display name
  const sourceNames: Record<string, string> = {
    browser_extension: "Browser",
    mobile_share: "Mobile",
    email: "Email",
    api: "API",
    manual: "Manual",
    whatsapp: "WhatsApp",
  };
  return sourceNames[sourceType] || sourceType;
}

// Map database Item to FeedItem for display
function mapItemToFeedItem(item: Item): FeedItem {
  return {
    id: item.id,
    title: item.title,
    description: item.enrichment?.summary || item.content || undefined,
    thumbnailUrl: item.thumbnail_url || undefined,
    source: {
      name: formatSourceName(item.source_type, item.url),
      iconUrl:
        (item.metadata?.favicon_url as string | undefined) ||
        getFaviconUrl(item.url),
    },
    meta: {
      readTime: item.metadata?.read_time
        ? `${item.metadata.read_time} min read`
        : undefined,
      duration: item.metadata?.duration
        ? `${item.metadata.duration} min`
        : undefined,
      savedAt: formatRelativeTime(item.created_at),
      itemType: item.category,
    },
    tags: item.tags || [],
    category: item.category as TagCategory,
    novaEnriched: item.has_enrichment,
    novaCommentary: item.enrichment?.nova_commentary,
  };
}

export function ItemsFeed() {
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get filter context (optional - component works without it)
  const filterContext = useContext(FilterContext);

  // Local filter state (synced with context when available)
  const [localCategories, setLocalCategories] = useState<TagCategory[]>([]);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [localQueryResult, setLocalQueryResult] = useState<{
    answer: string;
    items: Array<{
      id: string;
      title: string;
      category: string;
      url?: string;
      source_type: string;
      created_at: string;
    }>;
  } | null>(null);

  // Use context values if available, otherwise use local state
  const activeCategories = filterContext?.categories ?? localCategories;
  const searchQuery = filterContext?.searchQuery ?? localSearchQuery;
  const queryResult = filterContext?.queryResult ?? localQueryResult;

  // Dismiss local query result
  const dismissLocalQueryResult = useCallback(() => {
    setLocalQueryResult(null);
  }, []);

  // Toast notifications
  const toast = useToastActions();

  // Fetch items from database with filters
  const {
    items: dbItems,
    loading,
    initialLoading,
    error,
    hasMore,
    loadMore,
    removeItem,
    revertRemove,
    updateItem,
    getItemById,
  } = useItems({
    categories: activeCategories,
    searchQuery,
  });

  // Map database items to FeedItem format
  const items = useMemo(() => dbItems.map(mapItemToFeedItem), [dbItems]);

  // Setters that update both local state and context
  const setActiveCategories = useCallback(
    (categories: TagCategory[] | ((prev: TagCategory[]) => TagCategory[])) => {
      const newCategories =
        typeof categories === "function"
          ? categories(activeCategories)
          : categories;
      setLocalCategories(newCategories);
      if (filterContext?.setCategories) {
        filterContext.setCategories(newCategories);
      }
    },
    [activeCategories, filterContext],
  );

  const setSearchQuery = useCallback(
    (query: string) => {
      setLocalSearchQuery(query);
      if (filterContext?.setSearchQuery) {
        filterContext.setSearchQuery(query);
      }
    },
    [filterContext],
  );

  // Seen items state
  const [seenItemIds, setSeenItemIds] = useState<Set<string>>(new Set());

  // Delete confirmation state
  const [itemToDelete, setItemToDelete] = useState<FeedItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Filter out seen items from the feed
  const filteredItems = useMemo(() => {
    // Filter out seen items from main feed
    const result = items.filter((item) => !seenItemIds.has(item.id));

    // Add isSeen flag to items (useful for other views that might show seen items)
    return result.map((item) => ({
      ...item,
      isSeen: seenItemIds.has(item.id),
    }));
  }, [items, seenItemIds]);

  // Count enriched items
  const enrichedCount = useMemo(
    () => items.filter((item) => item.novaEnriched).length,
    [items],
  );

  const handleItemClick = useCallback((item: FeedItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(null);
  }, []);

  const handleCategoryToggle = useCallback((category: TagCategory | "all") => {
    if (category === "all") {
      setActiveCategories([]);
    } else {
      setActiveCategories((prev) =>
        prev.includes(category)
          ? prev.filter((c) => c !== category)
          : [...prev, category],
      );
    }
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveCategories([]);
    setSearchQuery("");
  }, []);

  // Mark item as seen handler
  const handleMarkSeen = useCallback(async (itemId: string) => {
    // Optimistically update UI
    setSeenItemIds((prev) => new Set(prev).add(itemId));

    try {
      // Get auth token for the request
      const supabase = getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      // Persist to backend
      await fetch("/api/feed/seen", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ itemId }),
      });
    } catch (error) {
      // Revert on error
      console.error("Failed to mark item as seen:", error);
      setSeenItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, []);

  // Delete item handlers
  const handleDeleteClick = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true);
      }
    },
    [items],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete) return;

    const itemId = itemToDelete.id;

    // Find the original database item for potential revert
    const dbItemSnapshot = dbItems.find((item) => item.id === itemId);

    // Optimistically remove from UI
    removeItem(itemId);
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);

    try {
      // Get auth token for the request
      const supabase = getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      // Persist to backend (soft delete / archive)
      const response = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Delete failed with status: ${response.status}`,
        );
      }
    } catch (error) {
      console.error("Failed to delete item:", error);

      // Revert the optimistic removal if we have the original item
      if (dbItemSnapshot) {
        revertRemove(itemId, dbItemSnapshot);
      }

      // Show error toast to user
      toast.error(
        "Failed to delete item",
        "The item could not be deleted. Please try again.",
      );
    }
  }, [itemToDelete, dbItems, removeItem, revertRemove, toast]);

  const handleDeleteCancel = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  }, []);

  const handleVoiceInput = useCallback(async () => {
    // Toggle listening state
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);

    // Use Web Speech API for voice recognition
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.warn("Speech recognition not supported");
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("Voice command:", transcript);

      try {
        // Parse voice command through Nova's API with question handling enabled
        const response = await fetch("/api/nova/voice-filter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: transcript, handleQuestions: true }),
        });

        if (response.ok) {
          const data = await response.json();
          const { intent, questionResult } = data;

          if (intent.action === "clear") {
            handleClearFilters();
          } else if (intent.action === "question" && questionResult) {
            // Handle question response - show the answer modal
            if (filterContext?.submitCommand) {
              // Use context if available (it will show the modal)
              await filterContext.submitCommand(transcript);
            } else {
              // Use local state for the modal
              setLocalQueryResult({
                answer: questionResult.answer,
                items: questionResult.items,
              });
            }
          } else if (intent.categories?.length > 0) {
            setActiveCategories(intent.categories);
          }

          if (intent.searchQuery && intent.action !== "question") {
            setSearchQuery(intent.searchQuery);
          }
        }
      } catch (error) {
        console.error("Failed to parse voice command:", error);
      }

      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isListening, handleClearFilters]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="flex flex-col">
      {/* Feed Header */}
      <FeedHeader enrichedCount={enrichedCount} />

      {/* Filter Bar */}
      <FeedFilterBar
        activeCategories={activeCategories}
        searchQuery={searchQuery}
        onCategoryToggle={handleCategoryToggle}
        onSearchChange={handleSearchChange}
        onVoiceInput={handleVoiceInput}
        onClearFilters={handleClearFilters}
        isListening={isListening}
      />

      {/* Feed Cards - 3 per row grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Initial loading state */}
        {initialLoading ? (
          <>
            <CompactCardSkeleton />
            <CompactCardSkeleton />
            <CompactCardSkeleton />
            <CompactCardSkeleton />
            <CompactCardSkeleton />
            <CompactCardSkeleton />
          </>
        ) : error ? (
          /* Error state */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <NovaIcon size={32} className="text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-text-primary">
              Something went wrong
            </h3>
            <p className="mb-4 max-w-sm text-sm text-text-secondary">{error}</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.3,
                    delay: index < 6 ? index * 0.05 : 0,
                  }}
                >
                  <CompactCard
                    item={item}
                    category={item.category}
                    onClick={() => handleItemClick(item)}
                    onMarkSeen={handleMarkSeen}
                    onDelete={handleDeleteClick}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-elevated">
                  <NovaIcon size={32} className="text-text-muted" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-text-primary">
                  No items found
                </h3>
                <p className="mb-4 max-w-sm text-sm text-text-secondary">
                  {searchQuery
                    ? `No items match "${searchQuery}"`
                    : activeCategories.length > 0
                      ? "No items in the selected categories"
                      : "Your feed is empty. Start saving items to see them here!"}
                </p>
                {(searchQuery || activeCategories.length > 0) && (
                  <Button variant="secondary" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Loading more indicator */}
        {!initialLoading && loading && (
          <>
            <CompactCardSkeleton />
            <CompactCardSkeleton />
            <CompactCardSkeleton />
          </>
        )}

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="h-10" />

        {/* End of feed message */}
        {!hasMore && filteredItems.length > 0 && (
          <div className="py-8 text-center text-text-muted">
            You&apos;ve reached the end of your feed
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        dbItem={selectedItem ? getItemById(selectedItem.id) : null}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onItemUpdate={updateItem}
      />

      {/* Query Result Modal (from Nova commands) */}
      {queryResult && (
        <QueryResultModal
          isOpen={!!queryResult}
          onClose={() => {
            filterContext?.dismissQueryResult?.();
            dismissLocalQueryResult();
          }}
          answer={queryResult.answer}
          items={queryResult.items}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Item"
        message={`Are you sure you want to delete "${itemToDelete?.title || "this item"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

// Feed Header Component
interface FeedHeaderProps {
  enrichedCount: number;
}

function FeedHeader({ enrichedCount }: FeedHeaderProps) {
  return (
    <header className="mb-6 text-center">
      <h1 className="text-[28px] font-bold tracking-tight text-text-primary">
        Intelligence Feed
      </h1>
      <p className="text-[15px] text-text-secondary">
        Welcome back. Nova has enriched{" "}
        <strong className="font-semibold text-accent-primary">
          {enrichedCount} items
        </strong>{" "}
        since your last visit.
      </p>
    </header>
  );
}

export default ItemsFeed;
