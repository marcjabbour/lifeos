import { Hono } from "hono";
import { createItemQueries } from "@lifeos/db";

type Variables = {
  userId: string;
  supabase: unknown;
};

const app = new Hono<{ Variables: Variables }>();

app.get("/", async (c) => {
  const supabase = c.get("supabase") as Parameters<typeof createItemQueries>[0];
  const userId = c.get("userId");
  const itemQueries = createItemQueries(supabase, userId);

  const cursor = c.req.query("cursor");
  const limit = parseInt(c.req.query("limit") ?? "20", 10);
  const search = c.req.query("search");
  const contentType = c.req.query("contentType");
  const archived = c.req.query("archived") === "true";

  const result = await itemQueries.list({
    cursor,
    limit,
    search,
    contentType,
    isArchived: archived,
  });

  return c.json(result);
});

app.get("/:id", async (c) => {
  const supabase = c.get("supabase") as Parameters<typeof createItemQueries>[0];
  const userId = c.get("userId");
  const itemQueries = createItemQueries(supabase, userId);

  const id = c.req.param("id");
  const item = await itemQueries.get(id);

  if (!item) {
    return c.json({ error: "Item not found" }, 404);
  }

  return c.json(item);
});

app.post("/", async (c) => {
  const supabase = c.get("supabase") as Parameters<typeof createItemQueries>[0];
  const userId = c.get("userId");
  const itemQueries = createItemQueries(supabase, userId);

  const body = await c.req.json();
  const item = await itemQueries.create(body);

  return c.json(item, 201);
});

app.patch("/:id", async (c) => {
  const supabase = c.get("supabase") as Parameters<typeof createItemQueries>[0];
  const userId = c.get("userId");
  const itemQueries = createItemQueries(supabase, userId);

  const id = c.req.param("id");
  const body = await c.req.json();

  const item = await itemQueries.update(id, body);

  return c.json(item);
});

app.delete("/:id", async (c) => {
  const supabase = c.get("supabase") as Parameters<typeof createItemQueries>[0];
  const userId = c.get("userId");
  const itemQueries = createItemQueries(supabase, userId);

  const id = c.req.param("id");
  await itemQueries.archive(id);

  return c.json({ success: true });
});

export default app;
