import { inngest } from "../client";
import {
  createServiceClient,
  createItemQueries,
  createJobQueries,
} from "@lifeos/db";

interface NotificationEvent {
  userId: string;
  jobId: string;
  itemId: string;
  type: "job-complete" | "job-failed";
  channel: "whatsapp" | "push" | "email";
}

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

export const sendNotification = inngest.createFunction(
  {
    id: "send-notification",
    retries: 2,
  },
  { event: "notification/send" },
  async ({ event, step, logger }) => {
    const { userId, jobId, itemId, type, channel } =
      event.data as NotificationEvent;

    logger.info("Sending notification", { userId, jobId, type, channel });

    const supabase = createServiceClient();
    const itemQueries = createItemQueries(supabase, userId);
    const jobQueries = createJobQueries(supabase, userId);

    const [item, job] = await step.run("fetch-data", async () => {
      const [itemData, jobData] = await Promise.all([
        itemQueries.get(itemId),
        jobQueries.get(jobId),
      ]);
      return [itemData, jobData] as const;
    });

    if (!item || !job) {
      logger.warn("Item or job not found for notification", { itemId, jobId });
      return { success: false, reason: "data-not-found" };
    }

    const message = formatNotificationMessage(type, item, job);

    if (channel === "whatsapp") {
      await step.run("send-whatsapp", async () => {
        await sendWhatsAppNotification(userId, message, supabase);
      });
    }

    if (channel === "push") {
      await step.run("send-push", async () => {
        await sendPushNotification(userId, message, supabase);
      });
    }

    logger.info("Notification sent", { userId, channel, type });

    return { success: true, channel, type };
  },
);

function formatNotificationMessage(
  type: NotificationEvent["type"],
  item: { title?: string; summary?: string },
  job: { status?: string; error_message?: string },
): string {
  if (type === "job-failed") {
    return `Processing failed: ${job.error_message ?? "Unknown error"}`;
  }

  const title = item.title ?? "Untitled";
  const summary = item.summary
    ? `\n\n${item.summary.slice(0, 200)}${item.summary.length > 200 ? "..." : ""}`
    : "";

  return `Processed: ${title}${summary}`;
}

async function sendWhatsAppNotification(
  userId: string,
  message: string,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("whatsapp_number")
    .eq("user_id", userId)
    .single();

  if (!profile?.whatsapp_number) {
    throw new Error("User has no WhatsApp number configured");
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    throw new Error("Twilio credentials not configured");
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: TWILIO_WHATSAPP_FROM,
        To: `whatsapp:${profile.whatsapp_number}`,
        Body: message,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${error}`);
  }
}

async function sendPushNotification(
  _userId: string,
  _message: string,
  _supabase: ReturnType<typeof createServiceClient>,
): Promise<void> {
  // Push notifications not yet implemented
  // Will use web-push library when ready
}
