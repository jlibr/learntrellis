import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-1.5 text-sm font-medium text-[#A8A29E]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-[8px] border bg-[#1E1C19] px-3.5 py-2.5 text-sm text-[#EDEDEB] placeholder:text-[#57534E] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] transition-all duration-100",
            "hover:border-white/20 hover:bg-[#222019]",
            "focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 focus:bg-[#262320]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
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

Input.displayName = "Input";
