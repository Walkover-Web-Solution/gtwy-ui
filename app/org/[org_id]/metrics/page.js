"use client";
import { use, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Coins } from "lucide-react";
import { TIME_RANGE_OPTIONS } from "@/utils/enums";
import Protected from "@/components/Protected";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useSearchParams } from "next/navigation";

// Custom hooks
import { useMetricsData } from "@/customHooks/useMetricsData";
import { useMetricsURL } from "@/customHooks/useMetricsURL";
import { useThemeManager } from "@/customHooks/useThemeManager";

// Components
import DateRangePicker from "@/components/metrics/DateRangePicker";
import MetricsFilters from "@/components/metrics/MetricsFilters";
import MetricsChart from "@/components/metrics/MetricsChart";
import TokenUsageOverview from "@/components/metrics/TokenUsageOverview";
import KpiCards from "@/components/metrics/KpiCards";
import LatencyChart from "@/components/metrics/LatencyChart";
import ReliabilityChart from "@/components/metrics/ReliabilityChart";
import ThroughputChart from "@/components/metrics/ThroughputChart";

export const runtime = "edge";

function Page({ params }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const orgId = resolvedParams?.org_id;

  // State management
  const [factor, setFactor] = useState(parseInt(searchParams.get("factor")) || 0);
  const [range, setRange] = useState(parseInt(searchParams.get("range")) || 0);
  const [customStartDate, setCustomStartDate] = useState(searchParams.get("start_date") || null);
  const [customEndDate, setCustomEndDate] = useState(searchParams.get("end_date") || null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [bridge, setBridge] = useState(() => {
    const bridgeId = searchParams.get("bridge_id");
    const bridgeName = searchParams.get("bridge_name");
    return bridgeId && bridgeName ? { bridge_id: bridgeId, bridge_name: bridgeName } : null;
  });
  const [filterBridges, setFilterBridges] = useState([]);

  // Custom hooks
  const { allBridges, apikeyData, descriptions } = useCustomSelector((state) => ({
    allBridges: state.bridgeReducer.org[orgId]?.orgs || [],
    apikeyData: state?.apiKeysReducer?.apikeys?.[orgId] || [],
    descriptions: state.flowDataReducer?.flowData?.descriptionsData?.descriptions || {},
  }));

  const { rawData, loading, fetchMetricsData } = useMetricsData(orgId, allBridges, apikeyData);
  const { updateURLParams, getDisplayRangeText } = useMetricsURL(searchParams);
  const { actualTheme } = useThemeManager();

  const overviewStats = useMemo(() => {
    const totalCost = rawData.reduce((sum, period) => sum + (period?.totalCost || 0), 0);
    const totalTokens = rawData.reduce(
      (sum, period) =>
        sum +
        (period?.items || []).reduce((itemSum, item) => {
          return itemSum + (item?.tokens || 0);
        }, 0),
      0
    );

    const activeEntityIds = new Set();
    rawData.forEach((period) => {
      (period?.items || []).forEach((item) => {
        if (item?.id) activeEntityIds.add(item.id);
      });
    });

    return {
      totalCost,
      totalTokens,
      activeEntities: activeEntityIds.size,
      periodCount: rawData.length,
    };
  }, [rawData]);

  const reliabilityStats = useMemo(() => {
    const weightedSamples = [];
    let totalLatency = 0;
    let totalRequests = 0;
    let totalSuccess = 0;

    rawData.forEach((period) => {
      (period?.items || []).forEach((item) => {
        const requestCount = Number(item?.totalRequests) || 0;
        const latencySum = Number(item?.latency) || 0;
        const successCount = Number(item?.successCount) || 0;

        if (requestCount <= 0) {
          return;
        }

        const averageLatency = latencySum / requestCount;
        totalLatency += latencySum;
        totalRequests += requestCount;
        totalSuccess += successCount;
        weightedSamples.push({ latency: averageLatency, weight: requestCount });
      });
    });

    const avgLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;
    const successRate = totalRequests > 0 ? Math.min(100, (totalSuccess / totalRequests) * 100) : 0;

    let p95Latency = 0;
    if (weightedSamples.length > 0 && totalRequests > 0) {
      weightedSamples.sort((a, b) => a.latency - b.latency);
      const p95Threshold = totalRequests * 0.95;
      let cumulativeWeight = 0;

      for (const sample of weightedSamples) {
        cumulativeWeight += sample.weight;
        if (cumulativeWeight >= p95Threshold) {
          p95Latency = sample.latency;
          break;
        }
      }
    }

    return {
      avgLatency,
      p95Latency,
      successRate,
      totalRequests,
    };
  }, [rawData]);

  const compactNumber = (value) =>
    Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(value || 0));

  // Effects
  useEffect(() => {
    setFilterBridges(allBridges);
  }, [allBridges]);

  useEffect(() => {
    fetchMetricsData(factor, range, bridge, customStartDate, customEndDate);
  }, [factor, range, bridge, customStartDate, customEndDate, fetchMetricsData]);

  // Event handlers
  const handleFactorChange = (index) => {
    setFactor(index);
    updateURLParams({ factor: index });
  };

  const handleTimeRangeChange = (index) => {
    if (index === TIME_RANGE_OPTIONS.length) {
      setIsDatePickerOpen(true);
    } else {
      setRange(index);
      setCustomStartDate(null);
      setCustomEndDate(null);
      updateURLParams({
        range: index,
        start_date: null,
        end_date: null,
      });
    }
  };

  const handleDateRangeSelect = (startDate, endDate) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    setRange(10);
    updateURLParams({
      range: 10,
      start_date: startDate,
      end_date: endDate,
    });
  };

  const handleBridgeChange = (bridge_id, bridge_name) => {
    const newBridge = bridge_id && bridge_name ? { bridge_id, bridge_name } : null;
    setBridge(newBridge);
    updateURLParams({
      bridge_id: bridge_id,
      bridge_name: bridge_name,
    });
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-b from-base-200/20 via-transparent to-transparent">
      {/* Page Header */}
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-base-content">Metrics Dashboard</h1>
        <p className="text-base-content/80 mt-1">
          {descriptions?.["Metrics"] || "Monitor your application's key metrics at a glance."}
        </p>
      </header>

      {/* Top Controls */}
      <div className="sticky top-2 md:top-4 z-20">
        <MetricsFilters
          factor={factor}
          range={range}
          bridge={bridge}
          loading={loading}
          filterBridges={filterBridges}
          setFilterBridges={setFilterBridges}
          allBridges={allBridges}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onFactorChange={handleFactorChange}
          onTimeRangeChange={handleTimeRangeChange}
          onBridgeChange={handleBridgeChange}
          getDisplayRangeText={() => getDisplayRangeText(range, customStartDate, customEndDate, TIME_RANGE_OPTIONS)}
        />
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="rounded-xl border border-base-300 bg-base-100/80 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-base-content/70 uppercase tracking-wide">Total Cost</span>
            <Coins size={16} className="text-success" />
          </div>
          <div className="text-2xl font-semibold">${overviewStats.totalCost.toFixed(2)}</div>
          <div className="text-xs text-base-content/60 mt-1">Across selected range</div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-100/80 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-base-content/70 uppercase tracking-wide">Token Volume</span>
            <Activity size={16} className="text-info" />
          </div>
          <div className="text-2xl font-semibold">{compactNumber(overviewStats.totalTokens)}</div>
          <div className="text-xs text-base-content/60 mt-1">Total tokens processed</div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-100/80 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-base-content/70 uppercase tracking-wide">Active Items</span>
            <BarChart3 size={16} className="text-warning" />
          </div>
          <div className="text-2xl font-semibold">{overviewStats.activeEntities}</div>
          <div className="text-xs text-base-content/60 mt-1">Agents, models, or API keys</div>
        </div>
      </section>

      {/* Date Range Picker Modal */}
      <DateRangePicker
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onDateRangeSelect={handleDateRangeSelect}
        initialStartDate={customStartDate}
        initialEndDate={customEndDate}
      />

      {/* Charts Section */}
      <div className="bg-base-100 shadow-md rounded-xl p-4 md:p-6 mb-6 border border-base-300/70">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold">Metrics Visualization</h2>
            <p className="text-sm text-base-content/65">Compare cost and token throughput over time.</p>
          </div>
          <div className="text-right text-xs text-base-content/60">
            <div>{overviewStats.periodCount} points</div>
            <div>{getDisplayRangeText(range, customStartDate, customEndDate, TIME_RANGE_OPTIONS)}</div>
          </div>
        </div>
        <div className="h-[420px]">
          <MetricsChart rawData={rawData} currentTheme={actualTheme} factor={factor} />
        </div>
      </div>

      {/* Phase 1: Performance & Reliability Metrics */}
      <KpiCards stats={reliabilityStats} />

      {/* Latency Trend Chart */}
      <div className="bg-base-100 shadow-md rounded-xl p-4 md:p-6 mb-6 border border-base-300/70">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold">Latency Trends</h2>
            <p className="text-sm text-base-content/65">Average response time over your selected period.</p>
          </div>
        </div>
        <div className="h-[350px]">
          <LatencyChart rawData={rawData} currentTheme={actualTheme} factor={factor} selectedBridge={bridge} />
        </div>
      </div>

      {/* Reliability Chart */}
      <div className="bg-base-100 shadow-md rounded-xl p-4 md:p-6 mb-6 border border-base-300/70">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold">Request Success Rate</h2>
            <p className="text-sm text-base-content/65">Successful vs failed requests breakdown.</p>
          </div>
        </div>
        <div className="h-[350px]">
          <ReliabilityChart rawData={rawData} currentTheme={actualTheme} />
        </div>
      </div>

      {/* Throughput Chart */}
      <div className="bg-base-100 shadow-md rounded-xl p-4 md:p-6 mb-6 border border-base-300/70">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold">Request Throughput</h2>
            <p className="text-sm text-base-content/65">Total requests processed per time period.</p>
          </div>
        </div>
        <div className="h-[350px]">
          <ThroughputChart rawData={rawData} currentTheme={actualTheme} />
        </div>
      </div>

      {/* Token Usage Overview */}
      <div className="mb-2">
        <TokenUsageOverview rawData={rawData} />
      </div>
    </div>
  );
}

export default Protected(Page);
