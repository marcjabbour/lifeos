/**
 * WhatsApp Service
 *
 * Main exports for WhatsApp integration.
 */

export {
  getTwilioConfig,
  validateTwilioSignature,
  sendWhatsAppMessage,
  downloadTwilioMedia,
  type TwilioConfig,
  type SendMessageOptions,
  type TwilioMessageResponse,
} from "./twilio-client";

export {
  parseWebhookPayload,
  isVerificationCode,
  isCommand,
  parseCommand,
  detectIntent,
  isClarificationResponse,
  type ParsedMessage,
  type TwilioWebhookPayload,
  type MessageType,
  type UserIntent,
} from "./message-parser";

export {
  formatItem,
  formatItemList,
  formatSaveConfirmation,
  formatSearchResults,
  formatNovaAnswer,
  formatCategories,
  formatWelcomeMessage,
  formatErrorMessage,
  formatVerificationPrompt,
  formatHelpMessage,
  formatClarificationRequest,
  getCategoryEmoji,
  type FeedItemSummary,
  type ClarificationOption,
} from "./response-formatter";
