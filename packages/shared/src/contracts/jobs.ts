import { z } from "zod";
import { ItemSchema } from "./items";

export const JobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobTypeSchema = z.enum(["enrich", "process", "extract"]);
export type JobType = z.infer<typeof JobTypeSchema>;

export const JobSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  item_id: z.string().uuid(),
  type: JobTypeSchema,
  status: JobStatusSchema,
  progress: z.number().min(0).max(100),
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Job = z.infer<typeof JobSchema>;

export const CreateJobRequestSchema = z.object({
  item_id: z.string().uuid(),
  type: JobTypeSchema,
});
export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

export const UpdateJobRequestSchema = z.object({
  status: JobStatusSchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});
export type UpdateJobRequest = z.infer<typeof UpdateJobRequestSchema>;

export const JobStatusResponseSchema = z.object({
  job: JobSchema,
  item: ItemSchema.optional(),
});
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;

export const JobEventSchema = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  itemId: z.string().uuid(),
  type: JobTypeSchema,
  source: z.string().optional(),
});
export type JobEvent = z.infer<typeof JobEventSchema>;

export const JobResultSchema = z.object({
  success: z.boolean(),
  processingTimeMs: z.number().optional(),
  error: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});
export type JobResult = z.infer<typeof JobResultSchema>;
