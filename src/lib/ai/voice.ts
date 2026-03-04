/**
 * Voice Integration — TTS (OpenAI) and STT (Whisper)
 *
 * SECURITY: Server-side only. Uses OPENAI_API_KEY from env (Justin's key),
 * NOT user's BYOK key. Never import from client components.
 */

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type TTSResult =
  | { success: true; audioBuffer: Buffer; contentType: string }
  | { success: false; error: string };

export type STTResult =
  | { success: true; text: string }
  | { success: false; error: string };

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const OPENAI_STT_URL = "https://api.openai.com/v1/audio/transcriptions";

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }
  return key;
}

/**
 * Convert text to speech using OpenAI TTS API.
 * Returns raw audio buffer (mp3 format by default).
 *
 * @param text - The text to convert (max 4096 chars per OpenAI docs)
 * @param voice - Voice preset (default: "nova")
 * @param speed - Playback speed 0.25 to 4.0 (default: 1.0)
 */
export async function textToSpeech(
  text: string,
  voice: TTSVoice = "nova",
  speed: number = 1.0
): Promise<TTSResult> {
  try {
    const apiKey = getOpenAIKey();

    // Truncate to OpenAI's max input length
    const truncated = text.slice(0, 4096);

    const response = await fetch(OPENAI_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: truncated,
        voice,
        speed: Math.max(0.25, Math.min(4.0, speed)),
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await safeReadError(response);
      console.error("TTS API error:", response.status, errorText);

      if (response.status === 429) {
        return { success: false, error: "Voice service is rate limited. Please try again in a moment." };
      }
      if (response.status === 503 || response.status === 502) {
        return { success: false, error: "Voice service is temporarily unavailable." };
      }
      return { success: false, error: "Failed to generate audio." };
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    return {
      success: true,
      audioBuffer,
      contentType: "audio/mpeg",
    };
  } catch (err) {
    console.error("textToSpeech error:", err);
    return { success: false, error: "Failed to generate audio." };
  }
}

/**
 * Convert speech to text using OpenAI Whisper API.
 *
 * @param audioData - Raw audio bytes (webm, mp3, wav, etc.)
 * @param filename - Original filename with extension (helps Whisper detect format)
 * @param language - Optional ISO 639-1 language code for better accuracy
 */
export async function speechToText(
  audioData: Uint8Array,
  filename: string = "recording.webm",
  language?: string
): Promise<STTResult> {
  try {
    const apiKey = getOpenAIKey();

    // Max file size for Whisper is 25MB
    if (audioData.byteLength > 25 * 1024 * 1024) {
      return { success: false, error: "Audio file is too large. Maximum size is 25MB." };
    }

    const formData = new FormData();
    const blob = new Blob([audioData as BlobPart], { type: mimeTypeFromFilename(filename) });
    formData.append("file", blob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "json");

    if (language) {
      formData.append("language", language);
    }

    const response = await fetch(OPENAI_STT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await safeReadError(response);
      console.error("STT API error:", response.status, errorText);

      if (response.status === 429) {
        return { success: false, error: "Transcription service is rate limited. Please try again." };
      }
      if (response.status === 400) {
        return { success: false, error: "Audio format not supported. Please try a different recording." };
      }
      return { success: false, error: "Failed to transcribe audio." };
    }

    const data = await response.json();
    const text = (data.text || "").trim();

    if (!text) {
      return { success: false, error: "No speech detected in the recording." };
    }

    return { success: true, text };
  } catch (err) {
    console.error("speechToText error:", err);
    return { success: false, error: "Failed to transcribe audio." };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mimeTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "webm": return "audio/webm";
    case "mp3": return "audio/mpeg";
    case "wav": return "audio/wav";
    case "m4a": return "audio/mp4";
    case "ogg": return "audio/ogg";
    case "flac": return "audio/flac";
    default: return "audio/webm";
  }
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message || JSON.stringify(data);
  } catch {
    try {
      return await response.text();
    } catch {
      return "Unknown error";
    }
  }
}
