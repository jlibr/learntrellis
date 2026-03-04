import { cn } from "@/lib/utils";
import { type TextareaHTMLAttributes, forwardRef } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block mb-1.5 text-sm font-medium text-[#a8a8b0]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full rounded-[8px] border bg-[#111113] px-3.5 py-2.5 text-sm text-[#eeeeef] placeholder:text-[#45454d] transition-all duration-100",
            "hover:border-white/[0.14] hover:bg-[#151517]",
            "focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15 focus:bg-[#1a1a1d]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "min-h-[80px] resize-y",
            error
              ? "border-red-500/50 ring-2 ring-red-500/20"
              : "border-white/[0.07]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-[13px] text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
