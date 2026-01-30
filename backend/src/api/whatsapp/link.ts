import { Hono } from "hono";
import { createServiceClient } from "@lifeos/db";
import { logger } from "../../utils/logger";

const app = new Hono();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function extractUserId(c: {
  req: { header: (name: string) => string | undefined };
}): string | null {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString(),
    );
    return payload.sub || null;
  } catch {
    return null;
  }
}

app.post("/", async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createServiceClient();
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await supabase
      .from("whatsapp_link_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("used_at", null);

    const { data, error } = await supabase
      .from("whatsapp_link_codes")
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, "Error creating link code");
      return c.json({ error: "Failed to generate code" }, 500);
    }

    logger.info({ userId }, "WhatsApp link code generated");

    return c.json({
      success: true,
      code: data.code,
      expires_at: data.expires_at,
      instructions:
        "Send this code to the LifeOS WhatsApp bot to link your account.",
    });
  } catch (err) {
    logger.error({ err }, "Unexpected error generating code");
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/", async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createServiceClient();

    const { data: whatsappUser, error } = await supabase
      .from("whatsapp_users")
      .select("phone_number, display_name, verified_at, last_message_at")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error({ error }, "Error checking WhatsApp status");
      return c.json({ error: "Failed to check status" }, 500);
    }

    if (!whatsappUser) {
      const { data: pendingCode } = await supabase
        .from("whatsapp_link_codes")
        .select("code, expires_at")
        .eq("user_id", userId)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return c.json({
        linked: false,
        pending_code: pendingCode
          ? {
              code: pendingCode.code,
              expires_at: pendingCode.expires_at,
            }
          : null,
      });
    }

    const maskedPhone = whatsappUser.phone_number.replace(
      /^(.*)(.{4})$/,
      (_match: string, start: string) =>
        "*".repeat(start.length) + whatsappUser.phone_number.slice(-4),
    );

    return c.json({
      linked: true,
      phone_number: maskedPhone,
      display_name: whatsappUser.display_name,
      verified_at: whatsappUser.verified_at,
      last_message_at: whatsappUser.last_message_at,
    });
  } catch (err) {
    logger.error({ err }, "Unexpected error getting status");
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.delete("/", async (c) => {
  const userId = extractUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("whatsapp_users")
      .delete()
      .eq("user_id", userId);

    if (error) {
      logger.error({ error }, "Error unlinking WhatsApp");
      return c.json({ error: "Failed to unlink account" }, 500);
    }

    logger.info({ userId }, "WhatsApp unlinked via API");

    return c.json({
      success: true,
      message: "WhatsApp account unlinked successfully",
    });
  } catch (err) {
    logger.error({ err }, "Unexpected error unlinking");
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
