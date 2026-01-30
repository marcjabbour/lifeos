/**
 * Transcription Tool
 *
 * Whisper API wrapper for audio transcription.
 */

import OpenAI from "openai";
import { createTrace, flushLangfuse } from "../observability/index.js";
import { logger } from "../utils/index.js";

const log = logger.child({ tool: "transcription" });

export interface TranscriptionResult {
  transcript: string;
  duration?: number;
  language?: string;
}

export async function transcribeAudio(
  audioUrl: string,
  options?: { userId?: string; itemId?: string; language?: string },
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  log.info(
    { audioUrl: audioUrl.slice(0, 100) },
    "Starting audio transcription",
  );

  const trace = createTrace("transcription_tool", {
    userId: options?.userId,
    itemId: options?.itemId,
    requestType: "perception",
    model: "gpt-4o-mini",
  });
  const span = trace.span("transcribe_audio");

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const audioFile = new File([audioBuffer], "audio.mp3", {
      type: "audio/mpeg",
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: options?.language,
    });

    const result: TranscriptionResult = {
      transcript: transcription.text,
    };

    const durationMs = Date.now() - startTime;
    log.info(
      { durationMs, transcriptLength: result.transcript.length },
      "Transcription complete",
    );

    span.end({ output: result });
    await flushLangfuse();

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log.error({ durationMs, error }, "Transcription failed");

    span.error(error instanceof Error ? error : new Error(String(error)));
    await flushLangfuse();

    throw error;
  }
}

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

  if (audioExtensions.some((ext) => lowercaseUrl.includes(ext))) {
    return true;
  }

  const audioPatterns = [
    /twilio.*\.com.*recordings/i,
    /whatsapp.*media/i,
    /voice.*message/i,
    /audio/i,
  ];

  return audioPatterns.some((pattern) => pattern.test(url));
}
