import { memo } from "react";
import { aggregateDataByFactor } from "@/customHooks/useMetricsData";

const TokenUsageOverview = memo(({ rawData }) => {
  const aggregatedData = aggregateDataByFactor(rawData);

  const formatNumber = (value) =>
    Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(value || 0));

  const formatFullNumber = (value) => Intl.NumberFormat("en-US").format(Number(value || 0));

  if (aggregatedData.length === 0) {
    return (
      <div className="bg-base-100 shadow-md rounded-xl p-6 border border-base-300/70">
        <h2 className="text-lg font-bold mb-4">Token Usage Overview</h2>
        <div className="text-center py-4">
          <div className="text-base-content opacity-60">No data available</div>
        </div>
      </div>
    );
  }

  const totalTokens = aggregatedData.reduce((sum, item) => sum + (item.tokens || 0), 0);
  const totalInputTokens = aggregatedData.reduce((sum, item) => sum + (item.inputTokens || 0), 0);
  const totalOutputTokens = aggregatedData.reduce((sum, item) => sum + (item.outputTokens || 0), 0);
  const totalCost = aggregatedData.reduce((sum, item) => sum + (item.cost || 0), 0);
  const maxTokens = Math.max(...aggregatedData.map((i) => i.tokens), 0);
  const totalEntities = aggregatedData.length;
  const topFiveShare =
    totalTokens > 0
      ? (aggregatedData.slice(0, 5).reduce((sum, item) => sum + (item.tokens || 0), 0) / totalTokens) * 100
      : 0;

  return (
    <div className="bg-base-100 shadow-md rounded-xl p-4 md:p-6 border border-base-300/70">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold">Token Usage Overview</h2>
          <p className="text-sm text-base-content/65">Ranked by token consumption and contribution share.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 text-right w-full">
          <div className="px-2 py-1.5 rounded-md bg-base-200/60 min-w-[88px]">
            <div className="text-[10px] uppercase text-base-content/60">Total Tokens</div>
            <div className="text-sm font-semibold" title={formatFullNumber(totalTokens)}>
              {formatNumber(totalTokens)}
            </div>
          </div>
          <div className="px-2 py-1.5 rounded-md bg-base-200/60 min-w-[88px]">
            <div className="text-[10px] uppercase text-base-content/60">Input Tokens</div>
            <div className="text-sm font-semibold" title={formatFullNumber(totalInputTokens)}>
              {formatNumber(totalInputTokens)}
            </div>
          </div>
          <div className="px-2 py-1.5 rounded-md bg-base-200/60 min-w-[88px]">
            <div className="text-[10px] uppercase text-base-content/60">Output Tokens</div>
            <div className="text-sm font-semibold" title={formatFullNumber(totalOutputTokens)}>
              {formatNumber(totalOutputTokens)}
            </div>
          </div>
          <div className="px-2 py-1.5 rounded-md bg-base-200/60 min-w-[88px]">
            <div className="text-[10px] uppercase text-base-content/60">Total Cost</div>
            <div className="text-sm font-semibold">${totalCost.toFixed(2)}</div>
          </div>
          <div className="px-2 py-1.5 rounded-md bg-base-200/60 min-w-[88px]">
            <div className="text-[10px] uppercase text-base-content/60">Top 5 Share</div>
            <div className="text-sm font-semibold">{topFiveShare.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-[11px] text-base-content/60 px-1">
        <span>{totalEntities} items ranked</span>
        <span>Higher bar = higher token usage</span>
      </div>

      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        {aggregatedData.map((item, index) => {
          const widthPercentage = maxTokens > 0 ? (item.tokens / maxTokens) * 100 : 0;
          const share = totalTokens > 0 ? ((item.tokens || 0) / totalTokens) * 100 : 0;
          const rankTone =
            index === 0
              ? "bg-success/20 text-success"
              : index === 1
                ? "bg-info/20 text-info"
                : index === 2
                  ? "bg-warning/20 text-warning"
                  : "bg-base-200 text-base-content/70";

          return (
            <div key={index} className="relative border border-base-300/70 rounded-lg p-3 overflow-hidden bg-base-100">
              <div
                className="absolute left-0 top-0 h-full bg-success/10 transition-all duration-300"
                style={{ width: `${widthPercentage}%` }}
              ></div>

              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full text-center text-xs font-semibold grid place-items-center ${rankTone}`}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base-content font-medium text-sm truncate">
                      {item.name || `Item ${index + 1}`}
                    </div>
                    <div className="text-[11px] text-base-content/60">{share.toFixed(1)}% of token volume</div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-xs text-base-content" title={formatFullNumber(item.tokens)}>
                    {formatNumber(item.tokens)} tokens
                  </div>
                  <div className="text-[11px] text-base-content/70">
                    In {formatNumber(item.inputTokens || 0)} | Out {formatNumber(item.outputTokens || 0)}
                  </div>
                  <div className="text-xs text-base-content/70">${item.cost.toFixed(3)} cost</div>
                </div>
              </div>

              <div className="relative z-10 mt-2 h-1.5 rounded-full bg-base-200/90 overflow-hidden">
                <div className="h-full bg-success/70" style={{ width: `${widthPercentage}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

TokenUsageOverview.displayName = "TokenUsageOverview";

export default TokenUsageOverview;
