import type { Context, Next } from "hono";
import { createAuthenticatedClient } from "@lifeos/db";
import { logger } from "../utils/logger.js";

export interface AuthContext {
  userId: string;
  accessToken: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const accessToken = authHeader.slice(7);

  try {
    const supabase = createAuthenticatedClient(accessToken);
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      logger.warn({ error: error?.message }, "Auth validation failed");
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    c.set("userId", data.user.id);
    c.set("accessToken", accessToken);
  } catch (err) {
    logger.error({ err }, "Auth middleware error");
    return c.json({ error: "Authentication failed" }, 500);
  }

  return next();
}
