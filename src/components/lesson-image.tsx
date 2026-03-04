"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

type LessonImageProps = {
  /** Server action that generates the image and returns a URL */
  onRequestImage: () => Promise<{ success: boolean; imageUrl?: string; altText?: string; error?: string }>;
  /** Alt text for the image */
  altText?: string;
  /** Additional CSS classes */
  className?: string;
};

/**
 * LessonImage — Responsive image display for AI-generated lesson illustrations.
 * Lazily generates the image on user request to avoid unnecessary API costs.
 */
export function LessonImage({ onRequestImage, altText = "Lesson illustration", className = "" }: LessonImageProps) {
  const [status, setStatus] = useState<"prompt" | "loading" | "loaded" | "error">("prompt");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setStatus("loading");
    setErrorMsg(null);

    try {
      const result = await onRequestImage();

      if (result.success && result.imageUrl) {
        setImageUrl(result.imageUrl);
        setStatus("loaded");
      } else {
        setErrorMsg(result.error || "Failed to generate image.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Failed to generate image.");
      setStatus("error");
    }
  }, [onRequestImage]);

  if (status === "prompt") {
    return (
      <div className={`flex items-center justify-center rounded-[8px] border border-white/[0.08] bg-[#111113]/50 p-6 ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          className="gap-1.5 text-[#a8a8b0] hover:text-[#eeeeef]"
        >
          <ImageIcon />
          <span className="text-xs">Generate illustration</span>
        </Button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className={`flex flex-col items-center justify-center rounded-[8px] border border-white/[0.08] bg-[#111113]/50 p-8 ${className}`}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="mt-3 text-xs text-[#6e6e78]">Generating illustration...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={`flex flex-col items-center justify-center rounded-[8px] border border-white/[0.08] bg-[#111113]/50 p-6 ${className}`}>
        <p className="text-xs text-red-400">{errorMsg}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          className="mt-2 text-xs text-[#a8a8b0] hover:text-[#eeeeef]"
        >
          Try again
        </Button>
      </div>
    );
  }

  // Loaded state
  return (
    <div className={`overflow-hidden rounded-[8px] border border-white/[0.08] relative group ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl!}
        alt={altText}
        className="w-full h-auto object-contain"
        loading="lazy"
      />
      {altText && (
        <p className="absolute bottom-0 inset-x-0 bg-[#0a0a0c]/80 backdrop-blur-sm px-3 py-2 text-xs text-[#6e6e78]">{altText}</p>
      )}
    </div>
  );
}

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
