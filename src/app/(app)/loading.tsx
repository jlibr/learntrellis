export default function AppLoading() {
  return (
    <div className="animate-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="skeleton h-8 w-48 rounded-[8px]" />
        <div className="skeleton h-9 w-28 rounded-[8px]" />
      </div>

      {/* Cards skeleton — matches 2-col dashboard layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[14px] border border-white/[0.07] bg-[#111113] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="skeleton h-5 w-40 rounded-[6px]" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
            <div className="skeleton h-4 w-full rounded-[4px]" />
            <div className="skeleton h-4 w-3/4 rounded-[4px]" />
            <div className="skeleton h-1.5 w-full rounded-full" />
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
              <div />
              <div className="skeleton h-4 w-28 rounded-[4px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
