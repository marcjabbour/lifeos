import { serve } from "inngest/hono";
import { inngest } from "./client";
import { processContent } from "./functions/process-content";
import { sendNotification } from "./functions/send-notification";

export const inngestFunctions = [processContent, sendNotification];

export const inngestServe = serve({
  client: inngest,
  functions: inngestFunctions,
});
