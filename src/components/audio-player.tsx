"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";

type AudioPlayerProps = {
  /** Server action that returns audio as base64 string */
  onRequestAudio: () => Promise<{ success: boolean; audio?: string; error?: string }>;
  /** Label shown next to the play button */
  label?: string;
  /** Additional CSS classes */
  className?: string;
};

/**
 * AudioPlayer — Play/pause TTS audio for lesson content.
 * Calls a server action to generate audio on first play, then caches it.
 * Only rendered for language topic_type lessons.
 */
export function AudioPlayer({ onRequestAudio, label = "Listen", className = "" }: AudioPlayerProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const handlePlay = useCallback(async () => {
    setErrorMsg(null);

    // If we already have audio loaded, just play/pause
    if (audioRef.current && audioUrlRef.current) {
      if (status === "playing") {
        audioRef.current.pause();
        setStatus("paused");
        return;
      }
      if (status === "paused") {
        await audioRef.current.play();
        setStatus("playing");
        return;
      }
    }

    // First time: request audio from server
    setStatus("loading");
    try {
      const result = await onRequestAudio();

      if (!result.success || !result.audio) {
        setErrorMsg(result.error || "Failed to generate audio.");
        setStatus("error");
        return;
      }

      // Convert base64 to blob URL
      const binaryString = atob(result.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      // Clean up previous URL if any
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => setStatus("idle");
      audio.onerror = () => {
        setErrorMsg("Audio playback failed.");
        setStatus("error");
      };

      await audio.play();
      setStatus("playing");
    } catch {
      setErrorMsg("Failed to generate audio.");
      setStatus("error");
    }
  }, [onRequestAudio, status]);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePlay}
        disabled={status === "loading"}
        className="gap-1.5 text-zinc-400 hover:text-zinc-200"
      >
        {status === "loading" ? (
          <>
            <LoadingIcon />
            <span className="text-xs">Generating...</span>
          </>
        ) : status === "playing" ? (
          <>
            <PauseIcon />
            <span className="text-xs">Pause</span>
          </>
        ) : (
          <>
            <PlayIcon />
            <span className="text-xs">{label}</span>
          </>
        )}
      </Button>
      {errorMsg && (
        <span className="text-xs text-red-400">{errorMsg}</span>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}
