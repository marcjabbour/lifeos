"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { Item } from "@/lib/api";
import { ItemCard } from "./Card";

// =============================================================================
// CARD GRID - Responsive grid with NO infinite scroll
// =============================================================================

interface CardGridProps {
  children: ReactNode;
  className?: string;
}

export function CardGrid({ children, className = "" }: CardGridProps) {
  return (
    <motion.div
      className={`
        grid gap-4
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        ${className}
      `}
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// ITEMS GRID - Specialized for LifeOS items
// =============================================================================

interface ItemsGridProps {
  items: Item[];
  onItemClick?: (item: Item) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ItemsGrid({
  items,
  onItemClick,
  isLoading = false,
  emptyMessage = "No items yet",
  className = "",
}: ItemsGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <CardGrid className={className}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </CardGrid>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-16 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4 rounded-full bg-surface p-4">
          <EmptyIcon />
        </div>
        <p className="text-secondary">{emptyMessage}</p>
        <p className="mt-1 text-sm text-tertiary">
          Capture something to get started
        </p>
      </motion.div>
    );
  }

  // Items grid
  return (
    <CardGrid className={className}>
      {items.map((item) => (
        <motion.div
          key={item.id}
          variants={{
            initial: { opacity: 0, y: 10 },
            animate: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
            },
          }}
        >
          <ItemCard item={item} onClick={onItemClick} />
        </motion.div>
      ))}
    </CardGrid>
  );
}

// =============================================================================
// SKELETON CARD
// =============================================================================

function SkeletonCard() {
  return (
    <motion.div
      className="rounded-xl border border-border bg-surface p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-3">
        {/* Icon skeleton */}
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-elevated" />

        {/* Content skeleton */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-elevated" />
          <div className="h-3 w-full animate-pulse rounded bg-elevated" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-elevated" />
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// PAGINATED GRID - For fixed-size grids with pagination
// =============================================================================

interface PaginatedGridProps {
  items: Item[];
  onItemClick?: (item: Item) => void;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function PaginatedGrid({
  items,
  onItemClick,
  pageSize = 9,
  currentPage = 1,
  onPageChange,
  isLoading = false,
  className = "",
}: PaginatedGridProps) {
  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleItems = items.slice(startIndex, startIndex + pageSize);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Grid */}
      <ItemsGrid
        items={visibleItems}
        onItemClick={onItemClick}
        isLoading={isLoading}
        className="flex-1"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <PaginationButton
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeftIcon />
          </PaginationButton>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              const isActive = page === currentPage;

              // Show first, last, current, and adjacent pages
              const shouldShow =
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1;

              // Show ellipsis
              const showEllipsis =
                (page === 2 && currentPage > 3) ||
                (page === totalPages - 1 && currentPage < totalPages - 2);

              if (showEllipsis) {
                return (
                  <span key={page} className="px-2 text-tertiary">
                    ...
                  </span>
                );
              }

              if (!shouldShow) return null;

              return (
                <PaginationButton
                  key={page}
                  onClick={() => onPageChange?.(page)}
                  active={isActive}
                >
                  {page}
                </PaginationButton>
              );
            })}
          </div>

          <PaginationButton
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRightIcon />
          </PaginationButton>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PAGINATION BUTTON
// =============================================================================

interface PaginationButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}

function PaginationButton({
  children,
  onClick,
  disabled = false,
  active = false,
}: PaginationButtonProps) {
  return (
    <motion.button
      className={`
        flex h-8 min-w-8 items-center justify-center rounded-lg px-2
        text-sm font-medium transition-colors
        ${
          active
            ? "bg-cyan-500/20 text-cyan-400"
            : "bg-surface text-secondary hover:text-primary"
        }
        ${disabled ? "pointer-events-none opacity-40" : ""}
      `}
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

// =============================================================================
// ICONS
// =============================================================================

function EmptyIcon() {
  return (
    <svg
      className="h-8 w-8 text-tertiary"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}
