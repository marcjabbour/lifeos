"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { Item } from "@/lib/api";

// =============================================================================
// CARD COMPONENT
// =============================================================================

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export function Card({
  children,
  className = "",
  onClick,
  interactive = true,
}: CardProps) {
  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-xl
        bg-surface border border-border
        transition-colors duration-200
        ${interactive ? "cursor-pointer" : ""}
        ${className}
      `}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={
        interactive
          ? {
              scale: 1.02,
              borderColor: "rgba(0, 212, 255, 0.3)",
            }
          : undefined
      }
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      style={
        interactive
          ? {
              boxShadow: "var(--shadow-card-glow)",
            }
          : undefined
      }
      onHoverStart={(e) => {
        if (interactive && e.target instanceof HTMLElement) {
          e.target.style.boxShadow = "var(--shadow-card-glow-hover)";
        }
      }}
      onHoverEnd={(e) => {
        if (interactive && e.target instanceof HTMLElement) {
          e.target.style.boxShadow = "var(--shadow-card-glow)";
        }
      }}
    >
      {/* Gradient glow overlay on hover */}
      {interactive && (
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0"
          initial={false}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            background:
              "linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// =============================================================================
// ITEM CARD - Specialized for LifeOS items
// =============================================================================

interface ItemCardProps {
  item: Item;
  onClick?: (item: Item) => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const typeConfig = getTypeConfig(item.type);

  return (
    <Card onClick={() => onClick?.(item)} className="p-4">
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${typeConfig.color}20, ${typeConfig.color}10)`,
            color: typeConfig.color,
          }}
        >
          {typeConfig.icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title */}
          <h3 className="truncate text-sm font-medium text-primary">
            {item.title}
          </h3>

          {/* Preview */}
          {item.content && (
            <p className="mt-1 line-clamp-2 text-xs text-secondary">
              {item.content}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-2 flex items-center gap-2 text-xs text-tertiary">
            {/* Source */}
            {item.source && (
              <span className="flex items-center gap-1">
                <SourceIcon />
                {item.source}
              </span>
            )}

            {/* Time */}
            <span>{formatRelativeTime(item.created_at)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

interface TypeConfig {
  icon: ReactNode;
  color: string;
  label: string;
}

function getTypeConfig(type: Item["type"]): TypeConfig {
  const configs: Record<Item["type"], TypeConfig> = {
    article: {
      icon: <ArticleIcon />,
      color: "#00d4ff",
      label: "Article",
    },
    note: {
      icon: <NoteIcon />,
      color: "#8b5cf6",
      label: "Note",
    },
    task: {
      icon: <TaskIcon />,
      color: "#10b981",
      label: "Task",
    },
    link: {
      icon: <LinkIcon />,
      color: "#f59e0b",
      label: "Link",
    },
    image: {
      icon: <ImageIcon />,
      color: "#ec4899",
      label: "Image",
    },
    file: {
      icon: <FileIcon />,
      color: "#6366f1",
      label: "File",
    },
  };

  return configs[type] || configs.note;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// =============================================================================
// ICONS (Inline SVG for minimal deps)
// =============================================================================

function ArticleIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
      />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function SourceIcon() {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
}
