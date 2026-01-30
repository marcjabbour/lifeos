import crypto from "crypto";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

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

export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string,
): boolean {
  const sortedKeys = Object.keys(params).sort();

  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(data, "utf-8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}
