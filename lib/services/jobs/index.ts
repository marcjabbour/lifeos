/**
 * Jobs Service Module
 *
 * Exports job-related services and utilities.
 */

// Job service class
export {
  JobService,
  createJobService,
  type JobPlan,
  type JobStatus,
} from "./job-service";

// Re-export UUID validation from items (shared utility)
export { isValidUUID, validateUUID } from "@/lib/services/items";

// Inngest client and events
export { inngest, type LifeOSEvent } from "./inngest";

// Inngest functions
export { functions, processContentJob, handleJobFailure } from "./functions";

// Helper to trigger a job
import { inngest } from "./inngest";
import type { ContentType } from "@/types/database";

/**
 * Trigger content processing job
 */
export async function triggerContentProcessing(params: {
  job_id: string;
  user_id: string;
  item_id: string;
  content_type: ContentType;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await inngest.send({
      name: "lifeos/job.created",
      data: params,
    });
    return { success: true };
  } catch (err) {
    console.error("Failed to trigger job:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to trigger job",
    };
  }
}

/**
 * Report job failure
 */
export async function reportJobFailure(params: {
  job_id: string;
  user_id: string;
  error: string;
}): Promise<{ success: boolean }> {
  try {
    await inngest.send({
      name: "lifeos/job.failed",
      data: params,
    });
    return { success: true };
  } catch (err) {
    console.error("Failed to report job failure:", err);
    return { success: false };
  }
}
