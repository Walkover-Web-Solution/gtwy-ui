import { memo } from "react";
import Chart from "@/components/LazyApexChart";

const ReliabilityChart = memo(({ rawData, currentTheme }) => {
  const successData = rawData.map((item) =>
    (item?.items || []).reduce((sum, entry) => sum + (entry?.successCount || 0), 0)
  );

  const failureData = rawData.map((item) => {
    const totalCount = (item?.items || []).reduce(
      (sum, entry) => sum + Math.max(0, (entry?.totalRequests || 0) - (entry?.successCount || 0)),
      0
    );
    return Math.max(0, totalCount);
  });

  const chartData = {
    series: [
      {
        name: "Successful Requests",
        data: successData,
      },
      {
        name: "Failed Requests",
        data: failureData,
      },
    ],
    categories: rawData.map((item) => item.period),
  };

  const maxVisibleLabels = 10;
  const labelStep = Math.max(1, Math.ceil(chartData.categories.length / maxVisibleLabels));
  const shouldRotateLabels = chartData.categories.length > maxVisibleLabels;

  const chartOptions = {
    chart: {
      type: "bar",
      height: 300,
      width: "100%",
      background: "transparent",
      foreColor: "oklch(var(--bc))",
      stacked: true,
      toolbar: {
        show: true,
        autoSelected: "pan",
        tools: {
          download: true,
          selection: false,
          zoom: true,
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
        columnWidth: "50%",
        borderRadius: 4,
        distributed: false,
      },
    },
    dataLabels: {
      enabled: false,
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
        text: "Request Count",
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
    colors: ["#22c55e", "#ef4444"],
    fill: {
      opacity: 0.85,
    },
    grid: {
      borderColor: "oklch(var(--bc) / 0.2)",
      strokeDashArray: 3,
    },
    tooltip: {
      theme: currentTheme === "dark" ? "dark" : "light",
      shared: true,
      intersect: false,
      y: {
        formatter: function (value) {
          return Intl.NumberFormat("en-US").format(value || 0);
        },
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
    <div className="reliability-chart-shell">
      <Chart options={chartOptions} series={chartData.series} type="bar" height={320} />
    </div>
  );
});

ReliabilityChart.displayName = "ReliabilityChart";

export default ReliabilityChart;
