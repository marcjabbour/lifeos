import { Hono } from "hono";
import { createJobQueries, createItemQueries } from "@lifeos/db";
import { inngest } from "../../inngest/client";

type Variables = {
  userId: string;
  supabase: unknown;
};

const app = new Hono<{ Variables: Variables }>();

app.get("/:id", async (c) => {
  const supabase = c.get("supabase") as Parameters<typeof createJobQueries>[0];
  const userId = c.get("userId");
  const jobQueries = createJobQueries(supabase, userId);

  const id = c.req.param("id");
  const result = await jobQueries.getWithItem(id);

  return c.json(result);
});

app.post("/", async (c) => {
  const supabase = c.get("supabase") as Parameters<typeof createJobQueries>[0];
  const userId = c.get("userId");
  const jobQueries = createJobQueries(supabase, userId);
  const itemQueries = createItemQueries(supabase, userId);

  const body = await c.req.json();
  const { item_id, type = "process" } = body;

  const item = await itemQueries.get(item_id);
  if (!item) {
    return c.json({ error: "Item not found" }, 404);
  }

  const job = await jobQueries.create({ item_id, type });

  await inngest.send({
    name: "job/process",
    data: {
      jobId: job.id,
      userId,
      itemId: item_id,
      type,
      source: item.source_type,
    },
  });

  return c.json(job, 201);
});

app.get("/item/:itemId", async (c) => {
  const supabase = c.get("supabase") as Parameters<typeof createJobQueries>[0];
  const userId = c.get("userId");
  const jobQueries = createJobQueries(supabase, userId);

  const itemId = c.req.param("itemId");
  const jobs = await jobQueries.listByItem(itemId);

  return c.json(jobs);
});

export default app;
