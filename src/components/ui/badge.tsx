import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-zinc-800 text-zinc-300 border-zinc-700",
  success: "bg-green-900/30 text-green-400 border-green-500/20",
  warning: "bg-amber-900/30 text-amber-400 border-amber-500/20",
  danger: "bg-red-900/30 text-red-400 border-red-500/20",
  info: "bg-blue-900/30 text-blue-400 border-blue-500/20",
};

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
