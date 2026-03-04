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
    "bg-gradient-to-b from-amber-400 to-amber-500 text-[#0a0a0c] font-semibold shadow-button-primary hover:from-amber-300 hover:to-amber-400 hover:shadow-button-primary-hover active:from-amber-500 active:to-amber-600 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0c]",
  secondary:
    "text-[#eeeeef] border border-white/[0.10] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.16] active:bg-white/[0.09] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0c]",
  ghost:
    "text-[#a8a8b0] hover:bg-white/[0.05] hover:text-[#eeeeef] active:bg-white/[0.08] disabled:opacity-40 disabled:pointer-events-none",
  danger:
    "text-red-400 border border-red-500/20 bg-red-500/10 hover:bg-red-500/[0.18] hover:border-red-500/35 active:bg-red-500/25 disabled:opacity-40 disabled:pointer-events-none",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-sm h-8",
  md: "px-4 py-2 text-sm h-9",
  lg: "px-6 py-3 text-base h-11",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-[8px] font-medium transition-all duration-150",
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
