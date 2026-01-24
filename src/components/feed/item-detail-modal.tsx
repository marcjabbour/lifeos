"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Badge,
  NovaBadge,
  Tag,
} from "@/components/ui";
import {
  NovaIcon,
  PlayIcon,
  DownloadIcon,
  ShareIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  ClockIcon,
  CalendarIcon,
  TagIcon,
  LinkIcon,
  XIcon,
} from "@/components/icons";
import { FeedItem } from "./items-feed";

interface ItemDetailModalProps {
  item: FeedItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemDetailModal({
  item,
  isOpen,
  onClose,
}: ItemDetailModalProps) {
  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.title}
      size="lg"
      showCloseButton={true}
    >
      <ModalBody className="p-0">
        {/* Hero Image/Thumbnail */}
        {(item.thumbnailUrl || item.imageUrl) && (
          <div className="relative">
            <img
              src={item.thumbnailUrl || item.imageUrl}
              alt={item.title}
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />

            {item.novaEnriched && (
              <div className="absolute top-4 left-4">
                <NovaBadge />
              </div>
            )}

            {item.type === "hero" && item.meta.duration && (
              <div className="absolute bottom-4 right-4">
                <Badge variant="default" className="backdrop-blur-sm">
                  <PlayIcon size={14} />
                  {item.meta.duration}
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="p-6">
          {/* Source and Meta */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {item.source.iconUrl && (
                <img
                  src={item.source.iconUrl}
                  alt={item.source.name}
                  className="w-6 h-6 rounded"
                />
              )}
              <span className="text-sm font-medium text-text-secondary">
                {item.source.name}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-text-muted">
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
              {item.meta.savedAt && (
                <span className="flex items-center gap-1">
                  <CalendarIcon size={14} />
                  Saved {item.meta.savedAt}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          {!item.thumbnailUrl && !item.imageUrl && (
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              {item.title}
            </h2>
          )}

          {/* Nova Commentary */}
          {item.novaCommentary && (
            <NovaInsightBlock text={item.novaCommentary} />
          )}

          {/* Description */}
          {item.description && (
            <p className="text-text-secondary leading-relaxed mb-4">
              {item.description}
            </p>
          )}

          {/* Quote (for article type) */}
          {item.quote && (
            <blockquote className="text-text-secondary italic pl-4 border-l-2 border-accent-primary mb-4 leading-relaxed">
              {item.quote}
            </blockquote>
          )}

          {/* Memory Images */}
          {item.memoryImages && item.memoryImages.length > 0 && (
            <div className="mb-4">
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
            <div className="mb-4">
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

          {/* Related Connections */}
          <RelatedConnections item={item} />
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <BookmarkIcon size={16} />
            </Button>
            <Button variant="ghost" size="sm">
              <ShareIcon size={16} />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary">
              <ExternalLinkIcon size={16} />
              Open Original
            </Button>
          </div>
        </div>
      </ModalFooter>
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
