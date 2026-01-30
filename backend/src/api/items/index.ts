import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createAuthenticatedClient, createItemQueries } from "@lifeos/db";
import {
  CreateItemRequestSchema,
  UpdateItemRequestSchema,
  ListItemsOptionsSchema,
} from "@lifeos/shared";
import { logger } from "../../utils/logger.js";

const items = new Hono<{
  Variables: {
    userId: string;
    accessToken: string;
  };
}>();

items.get("/", zValidator("query", ListItemsOptionsSchema), async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const options = c.req.valid("query");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createItemQueries(supabase, userId);

  const result = await queries.list(options);

  return c.json({
    items: result.items,
    next_cursor: result.nextCursor,
    has_more: result.hasMore,
  });
});

items.get("/:id", async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const id = c.req.param("id");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createItemQueries(supabase, userId);

  const item = await queries.get(id);

  if (!item) {
    return c.json({ error: "Item not found" }, 404);
  }

  return c.json(item);
});

items.post("/", zValidator("json", CreateItemRequestSchema), async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const data = c.req.valid("json");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createItemQueries(supabase, userId);

  const item = await queries.create(data);

  logger.info({ userId, itemId: item.id }, "Item created");

  return c.json(item, 201);
});

items.patch("/:id", zValidator("json", UpdateItemRequestSchema), async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const id = c.req.param("id");
  const data = c.req.valid("json");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createItemQueries(supabase, userId);

  try {
    const item = await queries.update(id, data);
    return c.json(item);
  } catch (err) {
    if (err instanceof Error && err.message === "Item not found") {
      return c.json({ error: "Item not found" }, 404);
    }
    throw err;
  }
});

items.post("/:id/archive", async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const id = c.req.param("id");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createItemQueries(supabase, userId);

  try {
    const item = await queries.archive(id);
    return c.json(item);
  } catch (err) {
    if (err instanceof Error && err.message === "Item not found") {
      return c.json({ error: "Item not found" }, 404);
    }
    throw err;
  }
});

items.post("/:id/unarchive", async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const id = c.req.param("id");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createItemQueries(supabase, userId);

  try {
    const item = await queries.unarchive(id);
    return c.json(item);
  } catch (err) {
    if (err instanceof Error && err.message === "Item not found") {
      return c.json({ error: "Item not found" }, 404);
    }
    throw err;
  }
});

items.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const id = c.req.param("id");

  const supabase = createAuthenticatedClient(accessToken);
  const queries = createItemQueries(supabase, userId);

  await queries.delete(id);

  logger.info({ userId, itemId: id }, "Item deleted");

  return c.json({ success: true });
});

export default items;
