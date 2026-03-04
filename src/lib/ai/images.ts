/**
 * Image Generation — DALL-E 3
 *
 * SECURITY: Server-side only. Uses OPENAI_API_KEY from env (Justin's key),
 * NOT user's BYOK key. Never import from client components.
 */

export type ImageSize = "1024x1024" | "1792x1024" | "1024x1792";

export type ImageResult =
  | { success: true; imageUrl: string }
  | { success: false; error: string };

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }
  return key;
}

/**
 * Generate an image using DALL-E 3.
 *
 * @param prompt - Description of the image to generate
 * @param size - Image dimensions (default: 1024x1024)
 * @returns URL of the generated image (valid for ~1 hour per OpenAI docs)
 */
export async function generateImage(
  prompt: string,
  size: ImageSize = "1024x1024"
): Promise<ImageResult> {
  try {
    const apiKey = getOpenAIKey();

    if (!prompt || prompt.trim().length === 0) {
      return { success: false, error: "Image prompt cannot be empty." };
    }

    // Prefix with educational context to get cleaner, more appropriate results
    const enhancedPrompt = `Educational illustration for a learning platform: ${prompt.trim().slice(0, 900)}. Clean, professional style suitable for studying. No text in the image.`;

    const response = await fetch(OPENAI_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size,
        quality: "standard",
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const errorText = await safeReadError(response);
      console.error("DALL-E API error:", response.status, errorText);

      if (response.status === 429) {
        return { success: false, error: "Image generation is rate limited. Please try again in a moment." };
      }
      if (response.status === 400) {
        return { success: false, error: "Image prompt was rejected. Please try a different description." };
      }
      if (response.status === 503 || response.status === 502) {
        return { success: false, error: "Image generation service is temporarily unavailable." };
      }
      return { success: false, error: "Failed to generate image." };
    }

    const data = await response.json();
    const imageUrl = data?.data?.[0]?.url;

    if (!imageUrl) {
      return { success: false, error: "No image was returned from the generation service." };
    }

    return { success: true, imageUrl };
  } catch (err) {
    console.error("generateImage error:", err);
    return { success: false, error: "Failed to generate image." };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
