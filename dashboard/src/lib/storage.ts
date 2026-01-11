import { createServerClient } from "@/lib/supabase";
import type {
  Item,
  Conversation,
  ConversationMessage,
  ItemCategory,
  SourceType,
} from "@/types/database";
import type { PendingItem } from "@/types";

// Get server-side Supabase client with service role (bypasses RLS)
function getDb() {
  return createServerClient(true);
}

// =============================================================================
// Items Storage
// =============================================================================

export interface SaveItemInput {
  title: string;
  content: string | null;
  url?: string;
  thumbnailUrl?: string;
  category: ItemCategory;
  tags: string[];
  sourceType: SourceType;
  metadata?: Record<string, unknown>;
}

export async function saveItem(input: SaveItemInput): Promise<Item> {
  const db = getDb();

  const { data, error } = await db
    .from("items")
    .insert({
      title: input.title,
      content: input.content,
      url: input.url,
      thumbnail_url: input.thumbnailUrl,
      category: input.category,
      tags: input.tags,
      source_type: input.sourceType,
      metadata: input.metadata || {},
      is_completed: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to save item:", error);
    throw new Error(`Failed to save item: ${error.message}`);
  }

  return {
    ...data,
    category: data.category as ItemCategory,
    source_type: data.source_type as SourceType,
  };
}

export async function getItem(id: string): Promise<Item | null> {
  const db = getDb();

  const { data, error } = await db
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    category: data.category as ItemCategory,
    source_type: data.source_type as SourceType,
  };
}

// =============================================================================
// Conversations Storage
// =============================================================================

export interface CreateConversationInput {
  pendingItem: PendingItem;
  initialQuestion: string;
}

export async function createConversation(
  input: CreateConversationInput,
): Promise<Conversation> {
  const db = getDb();
  const now = new Date().toISOString();

  const messages: ConversationMessage[] = [
    {
      role: "assistant",
      content: input.initialQuestion,
      timestamp: now,
    },
  ];

  // Store pending item in metadata for later retrieval
  const { data, error } = await db
    .from("conversations")
    .insert({
      status: "pending",
      messages: messages as unknown as Record<string, unknown>[],
      // We'll store pending item data in the conversation for later use
      // Note: This uses a denormalized approach since pending items aren't saved yet
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create conversation:", error);
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  // Store pending item in memory for now (in production, use Redis or similar)
  pendingItemsCache.set(data.id, input.pendingItem);

  return {
    id: data.id,
    item_id: data.item_id,
    status: data.status as "pending" | "awaiting_reply" | "resolved",
    messages: messages,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getConversation(
  id: string,
): Promise<Conversation | null> {
  const db = getDb();

  const { data, error } = await db
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    item_id: data.item_id,
    status: data.status as "pending" | "awaiting_reply" | "resolved",
    messages: (data.messages || []) as ConversationMessage[],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function updateConversation(
  id: string,
  updates: {
    status?: "pending" | "awaiting_reply" | "resolved";
    messages?: ConversationMessage[];
    itemId?: string;
  },
): Promise<Conversation | null> {
  const db = getDb();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) {
    updateData.status = updates.status;
  }
  if (updates.messages) {
    updateData.messages = updates.messages as unknown as Record<
      string,
      unknown
    >[];
  }
  if (updates.itemId) {
    updateData.item_id = updates.itemId;
  }

  const { data, error } = await db
    .from("conversations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("Failed to update conversation:", error);
    return null;
  }

  return {
    id: data.id,
    item_id: data.item_id,
    status: data.status as "pending" | "awaiting_reply" | "resolved",
    messages: (data.messages || []) as ConversationMessage[],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function addMessageToConversation(
  id: string,
  message: ConversationMessage,
): Promise<Conversation | null> {
  const conversation = await getConversation(id);
  if (!conversation) return null;

  const updatedMessages = [...conversation.messages, message];
  return updateConversation(id, { messages: updatedMessages });
}

// =============================================================================
// Pending Items Cache (temporary storage during clarification)
// In production, use Redis or store in a dedicated table
// =============================================================================

const pendingItemsCache = new Map<string, PendingItem>();

export function getPendingItem(
  conversationId: string,
): PendingItem | undefined {
  return pendingItemsCache.get(conversationId);
}

export function setPendingItem(
  conversationId: string,
  item: PendingItem,
): void {
  pendingItemsCache.set(conversationId, item);
}

export function deletePendingItem(conversationId: string): void {
  pendingItemsCache.delete(conversationId);
}

// =============================================================================
// Push Subscriptions Storage
// =============================================================================

export async function savePushSubscription(
  userId: string,
  endpoint: string,
  keys: { p256dh: string; auth: string },
  deviceInfo?: { userAgent?: string; platform?: string; language?: string },
): Promise<void> {
  const db = getDb();

  // Check if subscription exists
  const { data: existing } = await db
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .single();

  if (existing) {
    // Update existing
    const { error } = await db
      .from("push_subscriptions")
      .update({
        keys: keys as unknown as Record<string, unknown>,
        device_info: deviceInfo as unknown as Record<string, unknown> | null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to update push subscription:", error);
      throw new Error("Failed to update push subscription");
    }
  } else {
    // Insert new
    const { error } = await db.from("push_subscriptions").insert({
      user_id: userId,
      endpoint,
      keys: keys as unknown as Record<string, unknown>,
      device_info: deviceInfo as unknown as Record<string, unknown> | null,
      is_active: true,
    });

    if (error) {
      console.error("Failed to save push subscription:", error);
      throw new Error("Failed to save push subscription");
    }
  }
}

export async function getPushSubscription(userId: string): Promise<{
  endpoint: string;
  keys: { p256dh: string; auth: string };
} | null> {
  const db = getDb();

  const { data, error } = await db
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  const keys = data.keys as { p256dh: string; auth: string };
  return {
    endpoint: data.endpoint,
    keys,
  };
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const db = getDb();

  await db
    .from("push_subscriptions")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("endpoint", endpoint);
}
