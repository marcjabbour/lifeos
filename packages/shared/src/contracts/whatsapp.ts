import { z } from "zod";

export const WhatsAppMessageTypeSchema = z.enum([
  "text",
  "image",
  "document",
  "audio",
  "video",
  "location",
  "link",
]);
export type WhatsAppMessageType = z.infer<typeof WhatsAppMessageTypeSchema>;

export const TwilioWebhookPayloadSchema = z.object({
  MessageSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string().optional().default(""),
  NumMedia: z.string().optional().default("0"),
  MediaUrl0: z.string().optional(),
  MediaContentType0: z.string().optional(),
  ProfileName: z.string().optional(),
  Latitude: z.string().optional(),
  Longitude: z.string().optional(),
});
export type TwilioWebhookPayload = z.infer<typeof TwilioWebhookPayloadSchema>;

export const ParsedMessageSchema = z.object({
  messageSid: z.string(),
  from: z.string(),
  to: z.string(),
  body: z.string(),
  messageType: WhatsAppMessageTypeSchema,
  mediaUrl: z.string().optional(),
  mediaContentType: z.string().optional(),
  numMedia: z.number(),
  profileName: z.string().optional(),
  timestamp: z.date(),
  isLink: z.boolean(),
  extractedUrl: z.string().optional(),
});
export type ParsedMessage = z.infer<typeof ParsedMessageSchema>;

export const UserIntentVerifySchema = z.object({
  type: z.literal("verify"),
  code: z.string(),
});

export const UserIntentCommandSchema = z.object({
  type: z.literal("command"),
  command: z.string(),
  args: z.string(),
});

export const UserIntentSaveLinkSchema = z.object({
  type: z.literal("save_link"),
  url: z.string().url(),
  note: z.string().optional(),
});

export const UserIntentSaveImageSchema = z.object({
  type: z.literal("save_image"),
  mediaUrl: z.string().url(),
  caption: z.string().optional(),
});

export const UserIntentSaveAudioSchema = z.object({
  type: z.literal("save_audio"),
  mediaUrl: z.string().url(),
  caption: z.string().optional(),
});

export const UserIntentSaveTextSchema = z.object({
  type: z.literal("save_text"),
  text: z.string(),
});

export const UserIntentQuerySchema = z.object({
  type: z.literal("query"),
  question: z.string(),
});

export const UserIntentClarificationResponseSchema = z.object({
  type: z.literal("clarification_response"),
  selection: z.union([z.number(), z.string()]),
});

export const UserIntentDeleteConfirmSchema = z.object({
  type: z.literal("delete_confirm"),
  confirmed: z.boolean(),
});

export const UserIntentSchema = z.discriminatedUnion("type", [
  UserIntentVerifySchema,
  UserIntentCommandSchema,
  UserIntentSaveLinkSchema,
  UserIntentSaveImageSchema,
  UserIntentSaveAudioSchema,
  UserIntentSaveTextSchema,
  UserIntentQuerySchema,
  UserIntentClarificationResponseSchema,
  UserIntentDeleteConfirmSchema,
]);
export type UserIntent = z.infer<typeof UserIntentSchema>;

export const WhatsAppLinkRequestSchema = z.object({
  userId: z.string().uuid(),
  phoneNumber: z.string(),
});
export type WhatsAppLinkRequest = z.infer<typeof WhatsAppLinkRequestSchema>;

export const WhatsAppLinkResponseSchema = z.object({
  success: z.boolean(),
  verificationCode: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});
export type WhatsAppLinkResponse = z.infer<typeof WhatsAppLinkResponseSchema>;

export const WhatsAppWebhookResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  jobId: z.string().uuid().optional(),
  error: z.string().optional(),
});
export type WhatsAppWebhookResponse = z.infer<
  typeof WhatsAppWebhookResponseSchema
>;

export const SendMessageOptionsSchema = z.object({
  to: z.string(),
  body: z.string(),
  mediaUrl: z.string().url().optional(),
});
export type SendMessageOptions = z.infer<typeof SendMessageOptionsSchema>;
