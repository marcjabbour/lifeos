// Database types for LifeOS Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Category type for items
export type ItemCategory =
  | "uncategorized"
  | "watch"
  | "read"
  | "listen"
  | "research"
  | "todo"
  | "buy"
  | "social"
  | "inspiration";

// Source type for items
export type SourceType =
  | "ios_share"
  | "voice"
  | "data_source"
  | "manual"
  | "slack";

// Conversation status
export type ConversationStatus = "pending" | "awaiting_reply" | "resolved";

// Message role in conversation
export type MessageRole = "user" | "assistant";

// Message structure (application-level type)
export interface ConversationMessage {
  role: MessageRole;
  content: string;
  timestamp: string;
  quick_replies?: string[];
}

// Push subscription keys
export interface PushKeys {
  p256dh: string;
  auth: string;
}

// Device info for push subscriptions
export interface DeviceInfo {
  userAgent?: string;
  platform?: string;
  language?: string;
}

// Database Row types (what Supabase returns/expects)
// These use Json for JSONB columns to match Supabase's expectations

export interface ItemRow {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  thumbnail_url: string | null;
  category: string;
  tags: string[];
  source_type: string;
  source_id: string | null;
  metadata: Json;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Pending item stored in conversation during clarification flow
export interface PendingItemData {
  type?: "url" | "image" | "text";
  title?: string;
  description?: string;
  originalContent?: string;
  content?: string;
  url?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  category?: string;
  tags?: string[];
}

export interface ConversationRow {
  id: string;
  item_id: string | null;
  status: string;
  messages: Json;
  pending_item: Json | null;
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  keys: Json;
  device_info: Json | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DataSourceRow {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  workflow_id: string | null;
  webhook_url: string | null;
  poll_interval: string | null;
  config: Json;
  default_category: string;
  is_active: boolean;
  last_sync_at: string | null;
  items_count: number;
  created_at: string;
  updated_at: string;
}

export interface SyncLogRow {
  id: string;
  data_source_id: string;
  status: string;
  items_added: number;
  items_updated: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface UserPreferenceRow {
  id: string;
  user_id: string;
  preference_type: string;
  pattern: string;
  action: string;
  confidence: number;
  times_applied: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardLayoutRow {
  id: string;
  user_id: string;
  name: string;
  config: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Application-level types (strongly typed, for use in application code)
export interface Item {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  thumbnail_url: string | null;
  category: ItemCategory;
  tags: string[];
  source_type: SourceType;
  source_id: string | null;
  metadata: Json;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  item_id: string | null;
  status: ConversationStatus;
  messages: ConversationMessage[];
  pendingItem?: PendingItemData | null;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: PushKeys;
  device_info: DeviceInfo | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Insert types for Supabase
export type ItemInsert = Partial<ItemRow> & {
  title: string;
  source_type: string;
};

export type ItemUpdate = Partial<Omit<ItemRow, "id" | "created_at">>;

export type ConversationInsert = Partial<ConversationRow> & {
  status?: string;
  messages?: Json;
};

export type ConversationUpdate = Partial<
  Omit<ConversationRow, "id" | "created_at">
>;

export type PushSubscriptionInsert = Partial<PushSubscriptionRow> & {
  endpoint: string;
  keys: Json;
};

export type PushSubscriptionUpdate = Partial<
  Omit<PushSubscriptionRow, "id" | "created_at">
>;

// Database schema for Supabase client typing
export interface Database {
  public: {
    Tables: {
      items: {
        Row: ItemRow;
        Insert: ItemInsert;
        Update: ItemUpdate;
      };
      conversations: {
        Row: ConversationRow;
        Insert: ConversationInsert;
        Update: ConversationUpdate;
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: PushSubscriptionInsert;
        Update: PushSubscriptionUpdate;
      };
      data_sources: {
        Row: DataSourceRow;
        Insert: Partial<DataSourceRow> & { name: string; type: string };
        Update: Partial<Omit<DataSourceRow, "id" | "created_at">>;
      };
      sync_logs: {
        Row: SyncLogRow;
        Insert: Partial<SyncLogRow> & {
          data_source_id: string;
          status: string;
        };
        Update: Partial<Omit<SyncLogRow, "id">>;
      };
      user_preferences: {
        Row: UserPreferenceRow;
        Insert: Partial<UserPreferenceRow> & {
          preference_type: string;
          pattern: string;
          action: string;
        };
        Update: Partial<Omit<UserPreferenceRow, "id" | "created_at">>;
      };
      dashboard_layouts: {
        Row: DashboardLayoutRow;
        Insert: Partial<DashboardLayoutRow> & { config: Json };
        Update: Partial<Omit<DashboardLayoutRow, "id" | "created_at">>;
      };
    };
  };
}

// Helper functions to convert between Row and Application types
export function toItem(row: ItemRow): Item {
  return {
    ...row,
    category: row.category as ItemCategory,
    source_type: row.source_type as SourceType,
  };
}

export function toConversation(row: ConversationRow): Conversation {
  return {
    ...row,
    status: row.status as ConversationStatus,
    messages: (row.messages || []) as unknown as ConversationMessage[],
    pendingItem: row.pending_item as PendingItemData | null,
  };
}

export function toPushSubscription(row: PushSubscriptionRow): PushSubscription {
  return {
    ...row,
    keys: row.keys as unknown as PushKeys,
    device_info: row.device_info as unknown as DeviceInfo | null,
  };
}

// API Response types
export interface ApiError {
  error: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
