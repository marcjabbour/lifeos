/**
 * Item Service
 *
 * Handles all item-related business logic including CRUD operations.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Item,
  ItemsResponse,
  CreateItemRequest,
  UpdateItemRequest,
} from "@/types/database";

export interface ListItemsOptions {
  search?: string | null;
  hasEnrichment?: boolean | null;
  isArchived?: boolean | null;
  contentType?: string | null;
  limit?: number;
  cursor?: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Allowed fields that can be updated on an item
 */
const ALLOWED_UPDATE_FIELDS = [
  "title",
  "content",
  "url",
  "thumbnail_url",
  "category",
  "tags",
  "metadata",
  "enrichment",
  "has_enrichment",
  "is_archived",
  "is_completed",
] as const;

export class ItemService {
  constructor(
    private supabase: SupabaseClient,
    private userId: string,
  ) {}

  /**
   * List items with cursor-based pagination and filters
   */
  async list(options: ListItemsOptions = {}): Promise<ItemsResponse> {
    const { search, hasEnrichment, isArchived, contentType, cursor } = options;
    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    // Build query
    let query = this.supabase
      .from("items")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there are more

    // Apply filters
    if (hasEnrichment !== null && hasEnrichment !== undefined) {
      query = query.eq("has_enrichment", hasEnrichment);
    }

    if (isArchived !== null && isArchived !== undefined) {
      query = query.eq("is_archived", isArchived);
    } else {
      // By default, don't show archived items
      query = query.eq("is_archived", false);
    }

    if (contentType) {
      query = query.eq("content_type", contentType);
    }

    if (search) {
      // Full-text search on title and content
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Apply cursor for pagination
    if (cursor) {
      // Cursor is the created_at timestamp of the last item
      query = query.lt("created_at", cursor);
    }

    const { data: items, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    // Check if there are more items
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;

    // Generate next cursor
    const nextCursor = hasMore
      ? resultItems[resultItems.length - 1]?.created_at
      : null;

    return {
      items: resultItems as Item[],
      next_cursor: nextCursor,
      has_more: hasMore,
    };
  }

  /**
   * Get a single item by ID
   */
  async get(id: string): Promise<Item | null> {
    const { data: item, error } = await this.supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch item: ${error.message}`);
    }

    return item as Item;
  }

  /**
   * Create a new item
   */
  async create(data: CreateItemRequest): Promise<Item> {
    const itemData = {
      user_id: this.userId,
      title: data.title,
      content: data.content ?? null,
      url: data.url ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
      content_type: data.content_type ?? null,
      category: data.category ?? "uncategorized",
      tags: data.tags ?? [],
      source_type: data.source_type,
      source_id: data.source_id ?? null,
      metadata: data.metadata ?? {},
      enrichment: data.enrichment ?? {},
      has_enrichment:
        !!data.enrichment && Object.keys(data.enrichment).length > 0,
      is_archived: false,
      is_completed: false,
    };

    const { data: item, error } = await this.supabase
      .from("items")
      .insert(itemData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create item: ${error.message}`);
    }

    return item as Item;
  }

  /**
   * Update an existing item
   */
  async update(id: string, data: UpdateItemRequest): Promise<Item> {
    const updateData: Record<string, unknown> = {};

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (data[field as keyof UpdateItemRequest] !== undefined) {
        updateData[field] = data[field as keyof UpdateItemRequest];
      }
    }

    // If enrichment is being updated, also update has_enrichment
    if (updateData.enrichment !== undefined) {
      updateData.has_enrichment =
        !!updateData.enrichment &&
        Object.keys(updateData.enrichment as object).length > 0;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("No valid fields to update");
    }

    const { data: item, error } = await this.supabase
      .from("items")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Item not found");
      }
      throw new Error(`Failed to update item: ${error.message}`);
    }

    return item as Item;
  }

  /**
   * Archive an item (soft delete)
   */
  async archive(id: string): Promise<Item> {
    const { data: item, error } = await this.supabase
      .from("items")
      .update({ is_archived: true })
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Item not found");
      }
      throw new Error(`Failed to archive item: ${error.message}`);
    }

    return item as Item;
  }

  /**
   * Unarchive an item
   */
  async unarchive(id: string): Promise<Item> {
    const { data: item, error } = await this.supabase
      .from("items")
      .update({ is_archived: false })
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Item not found");
      }
      throw new Error(`Failed to unarchive item: ${error.message}`);
    }

    return item as Item;
  }
}

/**
 * Create a new ItemService instance
 */
export function createItemService(
  supabase: SupabaseClient,
  userId: string,
): ItemService {
  return new ItemService(supabase, userId);
}
