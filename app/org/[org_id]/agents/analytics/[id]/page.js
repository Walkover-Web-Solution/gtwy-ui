"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams, usePathname } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getHistoryAction, getThread } from "@/store/action/historyAction";
import Protected from "@/components/Protected";

import { Activity, CheckCircle2, Filter, TrendingDown, TrendingUp, X, Timer, Bot } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import DashboardSidebar from "@/components/analyticsPageComponents/DashboardSidebar";
import BatchSubthreadPanel from "@/components/historyPageComponents/BatchSubthreadPanel";
import ThreadContainer from "@/components/historyPageComponents/ThreadContainer";

export const runtime = "edge";

const MOCK_STATS = [
  {
    title: "Total Executions",
    value: "2,341",
    change: "+12.5%",
    trend: "up",
    icon: Activity,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Success Rate",
    value: "98.2%",
    change: "+0.8%",
    trend: "up",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    title: "Avg. Latency",
    value: "432ms",
    change: "-15ms",
    trend: "down",
    icon: Timer,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    title: "Failed Runs",
    value: "42",
    change: "-5%",
    trend: "down",
    icon: X,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
];

const timeSeriesData = [
  { time: "00:00", success: 120, failed: 2, latency: 400 },
  { time: "04:00", success: 180, failed: 5, latency: 450 },
  { time: "08:00", success: 350, failed: 12, latency: 520 },
  { time: "12:00", success: 420, failed: 8, latency: 480 },
  { time: "16:00", success: 380, failed: 15, latency: 500 },
  { time: "20:00", success: 250, failed: 3, latency: 420 },
];

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

  const { historyData, thread } = useCustomSelector((state) => {
    return {
      historyData: state?.historyReducer?.history || [],
      thread: state?.historyReducer?.thread || [],
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

  // Initial fetch for history
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const startDate = resolvedSearchParams?.start;
      const endDate = resolvedSearchParams?.end;
      const result = await dispatch(
        getHistoryAction(resolvedParams.id, 1, "all", false, "all", "", startDate, endDate)
      );
      if (result && result.length > 0) {
        setHasMore(result.length >= 40); // PAGE_SIZE is usually 40
      }
      setLoading(false);
    };
    fetchInitialData();
  }, [resolvedParams.id]);

  const fetchMoreData = async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    const startDate = resolvedSearchParams?.start;
    const endDate = resolvedSearchParams?.end;
    const result = await dispatch(
      getHistoryAction(resolvedParams.id, nextPage, "all", false, "all", searchQuery, startDate, endDate)
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
    const startDate = resolvedSearchParams?.start;
    const endDate = resolvedSearchParams?.end;
    const result = await dispatch(
      getHistoryAction(resolvedParams.id, 1, "all", false, "all", query, startDate, endDate)
    );
    if (result && result.length > 0) {
      setHasMore(result.length >= 40);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  const onSelectThread = useCallback(
    async (threadId) => {
      setSelectedThreadId(threadId);
      setSelectedSubThreadId(null); // Reset subthread when switching threads
      setSelectedBatchMessageId(null);
      setIsSliderOpen(true);

      // Update URL logic if needed
      const currentUrl = new URL(window.location);
      currentUrl.searchParams.set("thread_id", threadId);
      window.history.pushState({}, "", currentUrl);

      // Fetch the specific thread
      await dispatch(
        getThread({
          threadId,
          bridgeId: resolvedParams.id,
          nextPage: 1,
          user_feedback: "all",
          subThreadId: null,
          versionId: "",
          error: false,
        })
      );
    },
    [dispatch, resolvedParams.id]
  );

  const handleSelectSubThread = useCallback(
    async (subThreadId) => {
      setSelectedSubThreadId(subThreadId);
      setSelectedBatchMessageId(null);
      await dispatch(
        getThread({
          threadId: selectedThreadId,
          bridgeId: resolvedParams.id,
          nextPage: 1,
          user_feedback: "all",
          subThreadId: subThreadId,
          versionId: "",
          error: false,
        })
      );
    },
    [dispatch, selectedThreadId, resolvedParams.id]
  );

  const handleSelectBatch = useCallback((messageId) => {
    setSelectedBatchMessageId(messageId);
  }, []);

  const clearInput = () => {
    handleSearch("");
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-base-200/50">
      {/* Left Sidebar */}
      <div className="pl-4 h-full shrink-0 z-30">
        <DashboardSidebar
          historyData={historyData}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          clearInput={clearInput}
          fetchMoreData={fetchMoreData}
          hasMore={hasMore}
          selectedThreadId={selectedThreadId}
          onSelectThread={onSelectThread}
          totalRuns={historyData?.length > 0 ? "2k+" : "0"}
        />
      </div>

      {/* Main Dashboard Area */}
      <div className="flex-1 relative flex flex-col max-w-full">
        <div className="flex-1 overflow-y-auto p-6">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-base-content">Agent Analytics</h1>
              <p className="text-sm text-base-content/60 mt-1">Overview of agent performance and execution history.</p>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-sm btn-outline gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>

          {/* KPI Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {MOCK_STATS.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-xs font-semibold ${stat.trend === "up" ? "text-emerald-500" : "text-red-500"}`}
                    >
                      {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {stat.change}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-base-content/60">{stat.title}</h3>
                    <p className="text-3xl font-bold mt-1 text-base-content">{stat.value}</p>
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
                <button className="p-2 hover:bg-base-200 rounded-lg text-base-content/60 transition-colors">
                  <Bot className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
                  <p className="text-xs text-base-content/60">Agent response time (ms)</p>
                </div>
                <button className="p-2 hover:bg-base-200 rounded-lg text-base-content/60 transition-colors">
                  <Activity className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
                    <XAxis dataKey="time" stroke={CHART_STYLE.axis} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={CHART_STYLE.axis} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={CHART_STYLE.tooltip} cursor={{ stroke: "#d4d4d4", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="latency"
                      stroke="#3b82f6"
                      fill="url(#gLatency)"
                      strokeWidth={2}
                      dot={false}
                      name="Latency (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* History Details Slider (Overlay on dashboard) */}
        {isSliderOpen && selectedThreadId && (
          <div className="absolute inset-0 z-20 flex bg-base-300/40 backdrop-blur-[2px]">
            <div className="w-[90%] border-r border-base-300 shadow-2xl bg-base-100 flex h-full animate-in slide-in-from-left duration-300 ease-out">
              {/* Optional Batch/Subthread Panel (appears on left of the slider) */}
              <BatchSubthreadPanel
                thread={thread}
                subThreadIdFromURL={selectedSubThreadId}
                selectedBatchMessageId={selectedBatchMessageId}
                onSelectBatch={handleSelectBatch}
                onSelectSubThread={handleSelectSubThread}
              />

              {/* Thread Messages */}
              <div className="flex-1 flex flex-col relative min-w-0 h-full">
                <div className="h-14 border-b border-base-300 flex items-center justify-between px-4 bg-base-100 shrink-0">
                  <h3 className="font-semibold text-sm truncate">Thread Details</h3>
                  <button onClick={() => setIsSliderOpen(false)} className="btn btn-ghost btn-sm btn-circle shrink-0">
                    <X className="w-5 h-5 text-base-content/60 hover:text-base-content" />
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
          </div>
        )}
      </div>
    </div>
  );
}

export default Protected(Page);
