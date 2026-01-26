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
import { Button, ConfirmDialog } from "@/components/ui";
import { NovaIcon } from "@/components/icons";
import { FilterContext } from "@/contexts/FilterContext";

// Types
export type ItemType = "hero" | "split" | "article" | "memory";

export interface FeedItem extends CompactCardItem {
  type?: ItemType;
  quote?: string;
  memoryDate?: string;
  memoryImages?: string[];
}

interface ItemsFeedProps {
  initialItems?: FeedItem[];
}

// Mock data with categories for demo purposes
const mockItems: FeedItem[] = [
  {
    id: "1",
    title:
      "The Future of Personal AI: How Intelligent Assistants Will Transform Daily Life",
    description:
      "Deep dive into ambient computing and frictionless capture workflows. Key insight: the speaker's concept aligns with your interest in productivity systems.",
    source: {
      name: "YouTube",
      iconUrl: "https://www.google.com/s2/favicons?domain=youtube.com&sz=32",
    },
    meta: { duration: "28 min watch", savedAt: "yesterday" },
    thumbnailUrl:
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
    novaEnriched: true,
    novaCommentary:
      "This deep dive connects to 3 articles you saved last month about productivity systems.",
    tags: ["AI", "Personal Computing", "Productivity"],
    category: "tech",
  },
  {
    id: "2",
    title: "Weekly Meal Prep List - Mediterranean Focus",
    description:
      "Your curated grocery list based on saved recipes. Nova organized by store section and estimated prep time.",
    source: {
      name: "Notion",
      iconUrl: "https://www.google.com/s2/favicons?domain=notion.so&sz=32",
    },
    meta: { itemType: "List", savedAt: "4 days ago" },
    thumbnailUrl:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80",
    tags: ["Groceries", "Meal Prep", "Mediterranean"],
    category: "food",
  },
  {
    id: "3",
    title: "Why Your Second Brain Needs a Second Opinion",
    description:
      "The real power isn't in storing information—it's in having something that can connect the dots you'd never think to connect yourself.",
    source: {
      name: "Wired",
      iconUrl: "https://www.google.com/s2/favicons?domain=wired.com&sz=32",
    },
    meta: { readTime: "8 min read", savedAt: "3 days ago" },
    tags: ["Productivity", "Knowledge Management", "AI"],
    category: "learning",
  },
  {
    id: "4",
    title: "Colorado Trail - Day 3 Summit",
    description:
      "You saved 12 photos and 3 journal entries from this trip. Nova found a connection to your recent interest in outdoor gear reviews.",
    source: { name: "Photos" },
    meta: { savedAt: "1 year ago today" },
    thumbnailUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80",
    tags: ["Hiking", "Travel", "Mountains"],
    category: "travel",
  },
  {
    id: "5",
    title: "Entrecote - French Steakhouse",
    description:
      "You sent me a screenshot mentioning their famous steak sauce. Looks like a great dinner spot!",
    source: { name: "Screenshots" },
    meta: { savedAt: "2 days ago" },
    thumbnailUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80",
    novaEnriched: true,
    tags: ["Restaurant", "French", "Steak"],
    category: "food",
  },
  {
    id: "6",
    title: "Kendrick Lamar - GNX Album Review",
    description:
      "In-depth analysis of the latest album. Nova noted connections to your saved articles about hip-hop production techniques.",
    source: {
      name: "Pitchfork",
      iconUrl: "https://www.google.com/s2/favicons?domain=pitchfork.com&sz=32",
    },
    meta: { readTime: "12 min read" },
    thumbnailUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
    novaEnriched: true,
    tags: ["Kendrick Lamar", "Hip Hop", "Album Review"],
    category: "music",
  },
  {
    id: "7",
    title: "LoRA Fine-tuning Guide for Stable Diffusion",
    description:
      "Step-by-step tutorial on training custom LoRA adapters. You bookmarked this for your AI art project.",
    source: {
      name: "GitHub",
      iconUrl: "https://www.google.com/s2/favicons?domain=github.com&sz=32",
    },
    meta: { readTime: "15 min read", savedAt: "1 week ago" },
    tags: ["LoRA", "AI", "Stable Diffusion", "Tutorial"],
    category: "tech",
  },
  {
    id: "8",
    title: "Morning HIIT Workout Routine",
    description:
      "20-minute high intensity workout you saved from your trainer's recommendations.",
    source: {
      name: "Notes",
    },
    meta: { itemType: "Workout", savedAt: "5 days ago" },
    tags: ["HIIT", "Workout", "Morning Routine"],
    category: "fitness",
  },
];

// Generate more mock items for infinite scroll
function generateMoreItems(startId: number): FeedItem[] {
  const templates: Partial<FeedItem>[] = [
    {
      title: "Best Italian Restaurants in the City",
      description: "Curated list from your saved places and reviews.",
      source: { name: "Google Maps" },
      tags: ["Italian", "Restaurant", "Dining"],
      category: "food" as TagCategory,
    },
    {
      title: "TypeScript Best Practices 2025",
      description: "Modern TypeScript patterns and anti-patterns.",
      source: { name: "Medium" },
      tags: ["TypeScript", "Programming", "Best Practices"],
      category: "tech" as TagCategory,
    },
    {
      title: "Jazz Playlist - Late Night Vibes",
      description: "Curated playlist based on your listening history.",
      source: { name: "Spotify" },
      tags: ["Jazz", "Playlist", "Music"],
      category: "music" as TagCategory,
    },
    {
      title: "Investment Portfolio Rebalancing",
      description: "Notes from your quarterly review.",
      source: { name: "Notes" },
      tags: ["Investing", "Portfolio", "Finance"],
      category: "finance" as TagCategory,
    },
  ];

  return templates.map((template, i) => ({
    id: `${startId + i}`,
    title: template.title || `Item ${startId + i}`,
    description: template.description,
    source: template.source || { name: "Unknown" },
    meta: { readTime: `${5 + (i % 5)} min read` },
    tags: template.tags,
    category: template.category,
  }));
}

export function ItemsFeed({ initialItems = mockItems }: ItemsFeedProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get filter context (optional - component works without it)
  const filterContext = useContext(FilterContext);

  // Local filter state (synced with context when available)
  const [localCategories, setLocalCategories] = useState<TagCategory[]>([]);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Use context values if available, otherwise use local state
  const activeCategories = filterContext?.categories ?? localCategories;
  const searchQuery = filterContext?.searchQuery ?? localSearchQuery;
  const queryResult = filterContext?.queryResult ?? null;

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

  // Filter items based on active categories, search query, and seen status
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by categories
    if (activeCategories.length > 0) {
      result = result.filter(
        (item) => item.category && activeCategories.includes(item.category),
      );
    }

    // Filter by search query (searches in title, description, and tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().trim().includes(query)),
      );
    }

    // Filter out seen items from main feed
    result = result.filter((item) => !seenItemIds.has(item.id));

    // Add isSeen flag to items (useful for other views that might show seen items)
    return result.map((item) => ({
      ...item,
      isSeen: seenItemIds.has(item.id),
    }));
  }, [items, activeCategories, searchQuery, seenItemIds]);

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
      // Persist to backend
      await fetch("/api/feed/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    // Optimistically remove from UI
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);

    try {
      // Persist to backend (soft delete / archive)
      const response = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }
    } catch (error) {
      // Revert on error - re-add the item
      console.error("Failed to delete item:", error);
      setItems((prev) => [...prev, itemToDelete]);
    }
  }, [itemToDelete]);

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
        // Parse voice command through Nova's API
        const response = await fetch("/api/nova/voice-filter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: transcript }),
        });

        if (response.ok) {
          const data = await response.json();
          const { intent } = data;

          if (intent.action === "clear") {
            handleClearFilters();
          } else if (intent.categories?.length > 0) {
            setActiveCategories(intent.categories);
          }

          if (intent.searchQuery) {
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

  // Infinite scroll logic
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newItems = generateMoreItems(items.length + 1);
    setItems((prev) => [...prev, ...newItems]);

    // Stop after 20 items for demo
    if (items.length >= 16) {
      setHasMore(false);
    }

    setLoading(false);
  }, [loading, hasMore, items.length]);

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
                  : "No items in the selected categories"}
              </p>
              <Button variant="secondary" onClick={handleClearFilters}>
                Clear filters
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading indicator - spans full width */}
        {loading && (
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
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Query Result Modal (from Nova commands) */}
      {queryResult && (
        <QueryResultModal
          isOpen={!!queryResult}
          onClose={() => filterContext?.dismissQueryResult?.()}
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
