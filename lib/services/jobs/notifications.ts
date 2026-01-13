/**
 * Job Notification Integration
 *
 * Sends push notifications when jobs complete or fail.
 * Designed to be called from Inngest/background job functions.
 */

import { getServiceClient } from "@/lib/core/database";
import {
  sendJobCompletionNotification,
  sendConversationNotification,
} from "@/lib/services/push";

interface Job {
  id: string;
  user_id: string;
  item_id: string | null;
  status: "pending" | "running" | "completed" | "failed";
  plan: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  current_step: number;
  created_at: string;
  updated_at: string;
}

interface Item {
  id: string;
  title: string;
  content_type: string;
}

/**
 * Notify user when a job completes
 * Call this at the end of your Inngest job function
 */
export async function notifyJobCompletion(jobId: string): Promise<void> {
  const supabase = getServiceClient();

  // Fetch job details
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    console.error("Failed to fetch job for notification:", jobError);
    return;
  }

  // Fetch associated item if exists
  let item: Item | undefined;
  if (job.item_id) {
    const { data: itemData } = await supabase
      .from("items")
      .select("id, title, content_type")
      .eq("id", job.item_id)
      .single();

    if (itemData) {
      item = itemData;
    }
  }

  // Send push notification
  await sendJobCompletionNotification(
    job.user_id,
    {
      id: job.id,
      status: job.status as "completed" | "failed",
      result: job.result,
      error_message: job.error_message,
    },
    item,
  );
}

/**
 * Notify user when Nova responds in a conversation
 */
export async function notifyConversationResponse(
  conversationId: string,
  messageContent: string,
): Promise<void> {
  const supabase = getServiceClient();

  // Fetch conversation details
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, user_id, title")
    .eq("id", conversationId)
    .single();

  if (error || !conversation) {
    console.error("Failed to fetch conversation for notification:", error);
    return;
  }

  // Send push notification
  await sendConversationNotification(
    conversation.user_id,
    {
      id: conversation.id,
      title: conversation.title,
    },
    {
      role: "assistant",
      content: messageContent,
    },
  );
}

/**
 * Job completion callback for Inngest
 * Use this as a step in your job function
 */
export async function onJobComplete(job: Job): Promise<void> {
  if (job.status === "completed" || job.status === "failed") {
    await notifyJobCompletion(job.id);
  }
}

/**
 * Update job status and notify
 * Helper function for job execution
 */
export async function updateJobAndNotify(
  jobId: string,
  updates: {
    status: "completed" | "failed";
    result?: Record<string, unknown>;
    error_message?: string;
  },
): Promise<void> {
  const supabase = getServiceClient();

  // Update job
  const { error } = await supabase
    .from("jobs")
    .update({
      status: updates.status,
      result: updates.result || null,
      error_message: updates.error_message || null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    console.error("Failed to update job:", error);
    return;
  }

  // Send notification
  await notifyJobCompletion(jobId);
}
