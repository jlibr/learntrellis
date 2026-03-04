"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveApiKey, testApiKey, removeApiKey } from "./actions";

type Props = {
  currentProvider: string | null;
  hasKey: boolean;
  subscriptionStatus: string;
};

const PROVIDERS = [
  {
    id: "openrouter" as const,
    name: "OpenRouter",
    description: "Access Claude, GPT, Llama, and more through one API.",
    url: "https://openrouter.ai/keys",
  },
  {
    id: "venice" as const,
    name: "Venice",
    description: "Privacy-focused AI API with uncensored models.",
    url: "https://venice.ai/settings/api",
  },
];

export function ProviderSettings({
  currentProvider,
  hasKey,
  subscriptionStatus,
}: Props) {
  const [selectedProvider, setSelectedProvider] = useState(
    currentProvider || "openrouter"
  );
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<
    "idle" | "testing" | "saving" | "removing"
  >("idle");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleTest() {
    if (!apiKey.trim()) {
      setMessage({ type: "error", text: "Enter an API key first." });
      return;
    }

    setStatus("testing");
    setMessage(null);

    const result = await testApiKey(selectedProvider, apiKey);

    if (result.success) {
      setMessage({ type: "success", text: "Key verified. Ready to save." });
    } else {
      setMessage({ type: "error", text: result.error });
    }

    setStatus("idle");
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      setMessage({ type: "error", text: "Enter an API key first." });
      return;
    }

    setStatus("saving");
    setMessage(null);

    // Test first, then save
    const testResult = await testApiKey(selectedProvider, apiKey);
    if (!testResult.success) {
      setMessage({
        type: "error",
        text: testResult.error,
      });
      setStatus("idle");
      return;
    }

    const saveResult = await saveApiKey(selectedProvider, apiKey);
    if (saveResult.success) {
      setMessage({ type: "success", text: "API key saved." });
      setApiKey("");
      // Refresh the page to show updated state
      window.location.reload();
    } else {
      setMessage({ type: "error", text: saveResult.error });
    }

    setStatus("idle");
  }

  async function handleRemove() {
    setStatus("removing");
    setMessage(null);

    const result = await removeApiKey();
    if (result.success) {
      setMessage({ type: "success", text: "API key removed." });
      window.location.reload();
    } else {
      setMessage({ type: "error", text: result.error });
    }

    setStatus("idle");
  }

  const isHosted =
    subscriptionStatus === "active" && !hasKey;

  return (
    <Card>
      {isHosted && (
        <div className="mb-4 rounded-md bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <p className="text-sm text-amber-400">
            Using hosted API key via your subscription. You can optionally add
            your own key below.
          </p>
        </div>
      )}

      {/* Provider Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#eeeeef]">
          Provider
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedProvider(p.id)}
              className={`rounded-[8px] border p-3 text-left transition-colors duration-150 cursor-pointer ${
                selectedProvider === p.id
                  ? "border-amber-500 bg-amber-500/5"
                  : "border-white/[0.12] bg-[#222225]/50 hover:border-white/[0.16]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#eeeeef]">
                  {p.name}
                </span>
                {currentProvider === p.id && hasKey && (
                  <Badge variant="success">Active</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-[#6e6e78]">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* API Key Input */}
      <div className="mt-5">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="API Key"
              type="password"
              placeholder={hasKey ? "Key saved (enter new key to replace)" : "sk-or-..."}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setMessage(null);
              }}
              autoComplete="off"
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-[#6e6e78]">
          Get your key from{" "}
          <a
            href={
              PROVIDERS.find((p) => p.id === selectedProvider)?.url || "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500 hover:text-amber-400"
          >
            {PROVIDERS.find((p) => p.id === selectedProvider)?.name}
          </a>
          . Keys are encrypted before storage and never leave the server.
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`mt-4 rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-900/20 border border-green-500/20 text-green-400"
              : "bg-red-900/20 border border-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        <Button
          onClick={handleTest}
          variant="secondary"
          size="sm"
          disabled={status !== "idle" || !apiKey.trim()}
        >
          {status === "testing" ? "Testing..." : "Test Key"}
        </Button>
        <Button
          onClick={handleSave}
          size="sm"
          disabled={status !== "idle" || !apiKey.trim()}
        >
          {status === "saving" ? "Saving..." : "Save Key"}
        </Button>
        {hasKey && (
          <Button
            onClick={handleRemove}
            variant="danger"
            size="sm"
            disabled={status !== "idle"}
          >
            {status === "removing" ? "Removing..." : "Remove Key"}
          </Button>
        )}
      </div>
    </Card>
  );
}
