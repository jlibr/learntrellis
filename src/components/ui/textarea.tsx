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
            className="block mb-1.5 text-sm font-medium text-[#A8A29E]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full rounded-[8px] border bg-[#262320] px-3.5 py-2.5 text-sm text-[#EDEDEB] placeholder:text-stone-500 transition-all duration-100",
            "hover:border-white/20",
            "focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "min-h-[80px] resize-y",
            error
              ? "border-red-500/50 ring-2 ring-red-500/20"
              : "border-white/[0.12]",
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
