import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createAuthenticatedClient, createJobQueries } from "@lifeos/db";
import { CreateJobRequestSchema, UpdateJobRequestSchema } from "@lifeos/shared";
import { logger } from "../../utils/logger.js";

const jobs = new Hono<{
  Variables: {
    userId: string;
    accessToken: string;
  };
}>();

jobs.get("/:id", async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const id = c.req.param("id");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createJobQueries(supabase, userId);

  const result = await queries.getWithItem(id);

  return c.json(result);
});

jobs.post("/", zValidator("json", CreateJobRequestSchema), async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const data = c.req.valid("json");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createJobQueries(supabase, userId);

  const job = await queries.create(data);

  logger.info({ userId, jobId: job.id, type: job.type }, "Job created");

  return c.json(job, 201);
});

jobs.patch("/:id", zValidator("json", UpdateJobRequestSchema), async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const id = c.req.param("id");
  const data = c.req.valid("json");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createJobQueries(supabase, userId);

  try {
    const job = await queries.updateStatus(id, data.status ?? "pending", {
      progress: data.progress,
      result: data.result,
      error_message: data.error,
    });
    return c.json(job);
  } catch (err) {
    if (err instanceof Error && err.message === "Job not found") {
      return c.json({ error: "Job not found" }, 404);
    }
    throw err;
  }
});

jobs.get("/item/:itemId", async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const itemId = c.req.param("itemId");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createJobQueries(supabase, userId);

  const jobsList = await queries.listByItem(itemId);

  return c.json({ jobs: jobsList });
});

export default jobs;
