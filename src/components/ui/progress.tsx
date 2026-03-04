import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number; // 0-100
  className?: string;
  label?: string;
};

export function Progress({ value, className, label }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-medium text-[#A8A29E]">{label}</span>
          <span className="text-[13px] text-[#8A8480]">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-[width] duration-[400ms] ease-out shadow-[0_0_8px_rgba(245,158,11,0.3)]"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
