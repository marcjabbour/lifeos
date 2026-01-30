/**
 * Transcription Tool for InputAnalyzer
 *
 * Wrapper around the existing Whisper transcription service.
 * Re-exports the transcription functionality with orchestrator-compatible interface.
 */

import {
  transcribeAudio as whisperTranscribe,
  type TranscriptionResult,
} from "@/lib/services/ai/audio";

export type { TranscriptionResult };

/**
 * Transcribe audio using Whisper API
 *
 * This is a thin wrapper around the existing transcription service
 * that adds logging and context for the orchestrator.
 */
export async function transcribeAudioWithWhisper(
  audioUrl: string,
  options?: {
    userId?: string;
    itemId?: string;
    language?: string;
  },
): Promise<TranscriptionResult> {
  console.log("[TranscriptionTool] Starting audio transcription...");
  console.log(`[TranscriptionTool] Audio URL: ${audioUrl.slice(0, 100)}...`);
  console.log(
    `[TranscriptionTool] User ID: ${options?.userId || "not provided"}`,
  );

  try {
    const result = await whisperTranscribe(audioUrl, {
      userId: options?.userId,
      itemId: options?.itemId,
      language: options?.language,
    });

    console.log(`[TranscriptionTool] Transcription complete`);
    console.log(
      `[TranscriptionTool] Length: ${result.transcript.length} chars`,
    );
    console.log(
      `[TranscriptionTool] Duration: ${result.duration?.toFixed(1) || "unknown"}s`,
    );
    console.log(
      `[TranscriptionTool] Language: ${result.language || "unknown"}`,
    );

    return result;
  } catch (error) {
    console.error("[TranscriptionTool] Transcription failed:", error);
    throw error;
  }
}

/**
 * Check if a URL looks like an audio file
 */
export function isAudioUrl(url: string): boolean {
  const audioExtensions = [
    ".mp3",
    ".wav",
    ".m4a",
    ".ogg",
    ".opus",
    ".webm",
    ".aac",
  ];
  const lowercaseUrl = url.toLowerCase();

  // Check file extension
  if (audioExtensions.some((ext) => lowercaseUrl.includes(ext))) {
    return true;
  }

  // Check common audio hosting patterns
  const audioPatterns = [
    /twilio.*\.com.*recordings/i,
    /whatsapp.*media/i,
    /voice.*message/i,
    /audio/i,
  ];

  return audioPatterns.some((pattern) => pattern.test(url));
}
