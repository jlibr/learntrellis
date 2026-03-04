import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-amber-500 text-[#0F0E0D] hover:bg-amber-400 active:bg-amber-600 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0E0D]",
  secondary:
    "text-[#EDEDEB] border border-white/[0.15] hover:bg-white/[0.06] hover:border-white/20 active:bg-white/[0.10] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0E0D]",
  ghost:
    "text-[#A8A29E] hover:bg-white/[0.06] hover:text-[#EDEDEB] active:bg-white/[0.10] disabled:opacity-40 disabled:pointer-events-none",
  danger:
    "text-red-400 border border-red-500/20 bg-red-500/10 hover:bg-red-500/[0.18] hover:border-red-500/35 active:bg-red-500/25 disabled:opacity-40 disabled:pointer-events-none",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm h-8",
  md: "px-4 py-2 text-sm h-9",
  lg: "px-6 py-3 text-base h-11",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-[8px] font-semibold transition-all duration-150",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
