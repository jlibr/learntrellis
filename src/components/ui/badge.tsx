import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "amber" | "mastered" | "locked";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default:  "bg-white/[0.06] border-white/[0.12] text-[#A8A29E]",
  success:  "bg-green-500/10 border-green-500/20 text-green-400",
  warning:  "bg-amber-500/10 border-amber-500/20 text-[#FCD34D]",
  danger:   "bg-red-500/10 border-red-500/20 text-red-400",
  info:     "bg-blue-400/10 border-blue-400/20 text-blue-300",
  amber:    "bg-amber-500/[0.12] border-amber-500/30 text-amber-500",
  mastered: "bg-violet-400/10 border-violet-400/20 text-violet-400",
  locked:   "bg-white/[0.04] border-white/[0.08] text-[#57534E]",
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
