import { memo } from "react";
import Chart from "@/components/LazyApexChart";

const MetricsChart = memo(({ rawData, currentTheme, factor }) => {
  const FACTOR_OPTIONS = ["Bridges", "API Keys", "Models"];

  const tokenData = rawData.map((item) =>
    (item?.items || []).reduce((sum, entry) => {
      return sum + (entry?.tokens || 0);
    }, 0)
  );

  const chartData = {
    series: [
      {
        type: "column",
        name: "Total Cost",
        data: rawData.map((item) => item.totalCost),
      },
      {
        type: "line",
        name: "Total Tokens",
        data: tokenData,
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
      height: 350,
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
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "42%",
        borderRadius: 6,
        borderRadiusApplication: "end",
        distributed: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: [0, 3],
      curve: "smooth",
    },
    markers: {
      size: [0, 4],
      hover: {
        sizeOffset: 2,
      },
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        rotate: shouldRotateLabels ? -45 : 0,
        hideOverlappingLabels: true,
        trim: false,
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
        color: "oklch(var(--bc))",
      },
      axisTicks: {
        show: true,
      },
    },
    yaxis: [
      {
        title: {
          text: "Cost ($)",
          style: {
            color: "oklch(var(--bc))",
          },
        },
        labels: {
          style: {
            colors: "oklch(var(--bc))",
          },
          formatter: function (value) {
            return "$" + (value?.toFixed(2) || "0.00");
          },
        },
      },
      {
        opposite: true,
        title: {
          text: "Tokens",
          style: {
            color: "oklch(var(--bc))",
          },
        },
        labels: {
          style: {
            colors: "oklch(var(--bc))",
          },
          formatter: function (value) {
            return Intl.NumberFormat("en-US", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(value || 0);
          },
        },
      },
    ],
    fill: {
      type: ["solid", "gradient"],
      opacity: [0.9, 1],
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.4,
        opacityFrom: 0.85,
        opacityTo: 0.2,
        stops: [0, 95],
      },
    },
    colors: ["#22c55e", "#3b82f6"],
    grid: {
      borderColor: "oklch(var(--bc) / 0.2)",
      strokeDashArray: 3,
    },
    tooltip: {
      theme: currentTheme === "dark" ? "dark" : "light",
      shared: true,
      intersect: false,
      style: {
        fontSize: "12px",
      },
      custom: function ({ series, dataPointIndex }) {
        const periodData = rawData[dataPointIndex];
        if (!periodData) return "";

        const totalCost = series[0][dataPointIndex] || 0;
        const totalTokens = series[1][dataPointIndex] || 0;
        const topItems = [...(periodData.items || [])].sort((a, b) => (b.cost || 0) - (a.cost || 0)).slice(0, 5);

        return `
          <div style="
            background: ${currentTheme === "dark" ? "#111827" : "#ffffff"};
            color: ${currentTheme === "dark" ? "#e5e7eb" : "#111827"};
            border: 1px solid ${currentTheme === "dark" ? "#374151" : "#e5e7eb"};
            border-radius: 10px;
            padding: 16px;
            min-width: 280px;
            max-width: 380px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 10px;
            ">
              ${periodData.period}
            </div>
            
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:8px;">
              <div style="font-size:12px; opacity:0.85;">Cost: <strong>$${totalCost.toFixed(3)}</strong></div>
              <div style="font-size:12px; opacity:0.85;">Tokens: <strong>${Intl.NumberFormat("en-US").format(totalTokens)}</strong></div>
            </div>
            
            <div style="font-size: 11px; opacity: 0.75; margin-bottom: 8px;">
              Top ${FACTOR_OPTIONS[factor]} by cost
            </div>
            
            ${topItems
              .map(
                (item) => `
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
                padding: 2px 0;
              ">
                <div style="
                  color: ${currentTheme === "dark" ? "#f9fafb" : "#111827"};
                  font-size: 11px;
                  font-weight: 500;
                  flex: 1;
                  margin-right: 8px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                ">
                  ${item.name}
                </div>
                <div style="
                  color: ${currentTheme === "dark" ? "#d1fae5" : "#065f46"};
                  font-weight: 600;
                  font-size: 11px;
                  min-width: 50px;
                  text-align: right;
                ">
                  $${(item.cost || 0).toFixed(3)}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `;
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: {
        colors: "oklch(var(--bc))",
      },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          xaxis: {
            labels: {
              rotate: -45,
            },
          },
          chart: {
            height: 320,
          },
        },
      },
    ],
  };

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
    <div className="metrics-chart-shell">
      <Chart options={chartOptions} series={chartData.series} type="line" height={380} />

      <style jsx global>{`
        .metrics-chart-shell .apexcharts-canvas,
        .metrics-chart-shell .apexcharts-canvas:focus,
        .metrics-chart-shell .apexcharts-svg,
        .metrics-chart-shell .apexcharts-svg:focus,
        .metrics-chart-shell svg,
        .metrics-chart-shell svg:focus {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
});

MetricsChart.displayName = "MetricsChart";

export default MetricsChart;
