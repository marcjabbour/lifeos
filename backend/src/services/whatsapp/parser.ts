import {
  TwilioWebhookPayloadSchema,
  ParsedMessageSchema,
  UserIntentSchema,
  type TwilioWebhookPayload,
  type ParsedMessage,
  type UserIntent,
  type WhatsAppMessageType,
} from "@lifeos/shared";

const URL_PATTERN = /https?:\/\/[^\s]+/gi;

function detectMessageType(payload: TwilioWebhookPayload): WhatsAppMessageType {
  const numMedia = parseInt(payload.NumMedia || "0", 10);
  const body = payload.Body || "";

  if (payload.Latitude && payload.Longitude) {
    return "location";
  }

  if (numMedia > 0 && payload.MediaContentType0) {
    const contentType = payload.MediaContentType0.toLowerCase();

    if (contentType.startsWith("image/")) return "image";
    if (contentType.startsWith("video/")) return "video";
    if (contentType.startsWith("audio/")) return "audio";
    return "document";
  }

  if (URL_PATTERN.test(body)) {
    return "link";
  }

  return "text";
}

function extractUrl(body: string): string | undefined {
  const matches = body.match(URL_PATTERN);
  return matches?.[0];
}

export function parseFormData(formData: FormData): TwilioWebhookPayload {
  const payload: Record<string, string> = {};
  formData.forEach((value, key) => {
    payload[key] = value.toString();
  });
  return TwilioWebhookPayloadSchema.parse(payload);
}

export function parseWebhookPayload(
  payload: TwilioWebhookPayload,
): ParsedMessage {
  const messageType = detectMessageType(payload);
  const body = payload.Body || "";
  const numMedia = parseInt(payload.NumMedia || "0", 10);
  const isLink = messageType === "link";

  return ParsedMessageSchema.parse({
    messageSid: payload.MessageSid,
    from: payload.From,
    to: payload.To,
    body,
    messageType,
    mediaUrl: payload.MediaUrl0,
    mediaContentType: payload.MediaContentType0,
    numMedia,
    profileName: payload.ProfileName,
    timestamp: new Date(),
    isLink,
    extractedUrl: isLink ? extractUrl(body) : undefined,
  });
}

export function isVerificationCode(body: string): boolean {
  return /^\d{6}$/.test(body.trim());
}

export function isCommand(body: string): boolean {
  return body.trim().startsWith("/");
}

export function parseCommand(body: string): { command: string; args: string } {
  const trimmed = body.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return { command: trimmed.slice(1).toLowerCase(), args: "" };
  }

  return {
    command: trimmed.slice(1, spaceIndex).toLowerCase(),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export function isClarificationResponse(body: string): boolean {
  return /^[1-9]$/.test(body.trim());
}

export function isDeleteConfirmationResponse(body: string): boolean {
  const trimmed = body.trim().toUpperCase();
  return trimmed === "YES" || trimmed === "NO";
}

export function parseDeleteConfirmation(body: string): boolean {
  return body.trim().toUpperCase() === "YES";
}

export function detectIntent(message: ParsedMessage): UserIntent {
  const body = message.body.trim();

  if (isVerificationCode(body)) {
    return UserIntentSchema.parse({ type: "verify", code: body });
  }

  if (isCommand(body)) {
    const { command, args } = parseCommand(body);
    return UserIntentSchema.parse({ type: "command", command, args });
  }

  if (message.messageType === "image" && message.mediaUrl) {
    return UserIntentSchema.parse({
      type: "save_image",
      mediaUrl: message.mediaUrl,
      caption: body || undefined,
    });
  }

  if (message.messageType === "audio" && message.mediaUrl) {
    return UserIntentSchema.parse({
      type: "save_audio",
      mediaUrl: message.mediaUrl,
      caption: body || undefined,
    });
  }

  if (message.isLink && message.extractedUrl) {
    const note = body.replace(message.extractedUrl, "").trim() || undefined;
    return UserIntentSchema.parse({
      type: "save_link",
      url: message.extractedUrl,
      note,
    });
  }

  const queryPatterns = [
    /^(what|where|when|who|how|why|which|find|show|search|list)/i,
    /\?$/,
    /^(did i|have i|do i)/i,
  ];

  for (const pattern of queryPatterns) {
    if (pattern.test(body)) {
      return UserIntentSchema.parse({ type: "query", question: body });
    }
  }

  return UserIntentSchema.parse({ type: "save_text", text: body });
}
