import { z } from "zod";

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

export const PaginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const CursorPaginationSchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.number().min(1).max(100).default(20),
});
export type CursorPagination = z.infer<typeof CursorPaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().optional(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable().optional(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  total?: number;
  hasMore: boolean;
  nextCursor?: string | null;
};

export const HealthCheckSchema = z.object({
  status: z.enum(["healthy", "unhealthy", "degraded"]),
  version: z.string().optional(),
  uptime: z.number().optional(),
  timestamp: z.string().datetime(),
  services: z
    .record(
      z.object({
        status: z.enum(["healthy", "unhealthy"]),
        latencyMs: z.number().optional(),
        error: z.string().optional(),
      }),
    )
    .optional(),
});
export type HealthCheck = z.infer<typeof HealthCheckSchema>;

export const UserContextSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  roles: z.array(z.string()).optional(),
});
export type UserContext = z.infer<typeof UserContextSchema>;

export const UUIDSchema = z.string().uuid();
export type UUID = z.infer<typeof UUIDSchema>;

export const TimestampSchema = z.string().datetime();
export type Timestamp = z.infer<typeof TimestampSchema>;
