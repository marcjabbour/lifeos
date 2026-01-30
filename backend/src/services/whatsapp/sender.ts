import type { TwilioConfig } from "./validate";
import type { SendMessageOptions } from "@lifeos/shared";

export interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  body: string;
}

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
