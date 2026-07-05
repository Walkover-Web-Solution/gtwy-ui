import React from "react";

export const AnalyticsStatsSkeleton = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col gap-1">
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-base-200 animate-pulse">
              <div className="w-4 h-4" />
            </div>
            <div className="h-4 w-10 bg-base-200 rounded animate-pulse" />
          </div>
          <div className="flex flex-col mt-2 gap-1.5">
            <div className="h-6 w-16 bg-base-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-base-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const AnalyticsChartSkeleton = ({ title = "Chart" }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-base-200 rounded animate-pulse" />
          <div className="h-3 w-48 bg-base-200 rounded animate-pulse" />
        </div>
        <div className="h-8 w-8 bg-base-200 rounded-full animate-pulse" />
      </div>
      <div className="flex-1 min-h-[200px] space-y-4">
        <div className="h-4 w-full bg-base-200 rounded animate-pulse" />
        <div className="h-4 w-[92%] bg-base-200 rounded animate-pulse" />
        <div className="h-4 w-[88%] bg-base-200 rounded animate-pulse" />
        <div className="h-4 w-[95%] bg-base-200 rounded animate-pulse" />
        <div className="h-4 w-[80%] bg-base-200 rounded animate-pulse" />
        <div className="h-4 w-[90%] bg-base-200 rounded animate-pulse" />
        <div className="h-4 w-[85%] bg-base-200 rounded animate-pulse" />
        <div className="h-4 w-[75%] bg-base-200 rounded animate-pulse" />
        <div className="relative h-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-base-100/40 to-transparent animate-[shimmer_1.6s_infinite] -translate-x-full" />
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  );
};

export const AnalyticsThreadListSkeleton = () => {
  return (
    <div className="p-3 space-y-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className="h-3 w-16 bg-base-200 rounded animate-pulse mb-2" />
          {Array.from({ length: 2 }).map((_, j) => (
            <div
              key={j}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-base-200/50 animate-pulse"
            >
              <div className="h-3 w-3/4 bg-base-200 rounded" />
              <div className="h-3 w-12 bg-base-200 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default AnalyticsStatsSkeleton;
