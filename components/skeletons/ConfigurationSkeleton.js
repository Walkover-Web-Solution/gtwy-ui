import React from "react";

const ConfigurationSkeleton = () => {
  return (
    <div className="h-screen w-full bg-base-300 text-base-content overflow-hidden">
      {/* Main layout */}
      <div className="h-[calc(100vh-3.5rem)] flex">
        {/* Left panel */}
        <div className="w-[44%] min-w-[420px] border-r border-base-200 p-4 space-y-4">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 bg-base-200 rounded animate-pulse" />
            <div className="h-8 w-36 bg-base-200 rounded animate-pulse" />
          </div>

          {/* Prompt area skeleton */}
          <div className="rounded-xl border border-base-200 bg-base-300 p-4 min-h-[500px]">
            <div className="h-3 w-24 bg-base-200 rounded animate-pulse mb-4" />
            <div className="space-y-3 mb-6">
              <div className="h-3 w-[90%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[82%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[60%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[75%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[40%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[85%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[70%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[55%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[65%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[45%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[85%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[65%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[95%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[45%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[65%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[75%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[85%] bg-base-100 rounded animate-pulse" />
              <div className="h-3 w-[95%] bg-base-100 rounded animate-pulse" />
            </div>

            <div className="mt-auto flex items-center justify-between">
              <div className="h-3 w-64 bg-base-100 rounded animate-pulse" />
              <div className="h-8 w-36 bg-base-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Tool button */}
          <div className="h-10 w-28 bg-base-200 rounded-lg animate-pulse" />

          {/* Agents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-base-200 rounded animate-pulse" />
              <div className="h-8 w-20 bg-base-200 rounded animate-pulse" />
            </div>
            <div className="h-12 w-full bg-base-100 rounded-xl animate-pulse" />
          </div>

          {/* Knowledge Base */}
          <div className="space-y-3 pt-2">
            <div className="h-4 w-36 bg-base-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-base-200 rounded-lg animate-pulse" />
            <div className="h-9 w-32 bg-base-100 rounded animate-pulse" />
          </div>

          {/* Bottom issues pill */}
          <div className="mt-auto pt-4">
            <div className="h-9 w-44 bg-base-100 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-28 bg-base-200 rounded animate-pulse" />
            <div className="h-9 w-9 bg-base-100 rounded-lg animate-pulse" />
          </div>

          {/* Big empty canvas skeleton */}
          <div className="flex-1 rounded-xl border border-base-200 bg-base-300 relative overflow-hidden">
            {/* subtle shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-base-100/40 to-transparent animate-[shimmer_1.6s_infinite] -translate-x-full" />
          </div>

          {/* Bottom input bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-12 bg-base-100 rounded-xl animate-pulse" />
            <div className="h-12 w-12 bg-base-200 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  );
};

export default ConfigurationSkeleton;
