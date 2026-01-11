// LifeOS Type Definitions
// Re-export database types for convenience
export type {
  ItemCategory,
  SourceType,
  ConversationStatus,
  MessageRole,
  ConversationMessage,
  PushKeys,
  DeviceInfo,
  Item,
  Conversation,
  PushSubscription,
  PendingItemData,
} from "./database";

// Import database types for internal use
import type { ItemCategory, Item } from "./database";

// Content types for share endpoint
export type ContentType = "url" | "image" | "text";

// Map our simple category names to database categories
export const CATEGORY_MAP: Record<string, ItemCategory> = {
  reading: "read",
  read: "read",
  watch: "watch",
  listen: "listen",
  research: "research",
  social: "social",
  tasks: "todo",
  todo: "todo",
  ideas: "inspiration",
  inspiration: "inspiration",
  buy: "buy",
  uncategorized: "uncategorized",
};

// Categories that the AI can output
export const AI_CATEGORIES = [
  "reading",
  "watch",
  "listen",
  "research",
  "social",
  "tasks",
  "ideas",
  "uncategorized",
] as const;

export type AICategory = (typeof AI_CATEGORIES)[number];

// Alias for backward compatibility with older code
export type Category = AICategory;

// SavedItem is an alias for Item (for backward compatibility)
export type SavedItem = Item;

// Helper to convert AI category to database category
export function toDbCategory(aiCategory: string): ItemCategory {
  return CATEGORY_MAP[aiCategory.toLowerCase()] || "uncategorized";
}

// Incoming share request from iOS Shortcut or PWA
export interface ShareRequest {
  type: ContentType;
  content: string;
  imageBase64?: string;
}

// AI categorization result
export interface CategorizationResult {
  category: AICategory;
  tags: string[];
  confidence: number;
  reasoning?: string;
}

// Parsed content from URL or text
export interface ParsedContent {
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
}

// Pending item for clarification flow (before saving)
export interface PendingItem {
  type: ContentType;
  title: string;
  description: string;
  content: string;
  url?: string;
  thumbnailUrl?: string;
  category?: AICategory;
  tags?: string[];
}

// Share API response
export interface ShareResponse {
  success: boolean;
  item?: Item;
  needsClarification?: boolean;
  question?: string;
  conversationId?: string;
  error?: string;
}

// Conversation reply request
export interface ConversationReplyRequest {
  conversationId: string;
  message: string;
}

// Conversation reply response
export interface ConversationReplyResponse {
  resolved: boolean;
  item?: Item;
  followUp?: string;
  error?: string;
}

// Push notification payload
export interface PushPayload {
  title: string;
  body: string;
  data?: {
    conversationId?: string;
    itemId?: string;
    action?: string;
  };
}

// Push subscription data (simplified version for API use)
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
