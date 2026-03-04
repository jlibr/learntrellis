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
            className="block text-sm font-medium text-zinc-300"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full rounded-md border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors",
            "focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500",
            "min-h-[80px] resize-y",
            error
              ? "border-red-500"
              : "border-zinc-700 hover:border-zinc-600",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
