/**
 * ADK Agent Service HTTP Server
 *
 * Provides HTTP endpoints for the ADK orchestrator pipeline.
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import {
  ADKProcessRequestSchema,
  type ADKProcessRequest,
  type ADKProcessResponse,
  type ADKHealthResponse,
} from "@lifeos/shared";
import {
  runOrchestratorPipeline,
  shouldUseOrchestrator,
  isOrchestratorEnabled,
} from "./orchestrator.js";
import { shutdownLangfuse } from "./observability/index.js";
import { logger } from "./utils/index.js";

const log = logger.child({ service: "adk-agent" });

const app = new Hono();
const startTime = Date.now();

// Middleware
app.use("/*", cors());

// Health check endpoint
app.get("/health", (c) => {
  const response: ADKHealthResponse = {
    status: "healthy",
    version: process.env.npm_package_version || "0.1.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
  return c.json(response);
});

// Readiness check endpoint
app.get("/ready", (c) => {
  const ready = isOrchestratorEnabled();
  if (!ready) {
    return c.json(
      { status: "not_ready", reason: "Orchestrator not enabled" },
      503,
    );
  }
  return c.json({ status: "ready" });
});

// Main processing endpoint
app.post("/process", zValidator("json", ADKProcessRequestSchema), async (c) => {
  const request = c.req.valid("json") as ADKProcessRequest;

  log.info(
    {
      requestId: request.requestId,
      contentType: request.content.type,
      userId: request.userId,
      source: request.source,
    },
    "Processing request",
  );

  const startMs = Date.now();

  try {
    // Check if orchestrator should handle this content type
    if (!shouldUseOrchestrator(request.content.type)) {
      return c.json(
        {
          requestId: request.requestId,
          success: false,
          meta: {
            processingTimeMs: Date.now() - startMs,
            agentsInvoked: [],
          },
          error: `Unsupported content type: ${request.content.type}`,
        } satisfies ADKProcessResponse,
        400,
      );
    }

    // Run the orchestrator pipeline
    const result = await runOrchestratorPipeline({
      content: request.content.text || request.content.mediaUrl || "",
      contentType: request.content.type,
      contentUrl: request.content.mediaUrl,
      userId: request.userId,
      itemId: request.itemId,
      jobId: request.jobId,
      metadata: {
        source: request.source,
        hints: request.hints,
        caption: request.content.caption,
      },
    });

    const response: ADKProcessResponse = {
      requestId: request.requestId,
      success: result.success,
      result: result.success
        ? {
            analysis: {
              title: result.analysis.title || "Untitled",
              summary: result.analysis.summary,
              contentType: result.analysis.contentType,
              confidence: result.analysis.confidence,
              topics: result.analysis.topics || [],
            },
            actions: result.actions.map((a) => ({
              agent: a.type,
              action: a.type,
              status: a.status,
            })),
            item: result.itemId
              ? {
                  title: result.analysis.title || "Untitled",
                  content: result.analysis.summary,
                  category: "uncategorized",
                  tags: result.analysis.topics || [],
                  enrichment: {},
                }
              : undefined,
          }
        : undefined,
      meta: {
        processingTimeMs: result.durationMs,
        agentsInvoked: ["InputAnalyzer", "ActionDecider", "ActionExecutor"],
      },
      error: result.error,
    };

    log.info(
      {
        requestId: request.requestId,
        success: result.success,
        durationMs: result.durationMs,
        itemId: result.itemId,
      },
      "Request processed",
    );

    return c.json(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    log.error(
      {
        requestId: request.requestId,
        error: errorMessage,
        durationMs: Date.now() - startMs,
      },
      "Request failed",
    );

    return c.json(
      {
        requestId: request.requestId,
        success: false,
        meta: {
          processingTimeMs: Date.now() - startMs,
          agentsInvoked: [],
        },
        error: errorMessage,
      } satisfies ADKProcessResponse,
      500,
    );
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  log.info("Received SIGTERM, shutting down gracefully");
  await shutdownLangfuse();
  process.exit(0);
});

process.on("SIGINT", async () => {
  log.info("Received SIGINT, shutting down gracefully");
  await shutdownLangfuse();
  process.exit(0);
});

// Start server
const port = parseInt(process.env.PORT || "4001", 10);

serve({ fetch: app.fetch, port }, () => {
  log.info({ port }, "ADK Agent Service started");
});

export default app;
