"use client";
import { use, useEffect, useState } from "react";
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
    <div className="p-10 min-h-screen">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-base-content">Metrics Dashboard</h1>
        <p className="text-base-content">
          {descriptions?.["Metrics"] || "Monitor your application's key metrics at a glance."}
        </p>
      </header>

      {/* Filters */}
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

      {/* Date Range Picker Modal */}
      <DateRangePicker
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onDateRangeSelect={handleDateRangeSelect}
        initialStartDate={customStartDate}
        initialEndDate={customEndDate}
      />

      {/* Charts Section */}
      <div className="bg-base-100 shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Metrics Visualization</h2>
        <div className="h-96">
          <MetricsChart rawData={rawData} currentTheme={actualTheme} factor={factor} />
        </div>
      </div>

      {/* Token Usage Overview */}
      <TokenUsageOverview rawData={rawData} />
    </div>
  );
}

export default Protected(Page);
