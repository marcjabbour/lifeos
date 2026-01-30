"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import {
  TagCategory,
  CATEGORY_GLOW_MAP,
  CATEGORY_BORDER_MAP,
} from "@/types/categories";
import { Tag } from "@/components/ui";
import { NovaIcon, CheckIcon, TrashIcon } from "@/components/icons";

// Category emoji fallback map
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  food: "🍕",
  tech: "💻",
  music: "🎵",
  entertainment: "🎬",
  fitness: "💪",
  travel: "✈️",
  work: "💼",
  learning: "📚",
  finance: "💰",
  social: "👥",
  uncategorized: "📌",
};

function getCategoryEmoji(category?: TagCategory | string): string {
  return CATEGORY_EMOJI_MAP[category || "uncategorized"] || "📌";
}

interface FormattedDate {
  text: string;
  daysAgo: number;
}

function formatSavedDate(dateStr?: string): FormattedDate {
  if (!dateStr) return { text: "", daysAgo: -1 };

  // Handle relative dates like "yesterday", "2 days ago"
  if (dateStr === "yesterday") return { text: "Yesterday", daysAgo: 1 };
  if (dateStr.includes("days ago")) {
    const match = dateStr.match(/(\d+)\s*days?\s*ago/i);
    const days = match ? parseInt(match[1], 10) : 7;
    return { text: dateStr, daysAgo: days };
  }
  if (dateStr.includes("week ago") || dateStr.includes("weeks ago")) {
    const match = dateStr.match(/(\d+)\s*weeks?\s*ago/i);
    const weeks = match ? parseInt(match[1], 10) : 1;
    return { text: dateStr, daysAgo: weeks * 7 };
  }
  if (dateStr.includes("year ago")) {
    return { text: dateStr, daysAgo: 365 };
  }

  // Parse and format actual dates
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { text: dateStr, daysAgo: -1 };

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return { text: "Today", daysAgo: 0 };
  if (diffDays === 1) return { text: "Yesterday", daysAgo: 1 };
  if (diffDays < 7) return { text: `${diffDays}d ago`, daysAgo: diffDays };

  return {
    text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    daysAgo: diffDays,
  };
}

// Get badge color based on recency
function getDateBadgeClasses(daysAgo: number): string {
  if (daysAgo < 0) return "bg-bg-hover text-text-muted"; // unknown
  if (daysAgo === 0) return "bg-emerald-500/20 text-emerald-400"; // today - green
  if (daysAgo === 1) return "bg-cyan-500/20 text-cyan-400"; // yesterday - cyan
  if (daysAgo <= 3) return "bg-blue-500/20 text-blue-400"; // 2-3 days - blue
  if (daysAgo <= 7) return "bg-violet-500/20 text-violet-400"; // 4-7 days - violet
  if (daysAgo <= 30) return "bg-amber-500/20 text-amber-400"; // 1-4 weeks - amber
  return "bg-bg-hover text-text-muted"; // older - muted
}

export interface CompactCardItem {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
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
  category?: TagCategory;
  isSeen?: boolean;
}

export interface CompactCardProps extends Omit<
  HTMLMotionProps<"div">,
  "onClick"
> {
  item: CompactCardItem;
  category?: TagCategory;
  onClick?: () => void;
  onMarkSeen?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
}

const MAX_VISIBLE_TAGS = 2;

export function CompactCard({
  item,
  category = item.category || "uncategorized",
  onClick,
  onMarkSeen,
  onDelete,
  className = "",
  ...props
}: CompactCardProps) {
  const glowClass = CATEGORY_GLOW_MAP[category];
  const borderClass = CATEGORY_BORDER_MAP[category];
  const visibleTags = item.tags?.slice(0, MAX_VISIBLE_TAGS) || [];
  const remainingTags = Math.max(
    0,
    (item.tags?.length || 0) - MAX_VISIBLE_TAGS,
  );

  return (
    <motion.div
      className={`
        group relative flex flex-col cursor-pointer overflow-hidden rounded-xl
        border bg-bg-card transition-all duration-300
        h-[140px]
        hover:translate-y-[-2px]
        ${borderClass}
        ${glowClass}
        ${className}
      `}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-3">
        {/* Header row: Source + Date + Indicators */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            {/* Category emoji */}
            <span className="text-[12px]" role="img" aria-label={category}>
              {getCategoryEmoji(category)}
            </span>
            <span className="max-w-[70px] truncate">{item.source.name}</span>
            {item.meta.savedAt &&
              (() => {
                const { text, daysAgo } = formatSavedDate(item.meta.savedAt);
                return (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${getDateBadgeClasses(daysAgo)}`}
                  >
                    {text}
                  </span>
                );
              })()}
          </div>

          {/* Right side: Nova badge + Seen indicator */}
          <div className="flex items-center gap-1.5">
            {item.novaEnriched && (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-nova-amber-bg">
                <NovaIcon size={10} className="text-nova-amber" />
              </div>
            )}
            {item.isSeen && (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/90">
                <CheckIcon size={10} className="text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Title - 2 lines max */}
        <h3 className="mb-2 line-clamp-2 text-[13px] font-semibold leading-snug text-text-primary">
          {item.title}
        </h3>

        {/* Tags + Mark as Seen button */}
        <div className="flex items-center justify-between gap-2">
          {visibleTags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {visibleTags.map((tag) => (
                <Tag key={tag} className="px-1.5 py-0.5 text-[9px]">
                  {tag}
                </Tag>
              ))}
              {remainingTags > 0 && (
                <span className="text-[9px] text-text-muted">
                  +{remainingTags}
                </span>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* Mark as Seen button (only show if not seen) */}
            {!item.isSeen && onMarkSeen && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkSeen(item.id);
                }}
                className="flex items-center gap-1 rounded-full bg-bg-hover px-2 py-1 text-[10px] text-text-muted opacity-0 transition-all hover:bg-green-500/20 hover:text-green-400 group-hover:opacity-100"
                title="Mark as seen"
              >
                <CheckIcon size={10} />
              </button>
            )}
            {/* Delete button (shows on hover) */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="flex items-center gap-1 rounded-full bg-bg-hover px-2 py-1 text-[10px] text-text-muted opacity-0 transition-all hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                title="Delete item"
              >
                <TrashIcon size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hover glow intensify effect */}
      <div
        className={`
          pointer-events-none absolute inset-0 rounded-xl opacity-0
          transition-opacity duration-300 group-hover:opacity-100
          ${glowClass}
        `}
        style={{ filter: "blur(20px)", zIndex: -1 }}
      />
    </motion.div>
  );
}

// Skeleton loader for CompactCard
export function CompactCardSkeleton() {
  return (
    <div className="flex h-[140px] flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-card p-3">
      {/* Header skeleton */}
      <div className="mb-2 flex items-center gap-2">
        <div className="h-3 w-3 animate-pulse rounded bg-bg-elevated" />
        <div className="h-3 w-12 animate-pulse rounded bg-bg-elevated" />
        <div className="h-2 w-2 animate-pulse rounded-full bg-bg-elevated" />
        <div className="h-3 w-10 animate-pulse rounded bg-bg-elevated" />
      </div>

      {/* Title skeleton */}
      <div className="mb-2 flex-1 space-y-1.5">
        <div className="h-3 w-full animate-pulse rounded bg-bg-elevated" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-bg-elevated" />
      </div>

      {/* Tags skeleton */}
      <div className="flex gap-1">
        <div className="h-4 w-12 animate-pulse rounded-full bg-bg-elevated" />
        <div className="h-4 w-10 animate-pulse rounded-full bg-bg-elevated" />
      </div>
    </div>
  );
}

export default CompactCard;
