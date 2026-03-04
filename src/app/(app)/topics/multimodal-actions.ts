"use server";

import { createClient } from "@/lib/supabase/server";
import { textToSpeech, speechToText } from "@/lib/ai/voice";
import { generateImage } from "@/lib/ai/images";

// ---------------------------------------------------------------------------
// Shared: Lesson Metadata
// ---------------------------------------------------------------------------

/**
 * Get the topic_type for a lesson (used to conditionally render multimodal features).
 */
export async function getLessonTopicType(
  lessonId: string
): Promise<{ success: boolean; topicType?: string | null; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: lesson } = await supabase
      .from("lessons")
      .select("topic_type")
      .eq("id", lessonId)
      .single();

    if (!lesson) return { success: false, error: "Lesson not found." };

    return { success: true, topicType: lesson.topic_type };
  } catch (err) {
    console.error("getLessonTopicType error:", err);
    return { success: false, error: "Failed to get lesson metadata." };
  }
}

// ---------------------------------------------------------------------------
// T15: Voice Server Actions
// ---------------------------------------------------------------------------

/**
 * Generate TTS audio for a text section of a lesson.
 * Returns base64-encoded audio for client-side playback.
 * Only available for language topic_type lessons.
 */
export async function generateTTSAudio(
  lessonId: string,
  text: string
): Promise<{ success: boolean; audio?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    // Verify lesson exists and user has access (via RLS)
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, topic_type, module_id")
      .eq("id", lessonId)
      .single();

    if (!lesson) return { success: false, error: "Lesson not found." };

    // Only allow TTS for language topics
    if (lesson.topic_type !== "language") {
      return { success: false, error: "Voice features are only available for language topics." };
    }

    if (!text || text.trim().length === 0) {
      return { success: false, error: "No text provided for audio generation." };
    }

    // Limit text length to prevent abuse
    const sanitizedText = text.trim().slice(0, 4096);

    const result = await textToSpeech(sanitizedText);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Convert buffer to base64 for transport to client
    const base64 = result.audioBuffer.toString("base64");

    return { success: true, audio: base64 };
  } catch (err) {
    console.error("generateTTSAudio error:", err);
    return { success: false, error: "Failed to generate audio." };
  }
}

/**
 * Transcribe recorded audio using Whisper STT.
 * Receives base64-encoded audio from the client recorder component.
 * Returns transcribed text.
 */
export async function transcribeAudio(
  lessonId: string,
  audioBase64: string,
  language?: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    // Verify lesson exists and user has access (via RLS)
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, topic_type")
      .eq("id", lessonId)
      .single();

    if (!lesson) return { success: false, error: "Lesson not found." };

    if (lesson.topic_type !== "language") {
      return { success: false, error: "Voice features are only available for language topics." };
    }

    if (!audioBase64 || audioBase64.length === 0) {
      return { success: false, error: "No audio data received." };
    }

    // Decode base64 to Uint8Array
    const binaryString = Buffer.from(audioBase64, "base64");
    const audioData = new Uint8Array(binaryString);

    const result = await speechToText(audioData, "recording.webm", language);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, text: result.text };
  } catch (err) {
    console.error("transcribeAudio error:", err);
    return { success: false, error: "Failed to transcribe audio." };
  }
}

// ---------------------------------------------------------------------------
// T16: Image Generation Server Action
// ---------------------------------------------------------------------------

/**
 * Generate an image for lesson content using DALL-E 3.
 * Returns the image URL. Only called when lesson content flags visual value.
 */
export async function generateLessonImage(
  lessonId: string,
  prompt: string,
  altText: string
): Promise<{ success: boolean; imageUrl?: string; altText?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    // Verify lesson exists and user has access
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, content")
      .eq("id", lessonId)
      .single();

    if (!lesson) return { success: false, error: "Lesson not found." };

    if (!prompt || prompt.trim().length === 0) {
      return { success: false, error: "No image prompt provided." };
    }

    // Sanitize prompt — strip anything that looks like injection
    const sanitizedPrompt = prompt.trim().slice(0, 1000);

    const result = await generateImage(sanitizedPrompt, "1024x1024");

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      imageUrl: result.imageUrl,
      altText: altText || "Lesson illustration",
    };
  } catch (err) {
    console.error("generateLessonImage error:", err);
    return { success: false, error: "Failed to generate image." };
  }
}
