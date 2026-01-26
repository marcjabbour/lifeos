/**
 * Input Validation for Share Endpoint
 *
 * Validates and sanitizes content before processing
 */

import type { ContentType, ShareRequest } from "@/types/database";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: ShareRequest;
}

// URL validation constants
const MAX_URL_LENGTH = 2048;
const BLOCKED_URL_PATTERNS = [
  /^file:\/\//i, // file:// protocol
  /localhost/i, // localhost
  /127\.0\.0\.1/, // IPv4 loopback
  /\[::1\]/, // IPv6 loopback
  /10\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // Private IP 10.x.x.x
  /172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}/, // Private IP 172.16-31.x.x
  /192\.168\.\d{1,3}\.\d{1,3}/, // Private IP 192.168.x.x
  /169\.254\.\d{1,3}\.\d{1,3}/, // Link-local
];

// Text validation constants
const MAX_TEXT_LENGTH = 50000;

// Image validation constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_IMAGE_DIMENSION = 4096;

// Audio validation constants
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
];

/**
 * Validate URL content
 */
function validateUrl(url: string): { valid: boolean; error?: string } {
  // Check length
  if (url.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
    };
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_URL_PATTERNS) {
    if (pattern.test(url)) {
      return {
        valid: false,
        error: "URL points to internal or restricted address",
      };
    }
  }

  // Validate URL format
  try {
    const parsed = new URL(url);

    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Only HTTP and HTTPS URLs are allowed" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Sanitize text content
 * Removes control characters while preserving whitespace
 */
function sanitizeText(text: string): string {
  // Remove control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Validate text content
 */
function validateText(text: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  // Check length
  if (text.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
    };
  }

  // Check for empty content
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Text content cannot be empty" };
  }

  // Sanitize
  const sanitized = sanitizeText(text);

  return { valid: true, sanitized };
}

/**
 * Validate base64 image content
 */
function validateImage(base64: string): { valid: boolean; error?: string } {
  // Check if it's a valid base64 data URL
  const dataUrlMatch = base64.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);

  if (!dataUrlMatch) {
    return {
      valid: false,
      error: "Invalid image format. Expected base64 data URL",
    };
  }

  const [, mimeType, data] = dataUrlMatch;

  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Image type ${mimeType} not allowed. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    };
  }

  // Check size (base64 is ~33% larger than binary)
  const estimatedSize = (data.length * 3) / 4;
  if (estimatedSize > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image exceeds maximum size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate base64 audio content
 */
function validateAudio(base64: string): { valid: boolean; error?: string } {
  // Check if it's a valid base64 data URL
  const dataUrlMatch = base64.match(/^data:(audio\/[a-z0-9+]+);base64,(.+)$/i);

  if (!dataUrlMatch) {
    return {
      valid: false,
      error: "Invalid audio format. Expected base64 data URL",
    };
  }

  const [, mimeType, data] = dataUrlMatch;

  // Check MIME type
  if (!ALLOWED_AUDIO_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Audio type ${mimeType} not allowed. Allowed: ${ALLOWED_AUDIO_TYPES.join(", ")}`,
    };
  }

  // Check size (base64 is ~33% larger than binary)
  const estimatedSize = (data.length * 3) / 4;
  if (estimatedSize > MAX_AUDIO_SIZE) {
    return {
      valid: false,
      error: `Audio exceeds maximum size of ${MAX_AUDIO_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate the entire share request
 */
export function validateShareRequest(body: unknown): ValidationResult {
  // Check if body is an object
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const request = body as Record<string, unknown>;

  // Check required fields
  if (!request.content || typeof request.content !== "string") {
    return { valid: false, error: "Missing or invalid content field" };
  }

  if (!request.content_type || typeof request.content_type !== "string") {
    return { valid: false, error: "Missing or invalid content_type field" };
  }

  // Validate content_type
  const validTypes: ContentType[] = ["url", "text", "image", "audio"];
  if (!validTypes.includes(request.content_type as ContentType)) {
    return {
      valid: false,
      error: "content_type must be url, text, image, or audio",
    };
  }

  const contentType = request.content_type as ContentType;
  let content = request.content as string;

  // Validate content based on type
  switch (contentType) {
    case "url": {
      const urlResult = validateUrl(content);
      if (!urlResult.valid) {
        return { valid: false, error: urlResult.error };
      }
      break;
    }
    case "text": {
      const textResult = validateText(content);
      if (!textResult.valid) {
        return { valid: false, error: textResult.error };
      }
      content = textResult.sanitized!;
      break;
    }
    case "image": {
      const imageResult = validateImage(content);
      if (!imageResult.valid) {
        return { valid: false, error: imageResult.error };
      }
      break;
    }
    case "audio": {
      const audioResult = validateAudio(content);
      if (!audioResult.valid) {
        return { valid: false, error: audioResult.error };
      }
      break;
    }
  }

  // Validate optional fields
  const sourceValue = request.source as string | undefined;
  if (sourceValue !== undefined && typeof sourceValue !== "string") {
    return { valid: false, error: "source must be a string" };
  }

  const callbackUrl = request.callback_url;
  if (callbackUrl !== undefined) {
    if (typeof callbackUrl !== "string") {
      return { valid: false, error: "callback_url must be a string" };
    }
    const urlResult = validateUrl(callbackUrl);
    if (!urlResult.valid) {
      return {
        valid: false,
        error: `Invalid callback_url: ${urlResult.error}`,
      };
    }
  }

  return {
    valid: true,
    sanitized: {
      content,
      content_type: contentType,
      source: sourceValue,
    },
  };
}

export {
  MAX_URL_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_IMAGE_SIZE,
  MAX_IMAGE_DIMENSION,
  MAX_AUDIO_SIZE,
};
