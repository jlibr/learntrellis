"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useCallback, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }

    if (e.key !== "Tab" || !dialogRef.current) return;

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      // Auto-focus first focusable element in dialog
      requestAnimationFrame(() => {
        const focusable = dialogRef.current?.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      });
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-[4px] flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef}
        className={cn(
          "w-full max-w-[560px] rounded-[16px] border border-white/[0.12] bg-[#1E1C19] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,251,235,0.08)] max-h-[90vh] overflow-y-auto",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#EDEDEB]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[#8A8480] hover:text-[#A8A29E] transition-colors h-11 w-11 flex items-center justify-center"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
