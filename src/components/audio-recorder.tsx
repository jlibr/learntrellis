"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

type AudioRecorderProps = {
  /** Server action that receives audio blob and returns transcribed text */
  onTranscribe: (audioBase64: string) => Promise<{ success: boolean; text?: string; error?: string }>;
  /** Called when transcription is complete with the text */
  onTranscriptionComplete: (text: string) => void;
  /** Whether the recorder is disabled (e.g., after grading) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
};

/**
 * AudioRecorder — Record spoken answers using MediaRecorder API.
 * Sends recorded audio to a server action for Whisper STT transcription.
 * Only rendered for language topic_type lessons during spoken answer practice.
 */
export function AudioRecorder({
  onTranscribe,
  onTranscriptionComplete,
  disabled = false,
  className = "",
}: AudioRecorderProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    setErrorMsg(null);
    setDuration(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer webm, fall back to whatever is available
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((t) => t.stop());

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (chunksRef.current.length === 0) {
          setErrorMsg("No audio recorded.");
          setStatus("idle");
          return;
        }

        setStatus("transcribing");

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });

        // Convert to base64 for server action transport
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        try {
          const result = await onTranscribe(base64);
          if (result.success && result.text) {
            onTranscriptionComplete(result.text);
            setStatus("idle");
          } else {
            setErrorMsg(result.error || "Transcription failed.");
            setStatus("error");
          }
        } catch {
          setErrorMsg("Transcription failed.");
          setStatus("error");
        }
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop());
        setErrorMsg("Recording failed.");
        setStatus("error");
      };

      recorder.start(1000); // Collect data every second
      setStatus("recording");

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setErrorMsg("Microphone access denied. Please allow microphone access and try again.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setErrorMsg("No microphone found. Please connect a microphone.");
      } else {
        setErrorMsg("Could not start recording.");
      }
      setStatus("error");
    }
  }, [onTranscribe, onTranscriptionComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        {status === "recording" ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={stopRecording}
              className="gap-1.5 text-red-400 hover:text-red-300"
            >
              <StopIcon />
              <span className="text-xs">Stop ({formatDuration(duration)})</span>
            </Button>
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </>
        ) : status === "transcribing" ? (
          <Button variant="ghost" size="sm" disabled className="gap-1.5 text-zinc-400">
            <LoadingIcon />
            <span className="text-xs">Transcribing...</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={startRecording}
            disabled={disabled}
            className="gap-1.5 text-zinc-400 hover:text-zinc-200"
          >
            <MicIcon />
            <span className="text-xs">Record Answer</span>
          </Button>
        )}
      </div>
      {errorMsg && (
        <span className="text-xs text-red-400 text-center">{errorMsg}</span>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="12" height="12" rx="1" />
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
