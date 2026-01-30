export type ContentType = "url" | "text" | "image";

export type SourceType =
  | "browser_extension"
  | "mobile_share"
  | "email"
  | "api"
  | "manual"
  | "whatsapp";

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

export interface CreateItemInput {
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

export interface UpdateItemInput {
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

export interface ItemsPage {
  items: Item[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type JobType = "enrich" | "process" | "extract";

export interface JobPlan {
  reasoning: string;
  steps: Array<{
    action: string;
    why: string;
  }>;
}

export interface Job {
  id: string;
  user_id: string;
  item_id: string;
  type: JobType;
  status: JobStatus;
  plan?: JobPlan;
  current_step: number;
  step_results: Array<Record<string, unknown>>;
  result?: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateJobInput {
  item_id: string;
  type?: JobType;
  plan?: JobPlan;
}

export interface JobWithItem {
  job: Job;
  item?: Item;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  default_category?: Category;
  email_notifications?: boolean;
  weekly_digest?: boolean;
  nova_auto_enrich?: boolean;
  [key: string]: unknown;
}

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

export interface CollectionItem {
  collection_id: string;
  item_id: string;
  position: number;
  added_at: string;
}
