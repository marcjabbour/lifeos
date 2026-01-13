/**
 * Content sanitization utilities for XSS protection
 *
 * These utilities help prevent cross-site scripting (XSS) attacks
 * by sanitizing user-generated content before rendering.
 */

/**
 * HTML entities that need escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Escape HTML special characters to prevent XSS
 * Use this when inserting user content into HTML context
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize a string by removing potentially dangerous HTML tags
 * Preserves safe formatting tags like <b>, <i>, <em>, <strong>
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  // Remove script tags and their content
  let clean = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );

  // Remove event handlers (onclick, onerror, etc.)
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  clean = clean.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, "");

  // Remove javascript: URLs
  clean = clean.replace(/javascript:/gi, "");

  // Remove data: URLs (can contain scripts)
  clean = clean.replace(/data:/gi, "");

  // Remove vbscript: URLs
  clean = clean.replace(/vbscript:/gi, "");

  // Remove style attributes (can contain expressions)
  clean = clean.replace(/\s*style\s*=\s*["'][^"']*["']/gi, "");

  // Remove dangerous tags (keep common formatting)
  const dangerousTags = [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "button",
    "select",
    "textarea",
    "link",
    "meta",
    "base",
    "svg",
    "math",
    "template",
    "slot",
    "canvas",
    "video",
    "audio",
  ];

  for (const tag of dangerousTags) {
    const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    clean = clean.replace(regex, "");
    // Also remove self-closing versions
    clean = clean.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }

  return clean.trim();
}

/**
 * Strip all HTML tags, leaving only text content
 * Use this when you only want the text, no formatting
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Sanitize a URL to prevent javascript: and other dangerous protocols
 * Returns empty string if URL is unsafe
 */
export function sanitizeUrl(url: string): string {
  if (!url) return "";

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];

  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return "";
    }
  }

  // Allow http, https, mailto, tel
  const safeProtocols = ["http:", "https:", "mailto:", "tel:", "/"];
  const isSafe = safeProtocols.some(
    (protocol) => trimmed.startsWith(protocol) || !trimmed.includes(":"),
  );

  return isSafe ? url : "";
}

/**
 * Sanitize text for use in JSON
 * Escapes characters that could break JSON parsing
 */
export function sanitizeForJson(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f");
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return "";
  return filename
    .replace(/\.\./g, "") // Remove path traversal
    .replace(/[/\\]/g, "") // Remove slashes
    .replace(/[<>:"|?*]/g, "") // Remove invalid chars
    .slice(0, 255); // Limit length
}

/**
 * Check if content contains potentially malicious patterns
 */
export function detectMaliciousContent(content: string): {
  isSafe: boolean;
  threats: string[];
} {
  const threats: string[] = [];

  // Check for script tags
  if (/<script/i.test(content)) {
    threats.push("script_tag");
  }

  // Check for event handlers
  if (/\son\w+\s*=/i.test(content)) {
    threats.push("event_handler");
  }

  // Check for javascript: URLs
  if (/javascript:/i.test(content)) {
    threats.push("javascript_url");
  }

  // Check for data: URLs
  if (/data:\s*text\/html/i.test(content)) {
    threats.push("data_url");
  }

  // Check for expression() in styles (IE attack)
  if (/expression\s*\(/i.test(content)) {
    threats.push("css_expression");
  }

  // Check for base64 encoded scripts
  if (/base64[^"']*PHNjcmlwdA/i.test(content)) {
    threats.push("base64_script");
  }

  return {
    isSafe: threats.length === 0,
    threats,
  };
}
