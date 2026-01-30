/**
 * Audio Transcription Service
 *
 * Provides audio transcription using OpenAI's Whisper API.
 * Supports multiple audio formats and includes Langfuse tracing.
 */

import OpenAI from "openai";
import {
  createTrace,
  flushLangfuse,
} from "@/lib/services/ai/observability/langfuse";
import type { TaskType } from "@/types/llm";

// Supported audio formats for Whisper API
const SUPPORTED_AUDIO_FORMATS = [
  "audio/mpeg", // mp3
  "audio/mp3",
  "audio/mp4", // m4a
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
];

// Maximum audio file size in bytes (25MB - Whisper API limit)
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

// Retry configuration for audio transcription
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Transcription result from Whisper API
 */
export interface TranscriptionResult {
  transcript: string;
  duration?: number;
  language?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

/**
 * Transcription options
 */
export interface TranscribeOptions {
  /** Language hint for transcription (ISO 639-1 code, e.g., 'en', 'es') */
  language?: string;
  /** User ID for tracing */
  userId?: string;
  /** Item ID for tracing */
  itemId?: string;
  /** Whether to include timestamps/segments */
  includeTimestamps?: boolean;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const retryablePatterns = [
      "rate_limit",
      "timeout",
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "503",
      "502",
      "504",
    ];
    return retryablePatterns.some(
      (pattern) =>
        error.message.toLowerCase().includes(pattern.toLowerCase()) ||
        (error as NodeJS.ErrnoException).code === pattern,
    );
  }
  return false;
}

/**
 * Execute an operation with retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error) || attempt === RETRY_CONFIG.maxAttempts) {
        throw lastError;
      }

      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1),
        RETRY_CONFIG.maxDelayMs,
      );

      console.log(
        `[${operationName}] Attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`,
      );
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Fetch audio from URL and convert to File object
 */
async function fetchAudioAsFile(
  audioUrl: string,
): Promise<{ file: File; contentType: string; size: number }> {
  console.log(
    `[Transcription] Fetching audio from: ${audioUrl.slice(0, 100)}...`,
  );

  const response = await fetch(audioUrl, {
    headers: {
      "User-Agent": "LifeOS-Audio-Transcription/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch audio: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") || "audio/mpeg";
  const contentLength = response.headers.get("content-length");
  const size = contentLength ? parseInt(contentLength, 10) : 0;

  // Validate content type
  const normalizedContentType = contentType.split(";")[0].trim().toLowerCase();
  if (
    !SUPPORTED_AUDIO_FORMATS.includes(normalizedContentType) &&
    !normalizedContentType.startsWith("audio/")
  ) {
    throw new Error(
      `Unsupported audio format: ${contentType}. Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(", ")}`,
    );
  }

  // Check file size if available
  if (size > MAX_AUDIO_SIZE) {
    throw new Error(
      `Audio file too large: ${(size / 1024 / 1024).toFixed(2)}MB. Maximum size is 25MB.`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const actualSize = arrayBuffer.byteLength;

  // Double-check actual size after download
  if (actualSize > MAX_AUDIO_SIZE) {
    throw new Error(
      `Audio file too large: ${(actualSize / 1024 / 1024).toFixed(2)}MB. Maximum size is 25MB.`,
    );
  }

  // Determine file extension from content type
  const extensionMap: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
  };

  const extension = extensionMap[normalizedContentType] || "mp3";
  const fileName = `audio.${extension}`;

  // Create File object from ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: contentType });
  const file = new File([blob], fileName, { type: contentType });

  console.log(
    `[Transcription] Fetched audio: ${fileName}, ${(actualSize / 1024).toFixed(2)}KB, ${contentType}`,
  );

  return { file, contentType, size: actualSize };
}

/**
 * Transcribe audio using OpenAI Whisper API
 *
 * @param audioUrl - URL to the audio file (must be publicly accessible or a Twilio media URL)
 * @param options - Optional transcription options
 * @returns Transcription result with transcript, duration, and language
 *
 * @example
 * ```typescript
 * const result = await transcribeAudio("https://example.com/audio.mp3", {
 *   userId: "user-123",
 *   language: "en"
 * });
 * console.log(result.transcript);
 * ```
 */
export async function transcribeAudio(
  audioUrl: string,
  options: TranscribeOptions = {},
): Promise<TranscriptionResult> {
  const { userId, itemId, language, includeTimestamps = false } = options;

  // Create Langfuse trace
  const trace = createTrace("transcribe_audio", {
    userId,
    itemId,
    requestType: "execution" as TaskType,
    model: "gpt-4o-mini", // Placeholder for trace typing
  });

  const span = trace.span("whisper_transcription");

  try {
    const openai = getOpenAI();

    // Step 1: Fetch audio file
    const { file, contentType, size } = await withRetry(
      () => fetchAudioAsFile(audioUrl),
      "fetch_audio",
    );

    console.log(`[Transcription] Starting Whisper API transcription...`);

    // Step 2: Call Whisper API with verbose_json for metadata
    const transcription = await withRetry(
      () =>
        openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
          response_format: "verbose_json",
          language: language, // Optional language hint
          timestamp_granularities: includeTimestamps ? ["segment"] : undefined,
        }),
      "whisper_api",
    );

    // Extract result
    const result: TranscriptionResult = {
      transcript: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
    };

    // Include segments if available and requested
    if (includeTimestamps && transcription.segments) {
      result.segments = transcription.segments.map((seg) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      }));
    }

    console.log(
      `[Transcription] Success: ${result.transcript.length} chars, ` +
        `${result.duration?.toFixed(1) || "?"}s, lang=${result.language}`,
    );

    // End span with success
    span.end({
      output: {
        transcriptLength: result.transcript.length,
        duration: result.duration,
        language: result.language,
        audioSize: size,
        contentType,
      },
      usage: {
        inputTokens: 0, // Whisper doesn't report tokens
        outputTokens: 0,
        totalTokens: 0,
      },
    });

    await flushLangfuse();

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[Transcription] Failed: ${errorMessage}`);

    // End span with error
    span.error(error instanceof Error ? error : new Error(errorMessage));
    await flushLangfuse();

    throw new Error(`Audio transcription failed: ${errorMessage}`);
  }
}

/**
 * Batch transcribe multiple audio files
 *
 * Processes audio files in parallel with rate limiting.
 *
 * @param audioUrls - Array of audio URLs to transcribe
 * @param options - Transcription options (applied to all)
 * @param concurrency - Maximum concurrent transcriptions (default: 2)
 * @returns Array of transcription results (or errors)
 */
export async function batchTranscribeAudio(
  audioUrls: string[],
  options: TranscribeOptions = {},
  concurrency: number = 2,
): Promise<
  Array<{
    url: string;
    result?: TranscriptionResult;
    error?: string;
  }>
> {
  const results: Array<{
    url: string;
    result?: TranscriptionResult;
    error?: string;
  }> = [];

  // Process in chunks for rate limiting
  for (let i = 0; i < audioUrls.length; i += concurrency) {
    const chunk = audioUrls.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (url) => {
        const result = await transcribeAudio(url, options);
        return { url, result };
      }),
    );

    for (const [index, settledResult] of chunkResults.entries()) {
      const url = chunk[index];
      if (settledResult.status === "fulfilled") {
        results.push(settledResult.value);
      } else {
        results.push({
          url,
          error:
            settledResult.reason instanceof Error
              ? settledResult.reason.message
              : String(settledResult.reason),
        });
      }
    }

    // Small delay between chunks to avoid rate limits
    if (i + concurrency < audioUrls.length) {
      await sleep(500);
    }
  }

  return results;
}

/**
 * Validate if a URL appears to be an audio file
 * Note: This is a basic check; actual content type is verified on fetch
 */
export function isAudioUrl(url: string): boolean {
  const audioExtensions = [
    ".mp3",
    ".m4a",
    ".wav",
    ".webm",
    ".ogg",
    ".flac",
    ".aac",
  ];
  const lowercaseUrl = url.toLowerCase();

  // Check for audio extensions
  if (audioExtensions.some((ext) => lowercaseUrl.includes(ext))) {
    return true;
  }

  // Check for Twilio media URLs (common for WhatsApp)
  if (
    lowercaseUrl.includes("api.twilio.com") ||
    lowercaseUrl.includes("media.twiliocdn.com")
  ) {
    return true;
  }

  return false;
}
