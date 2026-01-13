"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardThumbnail,
  CardContent,
  CardMeta,
  CardSource,
  MetaDot,
  CardTitle,
  CardDescription,
  CardActions,
  CardImage,
  NovaBadge,
  Button,
  Tag,
  Skeleton,
} from "@/components/ui";
import {
  PlayIcon,
  DownloadIcon,
  ArrowRightIcon,
  ClockIcon,
  NovaIcon,
  FilterIcon,
} from "@/components/icons";
import { ItemDetailModal } from "./item-detail-modal";

// Types
export type ItemType = "hero" | "split" | "article" | "memory";

export interface FeedItem {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  quote?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  source: {
    name: string;
    iconUrl?: string;
  };
  meta: {
    duration?: string;
    readTime?: string;
    savedAt?: string;
    itemType?: string;
  };
  tags?: string[];
  novaEnriched?: boolean;
  novaCommentary?: string;
  memoryDate?: string;
  memoryImages?: string[];
}

interface ItemsFeedProps {
  initialItems?: FeedItem[];
}

// Mock data for demo purposes
const mockItems: FeedItem[] = [
  {
    id: "1",
    type: "hero",
    title:
      "The Future of Personal AI: How Intelligent Assistants Will Transform Daily Life",
    source: {
      name: "YouTube",
      iconUrl: "https://www.google.com/s2/favicons?domain=youtube.com&sz=32",
    },
    meta: { duration: "28 min watch", savedAt: "yesterday" },
    thumbnailUrl:
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
    novaEnriched: true,
    novaCommentary:
      'This deep dive connects to 3 articles you saved last month about productivity systems. Key insight: the speaker\'s "ambient computing" concept aligns with your interest in frictionless capture workflows.',
  },
  {
    id: "2",
    type: "split",
    title: "Weekly Meal Prep List - Mediterranean Focus",
    description:
      "Your curated grocery list based on saved recipes. Nova organized by store section and estimated prep time.",
    source: {
      name: "Notion",
      iconUrl: "https://www.google.com/s2/favicons?domain=notion.so&sz=32",
    },
    meta: { itemType: "List" },
    imageUrl:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80",
    tags: ["Groceries", "Meal Prep", "Health"],
  },
  {
    id: "3",
    type: "article",
    title: "Why Your Second Brain Needs a Second Opinion",
    quote:
      "\"The real power isn't in storing information—it's in having something that can connect the dots you'd never think to connect yourself.\"",
    source: {
      name: "Wired",
      iconUrl: "https://www.google.com/s2/favicons?domain=wired.com&sz=32",
    },
    meta: { readTime: "8 min read" },
  },
  {
    id: "4",
    type: "memory",
    title: "Colorado Trail - Day 3 Summit",
    description:
      "You saved 12 photos and 3 journal entries from this trip. Nova found a connection to your recent interest in outdoor gear reviews.",
    source: { name: "Photos" },
    meta: {},
    memoryDate: "1 year ago today",
    memoryImages: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&q=80",
      "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=200&q=80",
    ],
  },
];

// Generate more mock items for infinite scroll
function generateMoreItems(startId: number): FeedItem[] {
  const types: ItemType[] = ["split", "article", "split", "article"];
  return types.map((type, i) => ({
    id: `${startId + i}`,
    type,
    title:
      type === "split"
        ? `Project Notes - Week ${startId + i}`
        : `Article: Insights from ${["Design", "Tech", "Science", "Culture"][i % 4]}`,
    description:
      type === "split"
        ? "Auto-organized notes from your recent project work."
        : undefined,
    quote:
      type === "article"
        ? '"An interesting quote from the article that captures its essence."'
        : undefined,
    source: {
      name: type === "split" ? "Notes" : "Medium",
      iconUrl:
        type === "article"
          ? "https://www.google.com/s2/favicons?domain=medium.com&sz=32"
          : undefined,
    },
    meta:
      type === "split"
        ? { itemType: "Notes" }
        : { readTime: `${5 + (i % 5)} min read` },
    imageUrl:
      type === "split"
        ? `https://images.unsplash.com/photo-150${6905925346 + i * 100}?w=400&q=80`
        : undefined,
    tags: type === "split" ? ["Work", "Projects"] : undefined,
  }));
}

export function ItemsFeed({ initialItems = mockItems }: ItemsFeedProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleItemClick = useCallback((item: FeedItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(null);
  }, []);

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
      <FeedHeader enrichedCount={12} />

      {/* Feed Cards */}
      <div className="flex flex-col gap-6">
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.4,
                delay: index < 4 ? index * 0.05 : 0,
              }}
            >
              <FeedCard item={item} onClick={() => handleItemClick(item)} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <div className="flex flex-col gap-6">
            <FeedCardSkeleton type="split" />
            <FeedCardSkeleton type="article" />
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="h-10" />

        {/* End of feed message */}
        {!hasMore && (
          <div className="py-8 text-center text-text-muted">
            You've reached the end of your feed
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
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
    <header className="mb-8">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-[28px] font-bold text-text-primary tracking-tight">
            Intelligence Feed
          </h1>
          <p className="text-[15px] text-text-secondary">
            Welcome back. Nova has enriched{" "}
            <strong className="text-accent-primary font-semibold">
              {enrichedCount} items
            </strong>{" "}
            since your last visit.
          </p>
        </div>
        <Button variant="secondary" size="sm" className="rounded-full">
          <FilterIcon size={16} />
          Refine Feed
        </Button>
      </div>
    </header>
  );
}

// Feed Card Component
interface FeedCardProps {
  item: FeedItem;
  onClick?: () => void;
}

function FeedCard({ item, onClick }: FeedCardProps) {
  switch (item.type) {
    case "hero":
      return <HeroCard item={item} onClick={onClick} />;
    case "split":
      return <SplitCard item={item} onClick={onClick} />;
    case "article":
      return <ArticleCard item={item} onClick={onClick} />;
    case "memory":
      return <MemoryCard item={item} onClick={onClick} />;
    default:
      return null;
  }
}

// Hero Card
function HeroCard({ item, onClick }: { item: FeedItem; onClick?: () => void }) {
  return (
    <Card variant="hero" className="relative cursor-pointer" onClick={onClick}>
      {item.thumbnailUrl && (
        <>
          <CardThumbnail
            src={item.thumbnailUrl}
            alt={item.title}
            className="h-[280px]"
          />
          <div className="absolute top-0 left-0 right-0 h-[280px] bg-gradient-to-b from-transparent via-transparent to-bg-card pointer-events-none" />
        </>
      )}

      {item.novaEnriched && (
        <div className="absolute top-4 left-4">
          <NovaBadge />
        </div>
      )}

      <CardContent className="px-6 pb-6 pt-5">
        <CardMeta className="mb-3">
          <CardSource name={item.source.name} iconUrl={item.source.iconUrl} />
          {item.meta.duration && (
            <>
              <MetaDot />
              <span>{item.meta.duration}</span>
            </>
          )}
          {item.meta.savedAt && (
            <>
              <MetaDot />
              <span>Saved {item.meta.savedAt}</span>
            </>
          )}
        </CardMeta>

        <CardTitle className="text-[20px] mb-4">{item.title}</CardTitle>

        {item.novaCommentary && <NovaCommentary text={item.novaCommentary} />}

        <CardActions>
          <Button variant="primary">
            <PlayIcon size={16} />
            Watch Deep Dive
          </Button>
          <Button variant="secondary">
            <DownloadIcon size={16} />
            Save Summary
          </Button>
        </CardActions>
      </CardContent>
    </Card>
  );
}

// Split Card
function SplitCard({
  item,
  onClick,
}: {
  item: FeedItem;
  onClick?: () => void;
}) {
  return (
    <Card variant="split" className="cursor-pointer" onClick={onClick}>
      {item.imageUrl && (
        <CardImage
          src={item.imageUrl}
          alt={item.title}
          className="w-[200px] h-[180px]"
        />
      )}
      <CardContent className="flex flex-col flex-1 p-5">
        <CardMeta className="mb-2">
          <CardSource name={item.source.name} iconUrl={item.source.iconUrl} />
          {item.meta.itemType && (
            <>
              <MetaDot />
              <span>{item.meta.itemType}</span>
            </>
          )}
        </CardMeta>

        <CardTitle className="text-[17px] mb-2">{item.title}</CardTitle>

        {item.description && (
          <CardDescription className="flex-1 mb-4">
            {item.description}
          </CardDescription>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Article Card
function ArticleCard({
  item,
  onClick,
}: {
  item: FeedItem;
  onClick?: () => void;
}) {
  return (
    <Card className="cursor-pointer" onClick={onClick}>
      <CardContent className="px-6 py-5">
        <CardMeta className="mb-3">
          <CardSource name={item.source.name} iconUrl={item.source.iconUrl} />
          {item.meta.readTime && (
            <>
              <MetaDot />
              <span>{item.meta.readTime}</span>
            </>
          )}
        </CardMeta>

        <CardTitle className="text-[17px] mb-3">{item.title}</CardTitle>

        {item.quote && (
          <blockquote className="text-[15px] text-text-secondary italic pl-4 border-l-2 border-border-default mb-4 leading-relaxed">
            {item.quote}
          </blockquote>
        )}

        <a
          href="#"
          className="inline-flex items-center gap-2 text-accent-primary text-sm font-medium transition-all hover:text-accent-hover hover:gap-3"
        >
          Read Article
          <ArrowRightIcon size={16} />
        </a>
      </CardContent>
    </Card>
  );
}

// Memory Card
function MemoryCard({
  item,
  onClick,
}: {
  item: FeedItem;
  onClick?: () => void;
}) {
  return (
    <Card variant="memory" className="cursor-pointer" onClick={onClick}>
      <CardContent className="px-6 py-5">
        {item.memoryDate && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-muted rounded-full text-[11px] font-semibold text-accent-primary uppercase tracking-wide mb-4">
            <ClockIcon size={14} />
            Memory from {item.memoryDate}
          </div>
        )}

        {item.memoryImages && item.memoryImages.length > 0 && (
          <div className="flex gap-3 mb-4">
            {item.memoryImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Memory ${i + 1}`}
                className="w-20 h-20 rounded-md object-cover"
              />
            ))}
          </div>
        )}

        <CardTitle className="text-[17px] mb-2">{item.title}</CardTitle>

        {item.description && (
          <CardDescription>{item.description}</CardDescription>
        )}
      </CardContent>
    </Card>
  );
}

// Nova Commentary Component
function NovaCommentary({ text }: { text: string }) {
  return (
    <div className="flex gap-3 p-4 bg-bg-elevated rounded-lg border-l-[3px] border-accent-primary mb-5">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-glow-purple-sm">
        <NovaIcon size={18} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-semibold text-accent-primary">
            Nova
          </span>
          <span className="text-[11px] text-text-muted">
            synthesized this for you
          </span>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// Skeleton Loaders
function FeedCardSkeleton({ type }: { type: "split" | "article" }) {
  if (type === "split") {
    return (
      <Card variant="split">
        <Skeleton variant="rectangular" className="w-[200px] h-[180px]" />
        <CardContent className="flex flex-col flex-1 p-5">
          <Skeleton width={120} className="mb-3" />
          <Skeleton width="80%" height={20} className="mb-2" />
          <Skeleton width="100%" className="mb-1" />
          <Skeleton width="60%" className="mb-4" />
          <div className="flex gap-2">
            <Skeleton width={80} height={24} className="rounded-full" />
            <Skeleton width={80} height={24} className="rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="px-6 py-5">
        <Skeleton width={150} className="mb-3" />
        <Skeleton width="90%" height={20} className="mb-3" />
        <Skeleton width="100%" className="mb-1" />
        <Skeleton width="80%" className="mb-4" />
        <Skeleton width={100} />
      </CardContent>
    </Card>
  );
}

export default ItemsFeed;
