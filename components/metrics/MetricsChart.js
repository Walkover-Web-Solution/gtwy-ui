import { memo } from "react";
import Chart from "@/components/LazyApexChart";

const MetricsChart = memo(({ rawData, currentTheme, factor }) => {
  const FACTOR_OPTIONS = ["Bridges", "API Keys", "Models"];

  const chartData = {
    series: [
      {
        name: "Total Cost",
        data: rawData.map((item) => item.totalCost),
      },
    ],
    categories: rawData.map((item) => item.period),
  };

  const chartOptions = {
    chart: {
      type: "bar",
      height: 350,
      width: "100%",
      background: "transparent",
      foreColor: "oklch(var(--bc))",
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
        },
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
        columnWidth: "40px",
        borderRadius: 4,
        borderRadiusApplication: "end",
        distributed: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        rotate: 0,
        hideOverlappingLabels: false,
        trim: false,
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
    yaxis: {
      title: {
        text: "Cost ( in $ )",
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
    fill: {
      opacity: 0.9,
    },
    colors: ["#4ade80"],
    grid: {
      borderColor: "oklch(var(--bc) / 0.2)",
      strokeDashArray: 3,
    },
    tooltip: {
      theme: "dark",
      style: {
        fontSize: "12px",
      },
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const periodData = rawData[dataPointIndex];
        if (!periodData) return "";

        const totalCost = series[seriesIndex][dataPointIndex];

        return `
          <div style="
            background: #fff;
            border: none;
            border-radius: 0px;
            padding: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            min-width: 250px;
            max-width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="
              color: #000;
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 12px;
              text-align: center;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 8px;
            ">
              ${periodData.period}
            </div>
            
            <div style="
              color: #000;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 8px;
            ">
              Total Cost: $${totalCost.toFixed(3)}
            </div>
            
            <div style="color: #666; font-size: 12px; margin-bottom: 8px;">
              ${FACTOR_OPTIONS[factor]} Breakdown:
            </div>
            
            ${periodData.items
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
                  color: #000;
                  font-size: 11px;
                  flex: 1;
                  margin-right: 8px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                ">
                  ${item.name}
                </div>
                <div style="
                  color: #000;
                  font-weight: 600;
                  font-size: 11px;
                  min-width: 50px;
                  text-align: right;
                ">
                  $${item.cost.toFixed(3)}
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
      labels: {
        colors: "oklch(var(--bc))",
      },
    },
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
        <Chart options={chartOptions} series={chartData.series} type="bar" height={350} />
      </div>
    </div>
  );
});

MetricsChart.displayName = "MetricsChart";

export default MetricsChart;
