import { memo } from "react";
import { aggregateDataByFactor } from "@/customHooks/useMetricsData";

const TokenUsageOverview = memo(({ rawData }) => {
  const aggregatedData = aggregateDataByFactor(rawData);

  if (aggregatedData.length === 0) {
    return (
      <div className="bg-base-100 shadow-md rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Token Usage Overview</h2>
        <div className="text-center py-4">
          <div className="text-base-content opacity-60">No data available</div>
        </div>
      </div>
    );
  }

  const maxTokens = Math.max(...aggregatedData.map((i) => i.tokens));

  return (
    <div className="bg-base-100 shadow-md rounded-lg p-6">
      <h2 className="text-lg font-bold mb-4">Token Usage Overview</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {aggregatedData.map((item, index) => {
          const widthPercentage = maxTokens > 0 ? (item.tokens / maxTokens) * 95 : 0;

          return (
            <div key={index} className="relative mb-2">
              <div
                className="absolute inset-0 bg-base-300 rounded transition-all duration-300"
                style={{ width: `${widthPercentage}%` }}
              ></div>

              <div className="relative flex items-center justify-between p-2 z-10">
                <div className="flex-grow overflow-hidden text-ellipsis">
                  <div className="text-base-content font-medium text-sm">{item.name || `Item ${index + 1}`}</div>
                </div>
                <div className="ml-3 text-right flex-shrink-0">
                  <div className="font-bold text-xs text-base-content">tokens: {item.tokens.toLocaleString()}</div>
                  <div className="text-xs text-base-content opacity-60">cost: ${item.cost.toFixed(3)}</div>
                </div>
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
