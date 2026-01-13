/**
 * Database Types for LifeOS
 *
 * These types mirror the Supabase database schema.
 */

// Content type enum
export type ContentType = "url" | "text" | "image";

// Source type enum
export type SourceType =
  | "browser_extension"
  | "mobile_share"
  | "email"
  | "api"
  | "manual";

// Category type
export type Category =
  | "uncategorized"
  | "article"
  | "video"
  | "podcast"
  | "book"
  | "note"
  | "image"
  | "document"
  | "social"
  | "recipe"
  | "product"
  | "place"
  | "event"
  | "other";

// Item metadata structure
export interface ItemMetadata {
  author?: string;
  published_date?: string;
  read_time?: number;
  word_count?: number;
  duration?: number;
  site_name?: string;
  favicon_url?: string;
  [key: string]: unknown;
}

// Item enrichment structure (from Nova AI)
export interface ItemEnrichment {
  summary?: string;
  key_points?: string[];
  tags_suggested?: string[];
  related_items?: string[];
  nova_commentary?: string;
  connections?: Array<{
    item_id: string;
    title: string;
    reason: string;
  }>;
  [key: string]: unknown;
}

// Main Item type
export interface Item {
  id: string;
  user_id: string;
  title: string;
  content?: string | null;
  url?: string | null;
  thumbnail_url?: string | null;
  content_type?: ContentType | null;
  category: Category;
  tags: string[];
  source_type: SourceType;
  source_id?: string | null;
  metadata: ItemMetadata;
  enrichment: ItemEnrichment;
  has_enrichment: boolean;
  is_archived: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Items response for paginated list
export interface ItemsResponse {
  items: Item[];
  next_cursor: string | null;
  has_more: boolean;
}

// Create item request
export interface CreateItemRequest {
  title: string;
  content?: string;
  url?: string;
  thumbnail_url?: string;
  content_type?: ContentType;
  category?: Category;
  tags?: string[];
  source_type: SourceType;
  source_id?: string;
  metadata?: ItemMetadata;
  enrichment?: ItemEnrichment;
}

// Update item request
export interface UpdateItemRequest {
  title?: string;
  content?: string;
  url?: string;
  thumbnail_url?: string;
  content_type?: ContentType;
  category?: Category;
  tags?: string[];
  metadata?: ItemMetadata;
  enrichment?: ItemEnrichment;
  is_archived?: boolean;
  is_completed?: boolean;
}

// User profile type
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

// User preferences
export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  default_category?: Category;
  email_notifications?: boolean;
  weekly_digest?: boolean;
  nova_auto_enrich?: boolean;
  [key: string]: unknown;
}

// Chat/Conversation types
export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    tokens_used?: number;
    model?: string;
    sources?: Array<{ title: string; url: string; item_id?: string }>;
  };
  created_at: string;
}

// Collection type (for organizing items)
export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  item_count: number;
  created_at: string;
  updated_at: string;
}

// Collection item junction
export interface CollectionItem {
  collection_id: string;
  item_id: string;
  position: number;
  added_at: string;
}

// Share API types
export interface ShareRequest {
  url?: string;
  text?: string;
  title?: string;
  content?: string;
  source?: string; // Accepts any source identifier (ios_shortcut, share_sheet, etc.)
  content_type?: ContentType;
  metadata?: ItemMetadata;
  tags?: string[];
}

export interface ShareResponse {
  success: boolean;
  action?: "saved" | "working" | "error";
  item_id?: string;
  job_id?: string;
  message?: string;
  error?: string;
}

// Job status types
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
  id: string;
  user_id: string;
  item_id: string;
  type: "enrich" | "process" | "extract";
  status: JobStatus;
  progress: number;
  result?: Record<string, unknown>;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface JobStatusResponse {
  job: Job;
  item?: Item;
}
