/**
 * Job Service
 *
 * Handles all job-related business logic including status tracking and lifecycle.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job, JobStatusResponse, Item } from "@/types/database";

export interface JobPlan {
  reasoning: string;
  steps: Array<{
    action: string;
    why: string;
  }>;
}

export type JobStatus = "pending" | "running" | "completed" | "failed";

export class JobService {
  constructor(
    private supabase: SupabaseClient,
    private userId: string,
  ) {}

  /**
   * Get a single job by ID
   */
  async get(id: string): Promise<Job | null> {
    const { data: job, error } = await this.supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch job: ${error.message}`);
    }

    return job as Job;
  }

  /**
   * Get a job with its associated item
   */
  async getWithItem(id: string): Promise<JobStatusResponse> {
    const job = await this.get(id);

    if (!job) {
      throw new Error("Job not found");
    }

    const response: JobStatusResponse = { job };

    // Fetch associated item if exists
    if (job.item_id) {
      const { data: item, error: itemError } = await this.supabase
        .from("items")
        .select("*")
        .eq("id", job.item_id)
        .eq("user_id", this.userId)
        .single();

      if (!itemError && item) {
        response.item = item as Item;
      }
    }

    return response;
  }

  /**
   * Create a new job for an item
   */
  async create(itemId: string, plan: JobPlan): Promise<Job> {
    const jobData = {
      user_id: this.userId,
      item_id: itemId,
      status: "pending" as const,
      plan,
      current_step: 0,
      step_results: [],
      result: {},
    };

    const { data: job, error } = await this.supabase
      .from("jobs")
      .insert(jobData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create job: ${error.message}`);
    }

    return job as Job;
  }

  /**
   * Update job status
   */
  async updateStatus(
    id: string,
    status: JobStatus,
    additionalData?: Record<string, unknown>,
  ): Promise<Job> {
    const updateData: Record<string, unknown> = {
      status,
      ...additionalData,
    };

    // Add timestamps based on status
    if (status === "running") {
      updateData.started_at = new Date().toISOString();
    } else if (status === "completed" || status === "failed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: job, error } = await this.supabase
      .from("jobs")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Job not found");
      }
      throw new Error(`Failed to update job: ${error.message}`);
    }

    return job as Job;
  }

  /**
   * Update job progress (current step and results)
   */
  async updateProgress(
    id: string,
    currentStep: number,
    stepResults: Array<Record<string, unknown>>,
  ): Promise<Job> {
    const { data: job, error } = await this.supabase
      .from("jobs")
      .update({
        current_step: currentStep,
        step_results: stepResults,
      })
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Job not found");
      }
      throw new Error(`Failed to update job progress: ${error.message}`);
    }

    return job as Job;
  }

  /**
   * Mark a job as failed with an error message
   */
  async fail(id: string, errorMessage: string): Promise<Job> {
    return this.updateStatus(id, "failed", {
      error_message: errorMessage,
    });
  }

  /**
   * Mark a job as completed with results
   */
  async complete(id: string, result: Record<string, unknown>): Promise<Job> {
    return this.updateStatus(id, "completed", { result });
  }
}

/**
 * Create a new JobService instance
 */
export function createJobService(
  supabase: SupabaseClient,
  userId: string,
): JobService {
  return new JobService(supabase, userId);
}
