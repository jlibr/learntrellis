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
    "bg-amber-500 text-zinc-950 hover:bg-amber-400 active:bg-amber-600 disabled:bg-amber-500/50 disabled:text-zinc-950/50",
  secondary:
    "bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700 active:bg-zinc-600 disabled:bg-zinc-800/50 disabled:text-zinc-400",
  ghost:
    "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 active:bg-zinc-700 disabled:text-zinc-600",
  danger:
    "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:bg-red-500/30 disabled:text-red-400/50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none",
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
