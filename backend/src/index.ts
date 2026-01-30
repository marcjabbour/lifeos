import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { corsMiddleware, authMiddleware } from "./middleware/index.js";
import { logger } from "./utils/logger.js";
import health from "./api/health/index.js";
import items from "./api/items/index.js";
import jobs from "./api/jobs/index.js";
import whatsappWebhook from "./api/whatsapp/webhook.js";
import whatsappLink from "./api/whatsapp/link.js";
import { inngestServe } from "./inngest/index.js";

const app = new Hono();

app.use("*", corsMiddleware);

app.route("/health", health);
app.on(["GET", "POST", "PUT"], "/api/inngest", inngestServe);
app.route("/api/whatsapp/webhook", whatsappWebhook);

app.use("/api/*", authMiddleware);

app.route("/api/items", items);
app.route("/api/jobs", jobs);
app.route("/api/whatsapp/link", whatsappLink);

app.onError((err, c) => {
  logger.error({ err, path: c.req.path }, "Unhandled error");
  return c.json({ error: "Internal server error" }, 500);
});

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

const port = parseInt(process.env.PORT ?? "4000", 10);

logger.info({ port }, "Starting backend server");

serve({ fetch: app.fetch, port });
