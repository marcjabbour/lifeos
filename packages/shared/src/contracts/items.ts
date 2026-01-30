import { z } from "zod";

export const ItemContentTypeSchema = z.enum(["url", "text", "image", "audio"]);
export type ItemContentType = z.infer<typeof ItemContentTypeSchema>;

export const SourceTypeSchema = z.enum([
  "browser_extension",
  "mobile_share",
  "email",
  "api",
  "manual",
  "whatsapp",
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const CategorySchema = z.enum([
  "uncategorized",
  "article",
  "video",
  "podcast",
  "book",
  "note",
  "image",
  "document",
  "social",
  "recipe",
  "product",
  "place",
  "event",
  "other",
]);
export type Category = z.infer<typeof CategorySchema>;

export const ItemMetadataSchema = z
  .object({
    author: z.string().optional(),
    published_date: z.string().optional(),
    read_time: z.number().optional(),
    word_count: z.number().optional(),
    duration: z.number().optional(),
    site_name: z.string().optional(),
    favicon_url: z.string().optional(),
  })
  .passthrough();
export type ItemMetadata = z.infer<typeof ItemMetadataSchema>;

export const ItemConnectionSchema = z.object({
  item_id: z.string().uuid(),
  title: z.string(),
  reason: z.string(),
});
export type ItemConnection = z.infer<typeof ItemConnectionSchema>;

export const ItemEnrichmentSchema = z
  .object({
    summary: z.string().optional(),
    key_points: z.array(z.string()).optional(),
    tags_suggested: z.array(z.string()).optional(),
    related_items: z.array(z.string()).optional(),
    nova_commentary: z.string().optional(),
    connections: z.array(ItemConnectionSchema).optional(),
  })
  .passthrough();
export type ItemEnrichment = z.infer<typeof ItemEnrichmentSchema>;

export const ItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  content: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  content_type: ItemContentTypeSchema.nullable().optional(),
  category: CategorySchema,
  tags: z.array(z.string()),
  source_type: SourceTypeSchema,
  source_id: z.string().nullable().optional(),
  metadata: ItemMetadataSchema,
  enrichment: ItemEnrichmentSchema,
  has_enrichment: z.boolean(),
  is_archived: z.boolean(),
  is_completed: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Item = z.infer<typeof ItemSchema>;

export const CreateItemRequestSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  content_type: ItemContentTypeSchema.optional(),
  category: CategorySchema.optional().default("uncategorized"),
  tags: z.array(z.string()).optional().default([]),
  source_type: SourceTypeSchema,
  source_id: z.string().optional(),
  metadata: ItemMetadataSchema.optional().default({}),
  enrichment: ItemEnrichmentSchema.optional().default({}),
});
export type CreateItemRequest = z.infer<typeof CreateItemRequestSchema>;

export const UpdateItemRequestSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  content_type: ItemContentTypeSchema.optional(),
  category: CategorySchema.optional(),
  tags: z.array(z.string()).optional(),
  metadata: ItemMetadataSchema.optional(),
  enrichment: ItemEnrichmentSchema.optional(),
  is_archived: z.boolean().optional(),
  is_completed: z.boolean().optional(),
});
export type UpdateItemRequest = z.infer<typeof UpdateItemRequestSchema>;

export const ItemsResponseSchema = z.object({
  items: z.array(ItemSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});
export type ItemsResponse = z.infer<typeof ItemsResponseSchema>;

export const ListItemsOptionsSchema = z.object({
  search: z.string().nullable().optional(),
  hasEnrichment: z.boolean().nullable().optional(),
  isArchived: z.boolean().nullable().optional(),
  contentType: ItemContentTypeSchema.nullable().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  cursor: z.string().nullable().optional(),
});
export type ListItemsOptions = z.infer<typeof ListItemsOptionsSchema>;
