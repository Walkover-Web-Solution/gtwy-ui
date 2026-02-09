"use client";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-64 flex items-center justify-center bg-base-200/50 rounded animate-pulse">
      <div className="text-sm opacity-70">Loading chart...</div>
    </div>
  ),
});

export default Chart;
