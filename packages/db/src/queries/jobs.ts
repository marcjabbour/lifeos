import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Job,
  JobWithItem,
  JobStatus,
  JobPlan,
  Item,
  CreateJobInput,
} from "../types";

export class JobQueries {
  constructor(
    private supabase: SupabaseClient,
    private userId: string,
  ) {}

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

  async getWithItem(id: string): Promise<JobWithItem> {
    const job = await this.get(id);

    if (!job) {
      throw new Error("Job not found");
    }

    const response: JobWithItem = { job };

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

  async create(input: CreateJobInput, plan?: JobPlan): Promise<Job> {
    const jobData = {
      user_id: this.userId,
      item_id: input.item_id,
      type: input.type ?? "process",
      status: "pending" as const,
      plan: plan ?? input.plan,
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

  async updateStatus(
    id: string,
    status: JobStatus,
    additionalData?: Record<string, unknown>,
  ): Promise<Job> {
    const updateData: Record<string, unknown> = {
      status,
      ...additionalData,
    };

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

  async fail(id: string, errorMessage: string): Promise<Job> {
    return this.updateStatus(id, "failed", { error_message: errorMessage });
  }

  async complete(id: string, result: Record<string, unknown>): Promise<Job> {
    return this.updateStatus(id, "completed", { result });
  }

  async listByItem(itemId: string): Promise<Job[]> {
    const { data: jobs, error } = await this.supabase
      .from("jobs")
      .select("*")
      .eq("item_id", itemId)
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    return jobs as Job[];
  }

  async listPending(limit = 10): Promise<Job[]> {
    const { data: jobs, error } = await this.supabase
      .from("jobs")
      .select("*")
      .eq("user_id", this.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch pending jobs: ${error.message}`);
    }

    return jobs as Job[];
  }
}

export function createJobQueries(
  supabase: SupabaseClient,
  userId: string,
): JobQueries {
  return new JobQueries(supabase, userId);
}
