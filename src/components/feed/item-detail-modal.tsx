"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Badge,
  NovaBadge,
  Tag,
  useToastActions,
} from "@/components/ui";
import {
  NovaIcon,
  ShareIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  ClockIcon,
  TagIcon,
  LinkIcon,
  EditIcon,
} from "@/components/icons";
import { FeedItem } from "./items-feed";
import { ItemEditForm } from "./item-edit-form";
import { TagCategory } from "@/lib/services/ai/embeddings/tags";
import type { Item, UpdateItemRequest } from "@/types/database";

// Category gradient map for accent bars
const CATEGORY_GRADIENT_MAP: Record<TagCategory | string, string> = {
  food: "bg-gradient-to-r from-red-500 to-orange-400",
  tech: "bg-gradient-to-r from-purple-500 to-indigo-400",
  music: "bg-gradient-to-r from-cyan-500 to-blue-400",
  entertainment: "bg-gradient-to-r from-pink-500 to-rose-400",
  fitness: "bg-gradient-to-r from-green-500 to-emerald-400",
  travel: "bg-gradient-to-r from-blue-500 to-sky-400",
  work: "bg-gradient-to-r from-amber-500 to-yellow-400",
  learning: "bg-gradient-to-r from-indigo-500 to-violet-400",
  finance: "bg-gradient-to-r from-emerald-500 to-teal-400",
  social: "bg-gradient-to-r from-rose-500 to-pink-400",
  uncategorized: "bg-gradient-to-r from-gray-500 to-slate-400",
};

// Category emoji map
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

interface ItemDetailModalProps {
  item: FeedItem | null;
  dbItem?: Item | null; // The original database item for editing
  isOpen: boolean;
  onClose: () => void;
  onItemUpdate?: (itemId: string, updates: UpdateItemRequest) => Promise<Item>;
}

export function ItemDetailModal({
  item,
  dbItem,
  isOpen,
  onClose,
  onItemUpdate,
}: ItemDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToastActions();

  // Handle save from edit form
  const handleSave = useCallback(
    async (updates: UpdateItemRequest) => {
      if (!item || !onItemUpdate) return;

      setIsSaving(true);
      try {
        await onItemUpdate(item.id, updates);
        toast.success("Item updated", "Your changes have been saved.");
        setIsEditMode(false);
      } catch (error) {
        console.error("Failed to update item:", error);
        toast.error("Failed to save changes", "Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [item, onItemUpdate, toast],
  );

  // Handle cancel from edit form
  const handleCancelEdit = useCallback(() => {
    setIsEditMode(false);
  }, []);

  // Handle modal close (reset edit mode)
  const handleClose = useCallback(() => {
    setIsEditMode(false);
    onClose();
  }, [onClose]);

  if (!item) return null;

  const category = item.category || "uncategorized";
  const gradientClass =
    CATEGORY_GRADIENT_MAP[category] || CATEGORY_GRADIENT_MAP.uncategorized;

  // Get the database item for editing (fallback to constructing from FeedItem)
  const itemForEditing: Item | null =
    dbItem ||
    (item
      ? {
          id: item.id,
          user_id: "",
          title: item.title,
          content: item.description || null,
          url: null,
          thumbnail_url: item.thumbnailUrl || null,
          content_type: null,
          category: (item.category as Item["category"]) || "uncategorized",
          tags: item.tags || [],
          source_type: "manual" as const,
          source_id: null,
          metadata: {},
          enrichment: item.novaCommentary
            ? { nova_commentary: item.novaCommentary }
            : {},
          has_enrichment: item.novaEnriched || false,
          is_archived: false,
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? "Edit Item" : ""}
      size="lg"
      showCloseButton={true}
    >
      <ModalBody className="p-0">
        {/* Category accent bar */}
        <div className={`h-1.5 w-full ${gradientClass}`} />

        <div className="p-6">
          {isEditMode && itemForEditing ? (
            /* Edit Mode - Show edit form */
            <ItemEditForm
              item={itemForEditing}
              onSave={handleSave}
              onCancel={handleCancelEdit}
              isLoading={isSaving}
            />
          ) : (
            /* Read-only Mode - Show item details */
            <>
              {/* Header with title and meta */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-xl font-semibold text-text-primary leading-tight">
                    {item.title}
                  </h2>
                  {item.novaEnriched && <NovaBadge />}
                </div>
                <div className="flex items-center gap-3 text-sm text-text-muted">
                  <span className="flex items-center gap-2">
                    <span className="text-base">
                      {getCategoryEmoji(category)}
                    </span>
                    <span className="font-medium">{item.source.name}</span>
                  </span>
                  <span className="text-text-muted/50">•</span>
                  {item.meta.duration && (
                    <span className="flex items-center gap-1">
                      <ClockIcon size={14} />
                      {item.meta.duration}
                    </span>
                  )}
                  {item.meta.readTime && (
                    <span className="flex items-center gap-1">
                      <ClockIcon size={14} />
                      {item.meta.readTime}
                    </span>
                  )}
                  {item.meta.savedAt && <span>Saved {item.meta.savedAt}</span>}
                </div>
              </div>

              {/* Nova Commentary - prominent section */}
              {item.novaCommentary && (
                <NovaInsightBlock text={item.novaCommentary} />
              )}

              {/* Description */}
              {item.description && (
                <p className="text-text-secondary leading-relaxed mb-6">
                  {item.description}
                </p>
              )}

              {/* Quote (for article type) */}
              {item.quote && (
                <blockquote
                  className={`text-text-secondary italic pl-4 border-l-2 mb-6 leading-relaxed ${gradientClass.includes("purple") ? "border-purple-400" : "border-accent-primary"}`}
                >
                  {item.quote}
                </blockquote>
              )}

              {/* Memory Images */}
              {item.memoryImages && item.memoryImages.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-text-primary mb-3">
                    Photos from this memory
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {item.memoryImages.map((img, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                      >
                        <img
                          src={img}
                          alt={`Memory ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                    <TagIcon size={14} />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Connections - core feature */}
              <RelatedConnections item={item} />
            </>
          )}
        </div>
      </ModalBody>

      {/* Only show footer in read-only mode (edit form has its own buttons) */}
      {!isEditMode && (
        <ModalFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <BookmarkIcon size={16} />
              </Button>
              <Button variant="ghost" size="sm">
                <ShareIcon size={16} />
              </Button>
              {onItemUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                  title="Edit item"
                >
                  <EditIcon size={16} />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button variant="primary">
                <ExternalLinkIcon size={16} />
                Open Original
              </Button>
            </div>
          </div>
        </ModalFooter>
      )}
    </Modal>
  );
}

// Nova Insight Block
function NovaInsightBlock({ text }: { text: string }) {
  return (
    <div className="bg-bg-elevated rounded-xl p-4 mb-4 border border-accent-primary/20">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-glow-purple-sm">
          <NovaIcon size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-accent-primary">
              Nova's Analysis
            </span>
            <Badge variant="nova" size="sm">
              AI Generated
            </Badge>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}

// Related Connections Component
function RelatedConnections({ item }: { item: FeedItem }) {
  // Mock related items
  const relatedItems = [
    {
      id: "r1",
      title: "Productivity Systems Deep Dive",
      source: "Saved Article",
      connection: "Same topic",
    },
    {
      id: "r2",
      title: "Weekly Review Notes",
      source: "Notes",
      connection: "Referenced",
    },
    {
      id: "r3",
      title: "Building a Second Brain",
      source: "Book Highlights",
      connection: "Related concept",
    },
  ];

  return (
    <div className="border-t border-border-subtle pt-4 mt-4">
      <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
        <LinkIcon size={14} />
        Nova found {relatedItems.length} connections
      </h4>
      <div className="space-y-2">
        {relatedItems.map((related) => (
          <motion.div
            key={related.id}
            whileHover={{ x: 4 }}
            className="flex items-center justify-between p-3 rounded-lg bg-bg-hover/50 hover:bg-bg-hover cursor-pointer transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm text-text-primary font-medium">
                {related.title}
              </p>
              <p className="text-xs text-text-muted">{related.source}</p>
            </div>
            <Badge variant="memory" size="sm">
              {related.connection}
            </Badge>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default ItemDetailModal;
