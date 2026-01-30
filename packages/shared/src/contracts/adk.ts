import { z } from "zod";

export const ContentTypeSchema = z.enum(["text", "url", "image", "audio"]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const SourceSchema = z.enum(["whatsapp", "web", "share", "api"]);
export type Source = z.infer<typeof SourceSchema>;

export const PrioritySchema = z.enum(["speed", "quality"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const ActionStatusSchema = z.enum(["completed", "skipped", "failed"]);
export type ActionStatus = z.infer<typeof ActionStatusSchema>;

export const ADKContentSchema = z.object({
  type: ContentTypeSchema,
  text: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
});
export type ADKContent = z.infer<typeof ADKContentSchema>;

export const ADKHintsSchema = z.object({
  skipWebSearch: z.boolean().default(false),
  skipEmbedding: z.boolean().default(false),
  prioritize: PrioritySchema.default("quality"),
});
export type ADKHints = z.infer<typeof ADKHintsSchema>;

export const ADKProcessRequestSchema = z.object({
  requestId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  content: ADKContentSchema,
  userId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  source: SourceSchema.default("api"),
  hints: ADKHintsSchema.optional(),
});
export type ADKProcessRequest = z.infer<typeof ADKProcessRequestSchema>;

export const ADKAnalysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  contentType: z.string(),
  confidence: z.number().min(0).max(1),
  topics: z.array(z.string()),
});
export type ADKAnalysis = z.infer<typeof ADKAnalysisSchema>;

export const ADKActionSchema = z.object({
  agent: z.string(),
  action: z.string(),
  status: ActionStatusSchema,
});
export type ADKAction = z.infer<typeof ADKActionSchema>;

export const ADKItemResultSchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  enrichment: z.record(z.unknown()),
});
export type ADKItemResult = z.infer<typeof ADKItemResultSchema>;

export const ADKResultSchema = z.object({
  analysis: ADKAnalysisSchema,
  actions: z.array(ADKActionSchema),
  item: ADKItemResultSchema.optional(),
});
export type ADKResult = z.infer<typeof ADKResultSchema>;

export const ADKMetaSchema = z.object({
  processingTimeMs: z.number(),
  agentsInvoked: z.array(z.string()),
});
export type ADKMeta = z.infer<typeof ADKMetaSchema>;

export const ADKProcessResponseSchema = z.object({
  requestId: z.string().uuid(),
  success: z.boolean(),
  result: ADKResultSchema.optional(),
  meta: ADKMetaSchema,
  error: z.string().optional(),
});
export type ADKProcessResponse = z.infer<typeof ADKProcessResponseSchema>;

export const ADKHealthResponseSchema = z.object({
  status: z.enum(["healthy", "unhealthy"]),
  version: z.string().optional(),
  uptime: z.number().optional(),
});
export type ADKHealthResponse = z.infer<typeof ADKHealthResponseSchema>;
