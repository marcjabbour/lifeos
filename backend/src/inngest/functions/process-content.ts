import { inngest } from "../client";
import {
  ADKProcessRequestSchema,
  ADKProcessResponseSchema,
  type ADKProcessRequest,
  type ADKProcessResponse,
  type JobEvent,
} from "@lifeos/shared";
import { createServiceClient, createJobQueries } from "@lifeos/db";

const ADK_SERVICE_URL = process.env.ADK_SERVICE_URL ?? "http://localhost:4001";

export const processContent = inngest.createFunction(
  {
    id: "process-content",
    retries: 3,
  },
  { event: "job/process" },
  async ({ event, step, logger }) => {
    const { jobId, userId, itemId, source } = event.data as JobEvent;
    const startTime = Date.now();

    logger.info("Processing content job started", { jobId, userId, itemId });

    const supabase = createServiceClient();
    const jobQueries = createJobQueries(supabase, userId);

    await step.run("update-job-running", async () => {
      await jobQueries.updateStatus(jobId, "processing");
    });

    const item = await step.run("fetch-item", async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", itemId)
        .eq("user_id", userId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch item: ${error.message}`);
      }

      return data;
    });

    const adkRequest: ADKProcessRequest = {
      requestId: crypto.randomUUID(),
      jobId,
      content: {
        type: item.content_type ?? "text",
        text: item.raw_content,
        mediaUrl: item.media_url,
      },
      userId,
      itemId,
      source: (source as ADKProcessRequest["source"]) ?? "api",
    };

    const adkResponse = await step.run("call-adk-service", async () => {
      const validated = ADKProcessRequestSchema.parse(adkRequest);

      const response = await fetch(`${ADK_SERVICE_URL}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ADK service error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return ADKProcessResponseSchema.parse(result) as ADKProcessResponse;
    });

    if (!adkResponse.success) {
      await step.run("mark-job-failed", async () => {
        await jobQueries.fail(jobId, adkResponse.error ?? "Unknown error");
      });

      logger.error("ADK processing failed", {
        jobId,
        error: adkResponse.error,
      });

      return { success: false, error: adkResponse.error };
    }

    await step.run("update-item-with-result", async () => {
      const { analysis, item: itemResult } = adkResponse.result ?? {};

      if (!analysis) return;

      const updateData: Record<string, unknown> = {
        title: itemResult?.title ?? analysis.title,
        summary: analysis.summary,
        topics: analysis.topics,
        category: itemResult?.category,
        enrichment: itemResult?.enrichment ?? {},
        status: "enriched",
      };

      if (itemResult?.tags) {
        updateData.tags = itemResult.tags;
      }

      const { error } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", itemId)
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Failed to update item: ${error.message}`);
      }
    });

    await step.run("mark-job-completed", async () => {
      await jobQueries.complete(jobId, {
        analysis: adkResponse.result?.analysis,
        actions: adkResponse.result?.actions,
        meta: adkResponse.meta,
      });
    });

    const processingTimeMs = Date.now() - startTime;
    logger.info("ADK processing complete", {
      jobId,
      processingTimeMs,
      agentsInvoked: adkResponse.meta.agentsInvoked,
    });

    await step.sendEvent("send-notification", {
      name: "notification/send",
      data: {
        userId,
        jobId,
        itemId,
        type: "job-complete",
        channel: source === "whatsapp" ? "whatsapp" : "push",
      },
    });

    return {
      success: true,
      jobId,
      processingTimeMs,
      analysis: adkResponse.result?.analysis,
    };
  },
);
