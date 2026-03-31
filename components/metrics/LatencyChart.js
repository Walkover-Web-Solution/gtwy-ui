import { memo } from "react";
import Chart from "@/components/LazyApexChart";

const LatencyChart = memo(({ rawData, currentTheme, factor, selectedBridge }) => {
  const latencyData = rawData.map((item) => {
    const totalLatency = (item?.items || []).reduce((sum, entry) => sum + (Number(entry?.latency) || 0), 0);
    const totalRequests = (item?.items || []).reduce((sum, entry) => sum + (Number(entry?.totalRequests) || 0), 0);
    const avgLatencyMs = totalRequests > 0 ? totalLatency / totalRequests : 0;
    return avgLatencyMs;
  });

  const chartData = {
    series: [
      {
        type: "line",
        name: "Average Latency (ms)",
        data: latencyData,
      },
    ],
    categories: rawData.map((item) => item.period),
  };

  const maxVisibleLabels = 10;
  const labelStep = Math.max(1, Math.ceil(chartData.categories.length / maxVisibleLabels));
  const shouldRotateLabels = chartData.categories.length > maxVisibleLabels;

  const chartOptions = {
    chart: {
      type: "line",
      height: 300,
      width: "100%",
      background: "transparent",
      foreColor: "oklch(var(--bc))",
      toolbar: {
        show: true,
        autoSelected: "pan",
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: true,
          zoomout: true,
          pan: false,
          reset: false,
        },
      },
      zoom: {
        enabled: true,
      },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
      },
    },
    theme: {
      mode: currentTheme,
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2.5,
      curve: "smooth",
      colors: ["#f59e0b"],
    },
    markers: {
      size: 4,
      colors: ["#f59e0b"],
      strokeColors: "oklch(var(--b1))",
      strokeWidth: 2,
      hover: {
        sizeOffset: 3,
      },
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        rotate: shouldRotateLabels ? -45 : 0,
        hideOverlappingLabels: true,
        formatter: function (value, timestamp, opts) {
          const index = opts?.i ?? 0;
          return index % labelStep === 0 ? value : "";
        },
        style: {
          fontSize: "11px",
          colors: "oklch(var(--bc))",
        },
      },
      axisBorder: {
        show: true,
        color: "oklch(var(--bc) / 0.2)",
      },
    },
    yaxis: {
      title: {
        text: "Latency (ms)",
        style: {
          color: "oklch(var(--bc))",
        },
      },
      labels: {
        style: {
          colors: "oklch(var(--bc))",
        },
        formatter: function (value) {
          return value?.toFixed(0) + "ms";
        },
      },
    },
    colors: ["#f59e0b"],
    grid: {
      borderColor: "oklch(var(--bc) / 0.2)",
      strokeDashArray: 3,
    },
    tooltip: {
      theme: currentTheme === "dark" ? "dark" : "light",
      shared: false,
      custom: function ({ series, dataPointIndex }) {
        const periodData = rawData[dataPointIndex];
        if (!periodData) return "";

        const avgLatency = series?.[0]?.[dataPointIndex] || 0;
        const showAgentLatency = factor === 0 && !selectedBridge?.bridge_id;

        const agentRows = showAgentLatency
          ? [...(periodData.items || [])]
              .map((item) => {
                const requestCount = Number(item?.totalRequests) || 0;
                const itemLatency = Number(item?.latency) || 0;
                const agentAvgLatencyMs = requestCount > 0 ? itemLatency / requestCount : itemLatency;
                return {
                  name: item?.name || "Unknown Agent",
                  avgLatency: agentAvgLatencyMs,
                };
              })
              .sort((a, b) => b.avgLatency - a.avgLatency)
          : [];

        const visibleRows = agentRows.slice(0, 8);
        const hiddenCount = Math.max(0, agentRows.length - visibleRows.length);

        return `
          <div style="
            background: ${currentTheme === "dark" ? "#111827" : "#ffffff"};
            color: ${currentTheme === "dark" ? "#e5e7eb" : "#111827"};
            border: 1px solid ${currentTheme === "dark" ? "#374151" : "#e5e7eb"};
            border-radius: 10px;
            padding: 12px;
            min-width: 260px;
            max-width: 360px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">
              ${periodData.period}
            </div>
            <div style="font-size: 12px; margin-bottom: ${showAgentLatency ? "8px" : "0"};">
              Average Latency: <strong>${avgLatency.toFixed(2)} ms</strong>
            </div>
            ${
              showAgentLatency
                ? `
              <div style="font-size: 11px; opacity: 0.75; margin-bottom: 6px; border-top: 1px solid ${currentTheme === "dark" ? "#374151" : "#e5e7eb"}; padding-top: 8px;">
                Agent-wise average latency
              </div>
              ${visibleRows
                .map(
                  (row) => `
                    <div style="display:flex; justify-content:space-between; gap:8px; font-size:11px; margin-bottom:4px;">
                      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:220px;">${row.name}</span>
                      <strong>${row.avgLatency.toFixed(2)} ms</strong>
                    </div>
                  `
                )
                .join("")}
              ${hiddenCount > 0 ? `<div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">+${hiddenCount} more agents</div>` : ""}
            `
                : ""
            }
          </div>
        `;
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      labels: {
        colors: "oklch(var(--bc))",
      },
    },
  };

  if (rawData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="text-center">
          <div className="text-base-content opacity-60">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="latency-chart-shell">
      <Chart options={chartOptions} series={chartData.series} type="line" height={320} />
    </div>
  );
});

LatencyChart.displayName = "LatencyChart";

export default LatencyChart;
