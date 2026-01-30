"use client";

import { useState, useCallback, FormEvent, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Button, Input, Textarea, Badge } from "@/components/ui";
import { CloseIcon, TagIcon, LinkIcon, ImageIcon } from "@/components/icons";
import type { Item, UpdateItemRequest, Category } from "@/types/database";
import type { TagCategory } from "@/lib/services/ai/embeddings/tags";

// Available categories for selection
const CATEGORIES: { value: TagCategory; label: string; emoji: string }[] = [
  { value: "food", label: "Food", emoji: "🍕" },
  { value: "tech", label: "Tech", emoji: "💻" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "entertainment", label: "Entertainment", emoji: "🎬" },
  { value: "fitness", label: "Fitness", emoji: "💪" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "work", label: "Work", emoji: "💼" },
  { value: "learning", label: "Learning", emoji: "📚" },
  { value: "finance", label: "Finance", emoji: "💰" },
  { value: "social", label: "Social", emoji: "👥" },
  { value: "uncategorized", label: "Uncategorized", emoji: "📌" },
];

interface ItemEditFormProps {
  item: Item;
  onSave: (updates: UpdateItemRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ItemEditForm({
  item,
  onSave,
  onCancel,
  isLoading = false,
}: ItemEditFormProps) {
  // Form state
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content || "");
  const [category, setCategory] = useState<TagCategory>(
    (item.category as TagCategory) || "uncategorized",
  );
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [url, setUrl] = useState(item.url || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnail_url || "");
  const [tagInput, setTagInput] = useState("");

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length > 255) {
      newErrors.title = "Title must be 255 characters or less";
    }

    if (url && !isValidUrl(url)) {
      newErrors.url = "Please enter a valid URL";
    }

    if (thumbnailUrl && !isValidUrl(thumbnailUrl)) {
      newErrors.thumbnailUrl = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, url, thumbnailUrl]);

  // Check if URL is valid
  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const updates: UpdateItemRequest = {
      title: title.trim(),
      content: content.trim() || undefined,
      category: category as Category,
      tags,
      url: url.trim() || undefined,
      thumbnail_url: thumbnailUrl.trim() || undefined,
    };

    await onSave(updates);
  };

  // Handle adding a tag
  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags((prev) => [...prev, trimmedTag]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  // Handle tag input key press (Enter to add)
  const handleTagKeyPress = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag],
  );

  // Handle removing a tag
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }, []);

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* Title */}
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter item title"
        error={errors.title}
        disabled={isLoading}
        maxLength={255}
        required
      />

      {/* Content/Description */}
      <Textarea
        label="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a description or notes..."
        disabled={isLoading}
        className="min-h-[100px]"
      />

      {/* Category */}
      <div className="w-full">
        <label className="mb-2 block text-sm font-medium text-text-primary">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              disabled={isLoading}
              className={`
                inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm
                transition-all duration-200
                ${
                  category === cat.value
                    ? "bg-accent-primary/20 text-accent-primary ring-1 ring-accent-primary"
                    : "bg-bg-elevated text-text-secondary hover:bg-bg-hover"
                }
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="w-full">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-text-primary">
          <TagIcon size={14} />
          Tags
        </label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyPress}
            placeholder="Add a tag..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddTag}
            disabled={isLoading || !tagInput.trim()}
          >
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="inline-flex items-center gap-1.5 pr-1"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  disabled={isLoading}
                  className="rounded-full p-0.5 hover:bg-white/20 transition-colors"
                  aria-label={`Remove tag ${tag}`}
                >
                  <CloseIcon size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* URL */}
      <Input
        label="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        error={errors.url}
        disabled={isLoading}
        leftIcon={<LinkIcon size={16} />}
        type="url"
      />

      {/* Thumbnail URL */}
      <Input
        label="Thumbnail URL"
        value={thumbnailUrl}
        onChange={(e) => setThumbnailUrl(e.target.value)}
        placeholder="https://example.com/image.jpg"
        error={errors.thumbnailUrl}
        disabled={isLoading}
        leftIcon={<ImageIcon size={16} />}
        type="url"
      />

      {/* Thumbnail Preview */}
      {thumbnailUrl && isValidUrl(thumbnailUrl) && (
        <div className="w-full">
          <label className="mb-2 block text-sm font-medium text-text-primary">
            Thumbnail Preview
          </label>
          <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border border-border bg-bg-elevated">
            <img
              src={thumbnailUrl}
              alt="Thumbnail preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </motion.form>
  );
}

export default ItemEditForm;
