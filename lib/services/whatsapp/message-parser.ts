/**
 * WhatsApp Message Parser
 *
 * Parses incoming Twilio webhook payloads into structured message objects.
 */

export type MessageType =
  | "text"
  | "image"
  | "document"
  | "audio"
  | "video"
  | "location"
  | "link";

export interface ParsedMessage {
  messageSid: string;
  from: string;
  to: string;
  body: string;
  messageType: MessageType;
  mediaUrl?: string;
  mediaContentType?: string;
  numMedia: number;
  profileName?: string;
  timestamp: Date;
  isLink: boolean;
  extractedUrl?: string;
}

export interface TwilioWebhookPayload {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  ProfileName?: string;
  Latitude?: string;
  Longitude?: string;
  [key: string]: string | undefined;
}

// URL regex pattern for detecting links
const URL_PATTERN = /https?:\/\/[^\s]+/gi;

/**
 * Detect message type from webhook payload
 */
function detectMessageType(payload: TwilioWebhookPayload): MessageType {
  const numMedia = parseInt(payload.NumMedia || "0", 10);
  const body = payload.Body || "";

  // Check for location
  if (payload.Latitude && payload.Longitude) {
    return "location";
  }

  // Check for media
  if (numMedia > 0 && payload.MediaContentType0) {
    const contentType = payload.MediaContentType0.toLowerCase();

    if (contentType.startsWith("image/")) {
      return "image";
    }
    if (contentType.startsWith("video/")) {
      return "video";
    }
    if (contentType.startsWith("audio/")) {
      return "audio";
    }
    return "document";
  }

  // Check for links in text
  if (URL_PATTERN.test(body)) {
    return "link";
  }

  return "text";
}

/**
 * Extract the first URL from message body
 */
function extractUrl(body: string): string | undefined {
  const matches = body.match(URL_PATTERN);
  return matches?.[0];
}

/**
 * Parse a Twilio webhook payload into a structured message
 */
export function parseWebhookPayload(
  payload: TwilioWebhookPayload,
): ParsedMessage {
  const messageType = detectMessageType(payload);
  const body = payload.Body || "";
  const numMedia = parseInt(payload.NumMedia || "0", 10);
  const isLink = messageType === "link";

  return {
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
  };
}

/**
 * Check if message looks like a verification code (6 digits)
 */
export function isVerificationCode(body: string): boolean {
  const trimmed = body.trim();
  return /^\d{6}$/.test(trimmed);
}

/**
 * Check if message is a command (starts with /)
 */
export function isCommand(body: string): boolean {
  return body.trim().startsWith("/");
}

/**
 * Parse a command message
 */
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

/**
 * Detect user intent from message
 */
export type UserIntent =
  | { type: "verify"; code: string }
  | { type: "command"; command: string; args: string }
  | { type: "save_link"; url: string; note?: string }
  | { type: "save_image"; mediaUrl: string; caption?: string }
  | { type: "save_audio"; mediaUrl: string; caption?: string }
  | { type: "save_text"; text: string }
  | { type: "query"; question: string }
  | { type: "clarification_response"; selection: number | string }
  | { type: "delete_confirm"; confirmed: boolean };

/**
 * Check if message looks like a clarification response (single digit 1-9)
 */
export function isClarificationResponse(body: string): boolean {
  const trimmed = body.trim();
  return /^[1-9]$/.test(trimmed);
}

/**
 * Check if message is a delete confirmation response (YES/NO)
 */
export function isDeleteConfirmationResponse(body: string): boolean {
  const trimmed = body.trim().toUpperCase();
  return trimmed === "YES" || trimmed === "NO";
}

/**
 * Parse delete confirmation response
 */
export function parseDeleteConfirmation(body: string): boolean {
  return body.trim().toUpperCase() === "YES";
}

export function detectIntent(message: ParsedMessage): UserIntent {
  const body = message.body.trim();

  // Check for verification code
  if (isVerificationCode(body)) {
    return { type: "verify", code: body };
  }

  // Check for commands
  if (isCommand(body)) {
    const { command, args } = parseCommand(body);
    return { type: "command", command, args };
  }

  // Check for images
  if (message.messageType === "image" && message.mediaUrl) {
    return {
      type: "save_image",
      mediaUrl: message.mediaUrl,
      caption: body || undefined,
    };
  }

  // Check for audio/voice messages
  if (message.messageType === "audio" && message.mediaUrl) {
    return {
      type: "save_audio",
      mediaUrl: message.mediaUrl,
      caption: body || undefined,
    };
  }

  // Check for links
  if (message.isLink && message.extractedUrl) {
    const note = body.replace(message.extractedUrl, "").trim() || undefined;
    return {
      type: "save_link",
      url: message.extractedUrl,
      note,
    };
  }

  // Check for query patterns
  const queryPatterns = [
    /^(what|where|when|who|how|why|which|find|show|search|list)/i,
    /\?$/,
    /^(did i|have i|do i)/i,
  ];

  for (const pattern of queryPatterns) {
    if (pattern.test(body)) {
      return { type: "query", question: body };
    }
  }

  // Default to saving as text
  return { type: "save_text", text: body };
}
