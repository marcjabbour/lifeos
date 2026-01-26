/**
 * Twilio WhatsApp Client
 *
 * Handles sending messages and validating webhooks for WhatsApp integration.
 */

import crypto from "crypto";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

export interface SendMessageOptions {
  to: string;
  body: string;
  mediaUrl?: string;
}

export interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  body: string;
}

/**
 * Create Twilio client configuration from environment variables
 */
export function getTwilioConfig(): TwilioConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid) {
    throw new Error("TWILIO_ACCOUNT_SID environment variable is required");
  }
  if (!authToken) {
    throw new Error("TWILIO_AUTH_TOKEN environment variable is required");
  }
  if (!whatsappNumber) {
    throw new Error("TWILIO_WHATSAPP_NUMBER environment variable is required");
  }

  return { accountSid, authToken, whatsappNumber };
}

/**
 * Validate Twilio webhook signature
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string,
): boolean {
  // Sort the POST parameters alphabetically by key
  const sortedKeys = Object.keys(params).sort();

  // Concatenate the full URL with sorted params
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // Create HMAC-SHA1 hash
  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(data, "utf-8")
    .digest("base64");

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

/**
 * Send a WhatsApp message via Twilio API
 */
export async function sendWhatsAppMessage(
  config: TwilioConfig,
  options: SendMessageOptions,
): Promise<TwilioMessageResponse> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

  const body = new URLSearchParams({
    From: config.whatsappNumber,
    To: options.to.startsWith("whatsapp:")
      ? options.to
      : `whatsapp:${options.to}`,
    Body: options.body,
  });

  if (options.mediaUrl) {
    body.append("MediaUrl", options.mediaUrl);
  }

  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString(
    "base64",
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return {
    sid: result.sid,
    status: result.status,
    to: result.to,
    body: result.body,
  };
}

/**
 * Download media from Twilio (for images/files sent via WhatsApp)
 */
export async function downloadTwilioMedia(
  config: TwilioConfig,
  mediaUrl: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString(
    "base64",
  );

  const response = await fetch(mediaUrl, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType =
    response.headers.get("content-type") || "application/octet-stream";

  return { buffer, contentType };
}
