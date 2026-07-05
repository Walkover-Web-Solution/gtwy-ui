import { memo, useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { BarChart3, ZoomOut } from "lucide-react";

const MetricsChart = memo(({ rawData, currentTheme, factor }) => {
  const FACTOR_OPTIONS = ["Bridges", "API Keys", "Models"];
  const [chartType, setChartType] = useState("bar");

  const [zoom, setZoom] = useState(null);
  const [refArea, setRefArea] = useState({ left: null, right: null });

  const data = rawData.map((item) => ({
    period: item.period,
    totalCost: item.totalCost,
    items: item.items,
  }));

  const displayData = useMemo(() => {
    if (!zoom) return data;
    return data.filter((d) => d.period >= zoom.start && d.period <= zoom.end);
  }, [data, zoom]);

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

  const handleMouseDown = useCallback((e) => {
    if (!e || !e.activeLabel) return;
    setRefArea({ left: e.activeLabel, right: e.activeLabel });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!e || !e.activeLabel) return;
    setRefArea((prev) => {
      if (!prev.left) return prev;
      return { ...prev, right: e.activeLabel };
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    setRefArea((prev) => {
      if (!prev.left || !prev.right || prev.left === prev.right) {
        return { left: null, right: null };
      }
      const [start, end] = prev.left < prev.right ? [prev.left, prev.right] : [prev.right, prev.left];
      setZoom({ start, end });
      return { left: null, right: null };
    });
  }, []);

  if (rawData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-base-content opacity-60">No data available</div>
        </div>
      </div>
    );
  }

  const ChartComponent = chartType === "area" ? AreaChart : BarChart;

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      <div className="flex items-center justify-end mb-2 gap-2">
        {zoom && (
          <button onClick={() => setZoom(null)} className="btn btn-ghost btn-xs btn-circle" title="Reset zoom">
            <ZoomOut size={16} />
          </button>
        )}
        <button
          onClick={() => setChartType((prev) => (prev === "area" ? "bar" : "area"))}
          className="btn btn-ghost btn-xs btn-circle"
          title="Toggle bar / area"
        >
          <BarChart3 size={16} />
        </button>
      </div>
      <div
        style={{
          minWidth: Math.max(800, rawData.length * 60) + "px",
          height: "400px",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={displayData}
            barCategoryGap="20%"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
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
            {chartType === "area" ? (
              <Area
                type="monotone"
                dataKey="totalCost"
                stroke="#4ade80"
                strokeWidth={2}
                fill="#4ade80"
                fillOpacity={0.2}
              />
            ) : (
              <Bar dataKey="totalCost" fill="#4ade80" radius={[4, 4, 0, 0]} />
            )}
            {refArea.left &&
              refArea.right &&
              displayData.length > 0 &&
              (() => {
                const [selStart, selEnd] =
                  refArea.left < refArea.right ? [refArea.left, refArea.right] : [refArea.right, refArea.left];
                const firstX = displayData[0].period;
                const lastX = displayData[displayData.length - 1].period;
                return (
                  <>
                    {selStart !== firstX && (
                      <ReferenceArea
                        x1={firstX}
                        x2={selStart}
                        fill="#000"
                        fillOpacity={0.25}
                        stroke="none"
                        ifOverflow="hidden"
                      />
                    )}
                    {selEnd !== lastX && (
                      <ReferenceArea
                        x1={selEnd}
                        x2={lastX}
                        fill="#000"
                        fillOpacity={0.25}
                        stroke="none"
                        ifOverflow="hidden"
                      />
                    )}
                    <ReferenceArea
                      x1={selStart}
                      x2={selEnd}
                      stroke="#4ade80"
                      strokeOpacity={0.6}
                      fill="#4ade80"
                      fillOpacity={0.1}
                    />
                  </>
                );
              })()}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

MetricsChart.displayName = "MetricsChart";

export default MetricsChart;
