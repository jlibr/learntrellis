export default function AppLoading() {
  return (
    <div className="animate-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="skeleton h-8 w-48 rounded-[8px]" />
        <div className="skeleton h-9 w-28 rounded-[8px]" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[12px] border border-white/[0.08] bg-gradient-to-b from-[#1A1816] to-[#161513] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="skeleton h-5 w-32 rounded-[6px]" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
            <div className="skeleton h-3 w-24 rounded-[4px]" />
            <div className="skeleton h-1.5 w-full rounded-full" />
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
              <div />
              <div className="skeleton h-8 w-28 rounded-[8px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
