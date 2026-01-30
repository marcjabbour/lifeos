import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Item,
  ItemsPage,
  CreateItemInput,
  UpdateItemInput,
} from "../types";

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

export class ItemQueries {
  constructor(
    private supabase: SupabaseClient,
    private userId: string,
  ) {}

  async list(options: ListItemsOptions = {}): Promise<ItemsPage> {
    const { search, hasEnrichment, isArchived, contentType, cursor } = options;
    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    let query = this.supabase
      .from("items")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (hasEnrichment !== null && hasEnrichment !== undefined) {
      query = query.eq("has_enrichment", hasEnrichment);
    }

    if (isArchived !== null && isArchived !== undefined) {
      query = query.eq("is_archived", isArchived);
    } else {
      query = query.eq("is_archived", false);
    }

    if (contentType) {
      query = query.eq("content_type", contentType);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: items, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore
      ? resultItems[resultItems.length - 1]?.created_at
      : null;

    return {
      items: resultItems as Item[],
      nextCursor,
      hasMore,
    };
  }

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

  async create(data: CreateItemInput): Promise<Item> {
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

  async update(id: string, data: UpdateItemInput): Promise<Item> {
    const updateData: Record<string, unknown> = {};

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (data[field as keyof UpdateItemInput] !== undefined) {
        updateData[field] = data[field as keyof UpdateItemInput];
      }
    }

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

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("items")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) {
      throw new Error(`Failed to delete item: ${error.message}`);
    }
  }
}

export function createItemQueries(
  supabase: SupabaseClient,
  userId: string,
): ItemQueries {
  return new ItemQueries(supabase, userId);
}
