/**
 * AI Provider Abstraction Layer
 *
 * Single entry point for all LLM calls. Supports OpenRouter and Venice
 * (both OpenAI-compatible APIs) with streaming and error handling.
 *
 * SECURITY: This module runs server-side only. Never import from client components.
 */

export type ProviderName = "openrouter" | "venice";

export type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CompletionOptions = {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  /** Force JSON output from the model */
  jsonMode?: boolean;
  /** Abort signal for request cancellation */
  signal?: AbortSignal;
};

export type CompletionResult = {
  content: string;
  finishReason: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
};

/** Provider-specific base URLs */
export const PROVIDER_URLS: Record<ProviderName, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  venice: "https://api.venice.ai/api/v1",
};

/**
 * Build a ProviderConfig from a provider name and API key.
 */
export function buildProviderConfig(
  provider: ProviderName,
  apiKey: string,
  model: string
): ProviderConfig {
  const baseUrl = PROVIDER_URLS[provider];
  if (!baseUrl) {
    throw new Error(`Unknown provider: "${provider}". Expected "openrouter" or "venice".`);
  }
  return { baseUrl, apiKey, model };
}

/**
 * Non-streaming chat completion. Returns the full response.
 */
export async function chatCompletion(
  config: ProviderConfig,
  messages: Message[],
  options?: CompletionOptions
): Promise<CompletionResult> {
  const response = await makeRequest(config, messages, {
    ...options,
    stream: false,
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content ?? "",
    finishReason: choice?.finish_reason ?? null,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : null,
  };
}

/**
 * Streaming chat completion. Returns a ReadableStream of text chunks.
 * Use this for lesson delivery where perceived latency matters.
 */
export function chatCompletionStream(
  config: ProviderConfig,
  messages: Message[],
  options?: Omit<CompletionOptions, "stream">
): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      let response: Response;
      try {
        response = await makeRequest(config, messages, {
          ...options,
          stream: true,
        });
      } catch (err) {
        controller.error(
          err instanceof Error ? err : new Error("Failed to connect to AI provider")
        );
        return;
      }

      if (!response.ok) {
        try {
          await handleApiError(response);
        } catch (err) {
          controller.error(err);
        }
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        controller.error(new Error("No response body from AI provider"));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(delta);
              }
            } catch {
              // Skip malformed SSE chunks
            }
          }
        }

        controller.close();
      } catch (err) {
        controller.error(
          err instanceof Error ? err : new Error("Stream interrupted")
        );
      } finally {
        reader.releaseLock();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function makeRequest(
  config: ProviderConfig,
  messages: Message[],
  options?: CompletionOptions
): Promise<Response> {
  const url = `${config.baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: options?.stream ?? false,
  };

  if (options?.temperature !== undefined) body.temperature = options.temperature;
  if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;
  if (options?.jsonMode) body.response_format = { type: "json_object" };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };

  // OpenRouter expects these optional headers for ranking/attribution
  if (config.baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://learntrellis.com";
    headers["X-Title"] = "LearnTrellis";
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: options?.signal,
  });
}

async function handleApiError(response: Response): Promise<never> {
  let message = "AI provider request failed";

  try {
    const data = await response.json();
    // Most OpenAI-compatible APIs return { error: { message: "..." } }
    if (data?.error?.message) {
      message = data.error.message;
    }
  } catch {
    // Body wasn't JSON
  }

  if (response.status === 401) {
    throw new ProviderError("Invalid API key. Please check your key and try again.", "INVALID_KEY");
  }
  if (response.status === 429) {
    throw new ProviderError("Rate limited by AI provider. Please wait and try again.", "RATE_LIMITED");
  }
  if (response.status === 503 || response.status === 502) {
    throw new ProviderError("AI provider is temporarily unavailable. Please try again.", "PROVIDER_DOWN");
  }
  if (response.status === 408 || response.status === 504) {
    throw new ProviderError("AI provider request timed out. Please try again.", "TIMEOUT");
  }

  throw new ProviderError(message, "UNKNOWN");
}

export type ProviderErrorCode =
  | "INVALID_KEY"
  | "RATE_LIMITED"
  | "PROVIDER_DOWN"
  | "TIMEOUT"
  | "UNKNOWN";

export class ProviderError extends Error {
  code: ProviderErrorCode;

  constructor(message: string, code: ProviderErrorCode) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
  }
}
