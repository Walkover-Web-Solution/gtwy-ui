import { memo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MetricsChart = memo(({ rawData, currentTheme, factor }) => {
  const FACTOR_OPTIONS = ["Bridges", "API Keys", "Models"];

  const data = rawData.map((item) => ({
    period: item.period,
    totalCost: item.totalCost,
    items: item.items,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0].payload;
    return (
      <div
        className="bg-white p-4 shadow-xl min-w-[250px] max-w-[350px]"
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div className="text-base font-semibold text-black mb-3 text-center border-b border-gray-200 pb-2">
          {point.period}
        </div>
        <div className="text-sm font-semibold text-black mb-2">Total Cost: ${point.totalCost?.toFixed(3)}</div>
        <div className="text-xs text-gray-500 mb-2">{FACTOR_OPTIONS[factor]} Breakdown:</div>
        <div className="space-y-1">
          {point.items?.map((item) => (
            <div key={item.name} className="flex justify-between items-center text-[11px] text-black">
              <span className="flex-1 mr-2 truncate">{item.name}</span>
              <span className="font-semibold min-w-[50px] text-right">${item.cost?.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const axisColor = currentTheme === "dark" ? "oklch(var(--bc))" : "#374151";
  const gridColor = currentTheme === "dark" ? "oklch(var(--bc) / 0.2)" : "#e5e7eb";

  if (rawData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-base-content opacity-60">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      <div
        style={{
          minWidth: Math.max(800, rawData.length * 60) + "px",
          height: "400px",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="period"
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={{ stroke: axisColor }}
              tickLine={{ stroke: axisColor }}
            />
            <YAxis
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={{ stroke: axisColor }}
              tickLine={{ stroke: axisColor }}
              tickFormatter={(value) => "$" + (value?.toFixed(2) || "0.00")}
              label={{
                value: "Cost ( in $ )",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fill: axisColor, fontSize: 12 },
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(113, 117, 115, 0.15)" }} />
            <Bar dataKey="totalCost" fill="#4ade80" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

MetricsChart.displayName = "MetricsChart";

export default MetricsChart;
