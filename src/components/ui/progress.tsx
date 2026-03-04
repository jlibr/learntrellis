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
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">{label}</span>
          <span className="text-xs text-zinc-500">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-300"
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
