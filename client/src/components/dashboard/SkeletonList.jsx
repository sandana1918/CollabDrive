export const SkeletonList = ({ rows = 6 }) => (
  <div className="overflow-hidden rounded-[24px] border border-[#e4ebf4] bg-white">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="grid min-h-[72px] grid-cols-[48px_minmax(280px,1.9fr)_minmax(150px,0.8fr)_minmax(132px,0.74fr)_minmax(132px,0.74fr)_minmax(132px,0.75fr)_minmax(108px,0.45fr)_68px] items-center border-t border-[#edf2f8] px-4 first:border-t-0">
        <div className="mx-auto h-4 w-4 rounded bg-[#edf3fb] animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#edf3fb] animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-44 rounded bg-[#edf3fb] animate-pulse" />
            <div className="h-3 w-28 rounded bg-[#f3f6fb] animate-pulse" />
          </div>
        </div>
        <div className="h-4 w-28 rounded bg-[#edf3fb] animate-pulse" />
        <div className="h-4 w-24 rounded bg-[#edf3fb] animate-pulse" />
        <div className="h-4 w-20 rounded bg-[#edf3fb] animate-pulse" />
        <div className="h-4 w-24 rounded bg-[#edf3fb] animate-pulse" />
        <div className="h-4 w-12 rounded bg-[#edf3fb] animate-pulse" />
        <div className="mx-auto h-8 w-8 rounded-full bg-[#edf3fb] animate-pulse" />
      </div>
    ))}
  </div>
);
