/**
 * Inngest API Route
 *
 * This endpoint serves the Inngest Dev Server and handles webhooks
 * from Inngest Cloud in production.
 */

import { serve } from "inngest/next";
import { inngest, functions } from "@/lib/services/jobs";

// Serve the Inngest API
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
