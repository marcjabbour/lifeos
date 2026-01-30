"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TagCategory } from "@/types/categories";
import {
  SearchIcon,
  MicrophoneIcon,
  XIcon,
  ChevronDownIcon,
} from "@/components/icons";

// Predefined filter categories with display names and colors
const FILTER_CATEGORIES: Array<{
  id: TagCategory | "all";
  label: string;
  color: string;
}> = [
  { id: "all", label: "All", color: "#ffffff" },
  { id: "food", label: "Food", color: "#FF6B6B" },
  { id: "tech", label: "Tech", color: "#8B5CF6" },
  { id: "music", label: "Music", color: "#22D3EE" },
  { id: "entertainment", label: "Entertainment", color: "#EC4899" },
  { id: "learning", label: "Learning", color: "#6366F1" },
  { id: "work", label: "Work", color: "#F59E0B" },
  { id: "fitness", label: "Fitness", color: "#10B981" },
  { id: "travel", label: "Travel", color: "#3B82F6" },
  { id: "finance", label: "Finance", color: "#34D399" },
  { id: "social", label: "Social", color: "#FB7185" },
];

// Categories shown by default (before "More" dropdown)
const DEFAULT_VISIBLE_COUNT = 6;

export interface FeedFilterBarProps {
  activeCategories: TagCategory[];
  searchQuery: string;
  onCategoryToggle: (category: TagCategory | "all") => void;
  onSearchChange: (query: string) => void;
  onVoiceInput: () => void;
  onClearFilters: () => void;
  isListening?: boolean;
}

export function FeedFilterBar({
  activeCategories,
  searchQuery,
  onCategoryToggle,
  onSearchChange,
  onVoiceInput,
  onClearFilters,
  isListening = false,
}: FeedFilterBarProps) {
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const visibleCategories = FILTER_CATEGORIES.slice(0, DEFAULT_VISIBLE_COUNT);
  const moreCategories = FILTER_CATEGORIES.slice(DEFAULT_VISIBLE_COUNT);

  const hasActiveFilters =
    activeCategories.length > 0 || searchQuery.length > 0;
  const isAllSelected = activeCategories.length === 0;

  const handleCategoryClick = useCallback(
    (categoryId: TagCategory | "all") => {
      if (categoryId === "all") {
        onClearFilters();
      } else {
        onCategoryToggle(categoryId);
      }
    },
    [onCategoryToggle, onClearFilters],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchInputRef.current?.blur();
      }
      if (e.key === "Escape") {
        onSearchChange("");
        searchInputRef.current?.blur();
      }
    },
    [onSearchChange],
  );

  return (
    <div className="mb-6 space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div
          className={`
            relative flex flex-1 items-center gap-2 rounded-lg
            border bg-bg-elevated px-3 py-2 transition-all duration-200
            ${isFocused ? "border-accent-primary shadow-glow-purple-sm" : "border-border-subtle"}
          `}
        >
          <SearchIcon size={18} className="text-text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by tag or category..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleSearchKeyDown}
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="rounded p-0.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {/* Voice Input Button */}
        <button
          onClick={onVoiceInput}
          className={`
            flex h-[42px] w-[42px] items-center justify-center rounded-lg
            border transition-all duration-200
            ${
              isListening
                ? "border-accent-primary bg-accent-muted text-accent-primary animate-pulse"
                : "border-border-subtle bg-bg-elevated text-text-muted hover:border-accent-primary hover:text-accent-primary"
            }
          `}
          title="Voice search"
        >
          <MicrophoneIcon size={18} />
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {visibleCategories.map((category) => {
          const isActive =
            category.id === "all"
              ? isAllSelected
              : activeCategories.includes(category.id as TagCategory);

          return (
            <FilterPill
              key={category.id}
              label={category.label}
              color={category.color}
              isActive={isActive}
              onClick={() => handleCategoryClick(category.id)}
            />
          );
        })}

        {/* More Categories Dropdown */}
        {moreCategories.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMoreCategories(!showMoreCategories)}
              className={`
                flex items-center gap-1 rounded-full border px-3 py-1.5
                text-[12px] font-medium transition-all duration-200
                ${
                  showMoreCategories
                    ? "border-accent-primary bg-accent-muted text-accent-primary"
                    : "border-border-subtle bg-bg-elevated text-text-secondary hover:border-border-default"
                }
              `}
            >
              More
              <ChevronDownIcon
                size={14}
                className={`transition-transform ${showMoreCategories ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {showMoreCategories && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full z-20 mt-2 w-40 rounded-lg border border-border-subtle bg-bg-card p-2 shadow-lg"
                >
                  {moreCategories.map((category) => {
                    const isActive = activeCategories.includes(
                      category.id as TagCategory,
                    );
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          handleCategoryClick(category.id);
                          setShowMoreCategories(false);
                        }}
                        className={`
                          flex w-full items-center gap-2 rounded-md px-3 py-2
                          text-left text-[13px] transition-colors
                          ${
                            isActive
                              ? "bg-accent-muted text-accent-primary"
                              : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                          }
                        `}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Clear All Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="ml-auto flex items-center gap-1 text-[12px] text-text-muted transition-colors hover:text-accent-primary"
          >
            <XIcon size={12} />
            Clear filters
          </button>
        )}
      </div>

      {/* Active Filter Chips (when search has results) */}
      {searchQuery && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Searching:</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-muted px-2.5 py-1 text-[11px] font-medium text-accent-primary">
            &quot;{searchQuery}&quot;
            <button
              onClick={() => onSearchChange("")}
              className="ml-1 rounded-full p-0.5 hover:bg-accent-primary/20"
            >
              <XIcon size={10} />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

// Individual Filter Pill Component
interface FilterPillProps {
  label: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

function FilterPill({ label, color, isActive, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 rounded-full border px-3 py-1.5
        text-[12px] font-medium transition-all duration-200
        ${
          isActive
            ? "border-transparent bg-bg-elevated text-text-primary"
            : "border-border-subtle bg-transparent text-text-secondary hover:border-border-default hover:text-text-primary"
        }
      `}
      style={
        isActive
          ? {
              boxShadow: `0 0 12px ${color}40, 0 0 24px ${color}20`,
              borderColor: `${color}60`,
            }
          : {}
      }
    >
      {label !== "All" && (
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: isActive ? `0 0 6px ${color}` : "none",
          }}
        />
      )}
      {label}
    </button>
  );
}

export default FeedFilterBar;
