/**
 * Inngest API Route
 *
 * This endpoint serves the Inngest Dev Server and handles webhooks
 * from Inngest Cloud in production.
 */

import { serve } from "inngest/next";
import { inngest, functions } from "@/lib/services/jobs";

// Debug: Log signing key presence (not the actual key)
const signingKey = process.env.INNGEST_SIGNING_KEY;
console.log(
  "[Inngest] Signing key present:",
  !!signingKey,
  signingKey?.substring(0, 15) + "...",
);

// Serve the Inngest API
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  signingKey,
});
