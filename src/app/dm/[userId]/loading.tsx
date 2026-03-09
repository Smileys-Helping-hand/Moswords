// Route-level loading skeleton for /dm/[userId]
// Next.js App Router shows this automatically while the page is loading.
export default function DmLoading() {
  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-screen min-h-0 bg-background">
      {/* Header skeleton */}
      <div className="bg-background/95 border-b border-border/50 px-3 py-2.5 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="skeleton w-9 h-9 rounded-xl md:hidden" />
          <div className="skeleton w-9 h-9 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <div className="skeleton h-3.5 w-28 rounded" />
            <div className="skeleton h-2.5 w-14 rounded" />
          </div>
        </div>
        <div className="flex gap-1">
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="skeleton w-9 h-9 rounded-xl" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-3 overflow-hidden">
        {[80, 60, 200, 100, 140, 80, 120, 60, 160].map((w, i) => (
          <div key={i} className={`flex items-end gap-2 ${i % 3 !== 0 ? 'flex-row-reverse' : ''}`}>
            {i % 3 === 0 && <div className="skeleton w-8 h-8 rounded-full shrink-0" />}
            <div className="skeleton h-10 rounded-2xl" style={{ width: w }} />
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="p-4 border-t border-border/40 flex items-center gap-2">
        <div className="skeleton w-9 h-9 rounded-xl" />
        <div className="skeleton flex-1 h-10 rounded-xl" />
        <div className="skeleton w-9 h-9 rounded-xl" />
      </div>
    </div>
  );
}
