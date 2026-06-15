"use client";

import React, { use, useCallback, useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getHistoryAction, getThread } from "@/store/action/historyAction";
import { getAgentAnalyticsAction } from "@/store/action/analyticsAction";
import { setSelectedVersion } from "@/store/reducer/historyReducer";
import Protected from "@/components/Protected";
import useRtLayerEventHandler from "@/customHooks/useRtLayerEventHandler";

import { Activity, TrendingDown, TrendingUp, X, Bot } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Sidebar from "@/components/historyPageComponents/Sidebar";
import BatchSubthreadPanel from "@/components/historyPageComponents/BatchSubthreadPanel";
import ThreadContainer from "@/components/historyPageComponents/ThreadContainer";
import { getStatsConfig } from "@/utils/enums";

const CHART_STYLE = {
  grid: "#f3f4f6",
  axis: "#9ca3af",
  tooltip: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "12px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
};

function Page({ params, searchParams }) {
  const resolvedSearchParams = use(searchParams);
  const resolvedParams = use(params);
  const search = useSearchParams();
  const pathName = usePathname();
  const dispatch = useDispatch();

  const channelId =
    resolvedParams?.org_id && resolvedParams?.id
      ? `${resolvedParams.org_id}_${resolvedParams.id}`.replace(/ /g, "_")
      : "";
  useRtLayerEventHandler(channelId);

  const { historyData, thread, analyticsData, selectedVersion } = useCustomSelector((state) => {
    return {
      historyData: state?.historyReducer?.history || [],
      thread: state?.historyReducer?.thread || [],
      analyticsData: state?.analyticsReducer?.analyticsData?.[resolvedParams.id] || {},
      selectedVersion: state?.historyReducer?.selectedVersion || "all",
    };
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedSubThreadId, setSelectedSubThreadId] = useState(null);
  const [selectedBatchMessageId, setSelectedBatchMessageId] = useState(null);
  const [isSliderOpen, setIsSliderOpen] = useState(false);

  const router = useRouter();
  const searchRef = useRef(null);
  const isFirstRender = useRef(true);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const customDropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (customDropdownRef.current && !customDropdownRef.current.contains(e.target)) {
        setIsCustomOpen(false);
      }
    };
    if (isCustomOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isCustomOpen]);

  // Local state for the filter dropdown
  const getNormalizedRange = (r) => {
    if (r === "7") return "7d";
    if (r === "30") return "30d";
    if (r === "1" || r === "24") return "24h";
    return r || "30d";
  };

  const [filterStart, setFilterStart] = useState(resolvedSearchParams?.start || "");
  const [filterEnd, setFilterEnd] = useState(resolvedSearchParams?.end || "");
  const [filterRange, setFilterRange] = useState(getNormalizedRange(resolvedSearchParams?.range));
  const [filterInterval, setFilterInterval] = useState(resolvedSearchParams?.interval || "");
  const [filterFeedback, setFilterFeedback] = useState(resolvedSearchParams?.feedback || "all");
  const [filterError, setFilterError] = useState(resolvedSearchParams?.error === "true");

  const summary = analyticsData?.summary || {};
  const requestsOverTime = analyticsData?.requests_over_time || [];
  const responseTime = analyticsData?.response_time || [];

  const getDates = () => {
    let startDate = resolvedSearchParams?.start || "";
    let endDate = resolvedSearchParams?.end || "";

    if (!startDate && !endDate) {
      const rangeVal = resolvedSearchParams?.range || "30d";
      const now = new Date();
      let start;
      if (rangeVal === "24h") {
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (rangeVal === "7d") {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (rangeVal === "30d") {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (start) {
        startDate = start.toISOString();
        endDate = now.toISOString();
      }
    }
    return { startDate, endDate };
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const executionData = requestsOverTime.map((item) => ({
    time: formatDate(item.t),
    success: item.success,
    failed: item.failed,
  }));

  const latencyData = responseTime.map((item) => ({
    time: formatDate(item.t),
    typical: Number(((item.typical || 0) / 1000).toFixed(2)),
    slow: Number(((item.slow || 0) / 1000).toFixed(2)),
    worst: Number(((item.worst || 0) / 1000).toFixed(2)),
  }));

  useEffect(() => {
    return () => {
      dispatch(setSelectedVersion("all"));
    };
  }, [dispatch]);

  // Fetch agent analytics (with a 1-second delay on refresh/initial mount, and immediately on subsequent updates)
  useEffect(() => {
    if (!resolvedParams?.id) return;

    const queryParams = { ...resolvedSearchParams };
    if (queryParams.start) queryParams.start_date = queryParams.start;
    if (queryParams.end) queryParams.end_date = queryParams.end;
    if (!queryParams.start && !queryParams.end) {
      queryParams.range = queryParams.range || "30d";
    }
    queryParams.version = selectedVersion;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      const timer = setTimeout(() => {
        dispatch(getAgentAnalyticsAction(resolvedParams.id, queryParams));
      }, 1000); // 1-second delay on initial load / refresh
      return () => clearTimeout(timer);
    } else {
      dispatch(getAgentAnalyticsAction(resolvedParams.id, queryParams));
    }
  }, [
    resolvedParams?.id,
    resolvedSearchParams?.start,
    resolvedSearchParams?.end,
    resolvedSearchParams?.range,
    resolvedSearchParams?.interval,
    resolvedSearchParams?.feedback,
    resolvedSearchParams?.error,
    selectedVersion,
    dispatch,
  ]);

  // Initial fetch for history
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { startDate, endDate } = getDates();
      const feedback = resolvedSearchParams?.feedback || "all";
      const isError = resolvedSearchParams?.error === "true";

      const result = await dispatch(
        getHistoryAction(resolvedParams.id, 1, feedback, isError, selectedVersion, "", startDate, endDate)
      );
      if (result && result.length > 0) {
        setHasMore(result.length >= 40); // PAGE_SIZE is usually 40
      } else {
        setHasMore(false);
      }
      setLoading(false);
    };
    fetchInitialData();
  }, [
    resolvedParams.id,
    resolvedSearchParams?.start,
    resolvedSearchParams?.end,
    resolvedSearchParams?.range,
    resolvedSearchParams?.feedback,
    resolvedSearchParams?.error,
    selectedVersion,
  ]);

  const fetchMoreData = async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    const { startDate, endDate } = getDates();
    const feedback = resolvedSearchParams?.feedback || "all";
    const isError = resolvedSearchParams?.error === "true";

    const result = await dispatch(
      getHistoryAction(resolvedParams.id, nextPage, feedback, isError, selectedVersion, searchQuery, startDate, endDate)
    );
    if (result && result.length > 0) {
      setPage(nextPage);
      setHasMore(result.length >= 40);
    } else {
      setHasMore(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setPage(1);
    setLoading(true);
    const { startDate, endDate } = getDates();
    const feedback = resolvedSearchParams?.feedback || "all";
    const isError = resolvedSearchParams?.error === "true";

    const result = await dispatch(
      getHistoryAction(resolvedParams.id, 1, feedback, isError, selectedVersion, query, startDate, endDate)
    );
    if (result && result.length > 0) {
      setHasMore(result.length >= 40);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  const urlThreadId = search.get("thread_id");
  const urlSubThreadId = search.get("subThread_id");

  useEffect(() => {
    if (urlThreadId) {
      const activeSubThread = urlSubThreadId || urlThreadId;
      setSelectedThreadId(urlThreadId);
      setSelectedSubThreadId(activeSubThread);
      setIsSliderOpen(true);

      dispatch(
        getThread({
          threadId: urlThreadId,
          bridgeId: resolvedParams.id,
          nextPage: 1,
          user_feedback: "all",
          subThreadId: activeSubThread,
          versionId: "",
          error: false,
        })
      );
    } else {
      setSelectedThreadId(null);
      setSelectedSubThreadId(null);
      setIsSliderOpen(false);
    }
  }, [urlThreadId, urlSubThreadId, resolvedParams.id, dispatch]);

  const threadHandler = useCallback(
    async (thread_id, item, value) => {
      const start = search.get("start") || "";
      const end = search.get("end") || "";
      const range = search.get("range") || "";
      const interval = search.get("interval") || "";
      const feedback = search.get("feedback") || "";
      const error = search.get("error") || "";

      const encodedThreadId = encodeURIComponent(thread_id.replace(/&/g, "%26"));
      const firstSubThreadId = item?.sub_thread?.[0]?.sub_thread_id || thread_id;
      const encodedSubThreadId = encodeURIComponent(firstSubThreadId.replace(/&/g, "%26"));

      const paramsObj = new URLSearchParams();
      if (start) paramsObj.set("start", start);
      if (end) paramsObj.set("end", end);
      if (range) paramsObj.set("range", range);
      if (interval) paramsObj.set("interval", interval);
      if (feedback) paramsObj.set("feedback", feedback);
      if (error) paramsObj.set("error", error);
      paramsObj.set("thread_id", encodedThreadId);
      paramsObj.set("subThread_id", encodedSubThreadId);

      router.push(`${pathName}?${paramsObj.toString()}`, undefined, { shallow: true });
    },
    [pathName, router, search]
  );

  const handleSelectSubThread = useCallback(
    async (subThreadId) => {
      setSelectedBatchMessageId(null);
      const start = search.get("start") || "";
      const end = search.get("end") || "";
      const range = search.get("range") || "";
      const interval = search.get("interval") || "";
      const feedback = search.get("feedback") || "";
      const error = search.get("error") || "";
      const threadId = search.get("thread_id") || "";

      const paramsObj = new URLSearchParams();
      if (start) paramsObj.set("start", start);
      if (end) paramsObj.set("end", end);
      if (range) paramsObj.set("range", range);
      if (interval) paramsObj.set("interval", interval);
      if (feedback) paramsObj.set("feedback", feedback);
      if (error) paramsObj.set("error", error);
      if (threadId) paramsObj.set("thread_id", threadId);
      paramsObj.set("subThread_id", encodeURIComponent(subThreadId.replace(/&/g, "%26")));

      router.push(`${pathName}?${paramsObj.toString()}`, undefined, { shallow: true });
    },
    [pathName, router, search]
  );

  const handleCloseAside = useCallback(() => {
    setSelectedThreadId(null);
    setSelectedSubThreadId(null);
    setSelectedBatchMessageId(null);
    setIsSliderOpen(false);

    const start = search.get("start") || "";
    const end = search.get("end") || "";
    const range = search.get("range") || "";
    const interval = search.get("interval") || "";
    const feedback = search.get("feedback") || "";
    const error = search.get("error") || "";

    const paramsObj = new URLSearchParams();
    if (start) paramsObj.set("start", start);
    if (end) paramsObj.set("end", end);
    if (range) paramsObj.set("range", range);
    if (interval) paramsObj.set("interval", interval);
    if (feedback) paramsObj.set("feedback", feedback);
    if (error) paramsObj.set("error", error);

    router.push(`${pathName}?${paramsObj.toString()}`, undefined, { shallow: true });
  }, [pathName, router, search]);

  const handleSelectBatch = useCallback((messageId) => {
    setSelectedBatchMessageId(messageId);
  }, []);

  const applyFilters = (updates = {}) => {
    const currentUrl = new URL(window.location);

    const newStart = updates.start !== undefined ? updates.start : filterStart;
    const newEnd = updates.end !== undefined ? updates.end : filterEnd;
    const newRange = updates.range !== undefined ? updates.range : filterRange;
    const newInterval = updates.interval !== undefined ? updates.interval : filterInterval;
    const newFeedback = updates.feedback !== undefined ? updates.feedback : filterFeedback;
    const newError = updates.error !== undefined ? updates.error : filterError;

    if (newStart) currentUrl.searchParams.set("start", newStart);
    else currentUrl.searchParams.delete("start");

    if (newEnd) currentUrl.searchParams.set("end", newEnd);
    else currentUrl.searchParams.delete("end");

    if (newRange && !newStart && !newEnd) currentUrl.searchParams.set("range", newRange);
    else currentUrl.searchParams.delete("range");

    if (newInterval) currentUrl.searchParams.set("interval", newInterval);
    else currentUrl.searchParams.delete("interval");

    if (newFeedback && newFeedback !== "all") currentUrl.searchParams.set("feedback", newFeedback);
    else currentUrl.searchParams.delete("feedback");

    if (newError) currentUrl.searchParams.set("error", "true");
    else currentUrl.searchParams.delete("error");

    router.push(currentUrl.pathname + currentUrl.search);
  };

  const clearFilters = () => {
    setFilterStart("");
    setFilterEnd("");
    setFilterRange("30d");
    setFilterInterval("");
    setFilterFeedback("all");
    setFilterError(false);
    dispatch(setSelectedVersion("all"));
    setIsCustomOpen(false);

    const currentUrl = new URL(window.location);
    currentUrl.searchParams.delete("start");
    currentUrl.searchParams.delete("end");
    currentUrl.searchParams.delete("range");
    currentUrl.searchParams.delete("interval");
    currentUrl.searchParams.delete("feedback");
    currentUrl.searchParams.delete("error");
    router.push(currentUrl.pathname + currentUrl.search);

    if (document.activeElement) {
      document.activeElement.blur();
    }
  };

  return (
    <div className="flex h-[calc(100vh-40px)] w-full overflow-hidden bg-base-200/50">
      {/* Left Sidebar */}
      <div className="pl-4 h-full shrink-0 z-50 flex relative">
        <Sidebar
          historyData={historyData}
          threadHandler={threadHandler}
          fetchMoreData={fetchMoreData}
          hasMore={hasMore}
          loading={loading}
          params={resolvedParams}
          searchParams={Object.fromEntries(search.entries())}
          setSearchMessageId={setSelectedBatchMessageId}
          setPage={setPage}
          setHasMore={setHasMore}
          filterOption={filterFeedback}
          setFilterOption={setFilterFeedback}
          searchRef={searchRef}
          setThreadPage={() => {}}
          selectedVersion={selectedVersion}
          setIsErrorTrue={setFilterError}
          isErrorTrue={filterError}
          activeFilterByRef={undefined}
          isAnalytics={true}
          handleSearch={handleSearch}
        />
      </div>

      {/* Main Dashboard Area */}
      <div className="flex-1 relative flex flex-row max-w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-base-content">Agent Analytics</h1>
              <p className="text-sm text-base-content/60 mt-1">Overview of agent performance and execution history.</p>
            </div>
          </div>

          {/* Horizontal Filter Bar */}
          <div className="flex items-center justify-between w-full bg-base-100 border border-base-300 rounded-lg px-4 py-2.5 mb-8 shadow-sm">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Time Range */}
              <span className="text-[11px] font-bold tracking-widest text-base-content/40 uppercase shrink-0">
                Time Range
              </span>
              <div className="flex gap-1.5 shrink-0">
                {[
                  { label: "24h", value: "24h" },
                  { label: "7d", value: "7d" },
                  { label: "30d", value: "30d" },
                ].map((item) => {
                  const isActive = filterRange === item.value && !filterStart && !filterEnd;

                  return (
                    <button
                      key={item.value}
                      onClick={() => {
                        setFilterRange(item.value);
                        setFilterStart("");
                        setFilterEnd("");
                        applyFilters({ range: item.value, start: "", end: "" });
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        isActive ? "bg-blue-500 text-white" : "bg-base-200 text-base-content/70 hover:bg-base-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}

                {/* Custom Date Dropdown replacing the pill */}
                <div ref={customDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCustomOpen(!isCustomOpen)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border-none outline-none focus:outline-none focus:ring-0 ${
                      filterStart || filterEnd
                        ? "bg-blue-500 text-white"
                        : "bg-base-200 text-base-content/70 hover:bg-base-300"
                    }`}
                  >
                    Custom
                  </button>
                  {isCustomOpen && (
                    <div className="absolute left-0 z-50 menu p-4 shadow-xl border border-base-300 bg-base-100 rounded-box w-80 mt-2">
                      <h3 className="font-semibold text-sm mb-4 text-base-content">Custom Date Range</h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-base-content/70 mb-1">Start Date</label>
                          <input
                            type="datetime-local"
                            className="input input-sm input-bordered w-full text-xs"
                            value={filterStart}
                            max={filterEnd}
                            onChange={(e) => {
                              setFilterStart(e.target.value);
                              setFilterRange("");
                            }}
                            onClick={(e) => e.target.showPicker()}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-base-content/70 mb-1">End Date</label>
                          <input
                            type="datetime-local"
                            className="input input-sm input-bordered w-full text-xs"
                            value={filterEnd}
                            min={filterStart}
                            onChange={(e) => {
                              setFilterEnd(e.target.value);
                              setFilterRange("");
                            }}
                            onClick={(e) => e.target.showPicker()}
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            className="btn btn-sm btn-primary flex-1"
                            onClick={() => {
                              applyFilters();
                              setIsCustomOpen(false);
                              if (document.activeElement) document.activeElement.blur();
                            }}
                          >
                            Apply
                          </button>
                          <button
                            className="btn btn-sm btn-outline flex-1"
                            onClick={() => {
                              clearFilters();
                              setIsCustomOpen(false);
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-px h-4 bg-base-300 shrink-0" />

              {/* Interval */}
              <span className="text-[11px] font-bold tracking-widest text-base-content/40 uppercase shrink-0">
                Interval
              </span>
              <div className="flex gap-1.5 shrink-0">
                {[
                  { label: "1h", value: "1h" },
                  { label: "3h", value: "3h" },
                  { label: "6h", value: "6h" },
                  { label: "12h", value: "12h" },
                  { label: "24h", value: "24h" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      const newInterval = filterInterval === item.value ? "" : item.value;
                      setFilterInterval(newInterval);
                      applyFilters({ interval: newInterval });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterInterval === item.value
                        ? "bg-blue-500 text-white"
                        : "bg-base-200 text-base-content/70 hover:bg-base-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-base-300 shrink-0" />

              {/* Feedback */}
              <span className="text-[11px] font-bold tracking-widest text-base-content/40 uppercase shrink-0">
                Feedback
              </span>
              <div className="flex gap-1.5 shrink-0">
                {[
                  { label: "Any", value: "all" },
                  { label: "Good", value: "1" },
                  { label: "Bad", value: "2" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setFilterFeedback(item.value);
                      applyFilters({ feedback: item.value });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterFeedback === item.value
                        ? "bg-blue-500 text-white"
                        : "bg-base-200 text-base-content/70 hover:bg-base-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-base-300 shrink-0" />

              {/* Error Toggle */}
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="toggle toggle-sm"
                  checked={filterError}
                  onChange={(e) => {
                    setFilterError(e.target.checked);
                    applyFilters({ error: e.target.checked });
                  }}
                />
                <span className="text-xs font-medium text-base-content/70">Error History</span>
              </label>
            </div>
          </div>

          {/* KPI Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
            {getStatsConfig(summary).map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col gap-1"
                >
                  <div className="flex justify-between items-start">
                    <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                      <Icon size={16} />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-xs font-semibold ${stat.trend === "up" ? "text-emerald-500" : "text-red-500"}`}
                    >
                      {stat.trend === "up" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {stat.change}
                    </div>
                  </div>
                  <div className="flex flex-col mt-2">
                    <p className="text-xl font-bold text-base-content">{stat.value}</p>
                    <h3 className="text-[11px] font-medium text-base-content/60 mt-0.5">{stat.title}</h3>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Success / Failure Chart */}
            <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-base-content">Execution Volume</h3>
                  <p className="text-xs text-base-content/60">Success vs Failed runs over time</p>
                </div>
                <span className="span">
                  <Bot size={16} />
                </span>
              </div>
              <div className="flex-1 min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={executionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
                    <XAxis dataKey="time" stroke={CHART_STYLE.axis} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={CHART_STYLE.axis} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={CHART_STYLE.tooltip} cursor={{ stroke: "#d4d4d4", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="success"
                      stroke="#10b981"
                      fill="url(#gSuccess)"
                      strokeWidth={2}
                      dot={false}
                      name="Success"
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      stroke="#ef4444"
                      fill="url(#gFailed)"
                      strokeWidth={2}
                      dot={false}
                      name="Failed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Latency Chart */}
            <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-base-content">Average Latency</h3>
                  <p className="text-xs text-base-content/60">Agent response time (s)</p>
                </div>
                <span className="span">
                  <Activity size={16} />
                </span>
              </div>
              <div className="flex-1 min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={latencyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gTypical" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gSlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gWorst" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
                    <XAxis dataKey="time" stroke={CHART_STYLE.axis} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={CHART_STYLE.axis} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={CHART_STYLE.tooltip} cursor={{ stroke: "#d4d4d4", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="worst"
                      stroke="#ef4444"
                      fill="url(#gWorst)"
                      strokeWidth={2}
                      dot={false}
                      name="Worst (s)"
                    />
                    <Area
                      type="monotone"
                      dataKey="slow"
                      stroke="#f59e0b"
                      fill="url(#gSlow)"
                      strokeWidth={2}
                      dot={false}
                      name="Slow (s)"
                    />
                    <Area
                      type="monotone"
                      dataKey="typical"
                      stroke="#3b82f6"
                      fill="url(#gTypical)"
                      strokeWidth={2}
                      dot={false}
                      name="Typical (s)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Thread Details aside panel */}
        {isSliderOpen && selectedThreadId && (
          <aside className="absolute left-0 top-0 bottom-0 w-full border-l border-base-300 shadow-2xl bg-base-100 flex h-full shrink-0 z-40 animate-in slide-in-from-left duration-300 ease-out">
            <div className="flex h-full w-full">
              {/* Optional Batch/Subthread Panel (appears on left of the slider) */}
              <BatchSubthreadPanel
                thread={thread}
                subThreadIdFromURL={selectedSubThreadId}
                parentThreadId={selectedThreadId}
                selectedBatchMessageId={selectedBatchMessageId}
                onSelectBatch={handleSelectBatch}
                onSelectSubThread={handleSelectSubThread}
              />

              {/* Thread Messages */}
              <div className="flex-1 flex flex-col relative min-w-0 h-full">
                <div className="h-14 border-b border-base-300 flex items-center justify-between px-4 bg-base-100 shrink-0">
                  <h3 className="font-semibold text-sm truncate">Thread Details</h3>
                  <button onClick={handleCloseAside} className="btn btn-ghost btn-sm btn-circle shrink-0">
                    <X size={16} className="text-base-content/60 hover:text-base-content" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ThreadContainer
                    thread={
                      selectedBatchMessageId
                        ? thread.filter((msg) => msg?.message_id === selectedBatchMessageId)
                        : thread
                    }
                    searchParamsHook={search}
                    isSingleQuery={false}
                    isFetchingMore={false}
                    setIsFetchingMore={() => {}}
                    searchMessageId={null}
                    setSearchMessageId={() => {}}
                    pathName={pathName}
                    search={search}
                    historyData={historyData}
                    threadHandler={() => {}}
                    setLoading={() => {}}
                    threadPage={1}
                    setThreadPage={() => {}}
                    hasMoreThreadData={false}
                    setHasMoreThreadData={() => {}}
                    selectedVersion={"all"}
                    previousPrompt={""}
                    isErrorTrue={false}
                  />
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default Protected(Page);
