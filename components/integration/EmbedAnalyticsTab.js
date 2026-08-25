"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, Users, Bot, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { getEmbedAnalyticsApi } from "@/config/analyticsApi";
import { getStatsConfig } from "@/utils/enums";
import { AnalyticsStatsSkeleton, AnalyticsChartSkeleton } from "@/components/skeletons/AnalyticsSkeleton";
import { formatRelativeTime, formatDate } from "@/utils/utility";
import SearchItems from "@/components/UI/SearchItems";

const USERS_PAGE_SIZE = 15;
const EMPTY_USERS = [];

const RANGE_OPTIONS = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

function formatTokens(tokens) {
  if (tokens == null) return "0";
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

function formatCost(cost) {
  const n = Number(cost) || 0;
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

// Identify embed users by the local part of their proxy email — never the full address.
function emailLocalPart(value) {
  if (!value || typeof value !== "string") return null;
  const at = value.indexOf("@");
  return at > 0 ? value.slice(0, at) : value;
}

function formatChartTime(t) {
  if (!t) return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return String(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

const EmbedAnalyticsTab = ({ data }) => {
  const params = useParams();
  const orgId = params?.org_id;
  const folderId = data?.folder_id || data?._id;

  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userPage, setUserPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // One request per settled search term rather than one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Always search from page 1 so matches on later pages are not skipped.
  useEffect(() => {
    setUserPage(1);
  }, [debouncedSearch, range]);

  // Search-as-you-type can resolve out of order; only the newest request may write state.
  const requestIdRef = useRef(0);

  const handleUserSearchChange = useCallback((term) => {
    setSearch(term);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    if (!folderId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getEmbedAnalyticsApi(
        folderId,
        { range, search: debouncedSearch, page: userPage, limit: USERS_PAGE_SIZE },
        orgId
      );
      // API returns summary/users/agents at the top level (not nested under data).
      // Avoid `res.data ?? res` — empty/undefined data would drop the real payload.
      const payload =
        res && (res.summary != null || Array.isArray(res.users) || Array.isArray(res.agents))
          ? res
          : res?.data && typeof res.data === "object"
            ? res.data
            : res;
      if (requestId !== requestIdRef.current) return;
      setAnalytics(payload || null);
    } catch (err) {
      console.error(err);
      if (requestId !== requestIdRef.current) return;
      setError(err?.response?.data?.message || err?.message || "Failed to load analytics");
      setAnalytics(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [folderId, range, orgId, debouncedSearch, userPage]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = analytics?.summary || {};
  const lifetimeSummary = analytics?.lifetime_summary || {};
  const requestsOverTime = analytics?.requests_over_time || [];
  const users = analytics?.users || [];
  const agents = analytics?.agents || [];
  const meta = analytics?.meta || {};

  const rangeRequests = Number(summary.total_requests) || 0;
  const lifetimeRequests = Number(lifetimeSummary.total_requests) || 0;
  const showEmptyHint = !loading && rangeRequests === 0 && lifetimeRequests === 0 && agents.length > 0;
  const showLifetimeHint = !loading && rangeRequests === 0 && lifetimeRequests > 0;

  const stats = useMemo(() => {
    const base = getStatsConfig(summary)
      // Feedback counts are agent-level; not shown in embed analytics.
      .filter((stat) => stat.title !== "Positive" && stat.title !== "Negative")
      .map((stat) => {
        if (stat.title === "Est. Cost") {
          return { ...stat, value: formatCost(summary?.est_cost) };
        }
        return stat;
      });
    const extra = [
      {
        title: "Active Users",
        value: summary?.unique_users ?? 0,
        change: "",
        trend: "up",
        icon: Users,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      },
      {
        title: "Active Agents",
        value: summary?.active_agents ?? 0,
        change: "",
        trend: "up",
        icon: Bot,
        color: "text-violet-500",
        bg: "bg-violet-500/10",
      },
    ];
    return [...base.slice(0, 6), ...extra, ...base.slice(6)];
  }, [summary]);

  const executionData = useMemo(
    () =>
      requestsOverTime.map((item) => ({
        time: formatChartTime(item.t),
        success: Number(item.success) || 0,
        failed: Number(item.failed) || 0,
      })),
    [requestsOverTime]
  );

  // Search + pagination are resolved by the API; the server clamps the page.
  const usersPagination = analytics?.users_pagination || {};
  const userTotal = Number(usersPagination.total) || 0;
  const userPageCount = Math.max(1, Number(usersPagination.total_pages) || 1);
  const currentUserPage = Math.min(Math.max(1, Number(usersPagination.page) || userPage), userPageCount);

  if (!folderId) {
    return <div className="p-8 text-center text-base-content/60">No embed folder selected.</div>;
  }

  return (
    <div className="h-full overflow-y-auto" data-testid="embed-analytics-tab">
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Embed Analytics
            </h1>
            <p className="text-sm text-base-content/80 mt-1">
              Usage by embed users (agent owners) and agents in this integration.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold tracking-widest text-base-content/40 uppercase">Time Range</span>
            {RANGE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setRange(item.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  range === item.value
                    ? "bg-primary text-primary-content"
                    : "bg-base-200 text-base-content/70 hover:bg-base-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="alert alert-error text-sm">
            <span>{error}</span>
            <button type="button" className="btn btn-sm" onClick={fetchAnalytics}>
              Retry
            </button>
          </div>
        )}

        {showEmptyHint && (
          <div className="alert alert-warning text-sm">
            <span>No conversation logs found for these agents (lifetime requests: {meta.lifetime_requests ?? 0}).</span>
          </div>
        )}

        {showLifetimeHint && (
          <div className="alert alert-info text-sm">
            <span>
              No requests in this time range, but lifetime usage is <strong>{lifetimeSummary.total_requests}</strong>{" "}
              requests ({formatCost(lifetimeSummary.est_cost)}). Try a wider range (90d).
            </span>
          </div>
        )}

        {!analytics ? (
          <AnalyticsStatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={`${stat.title}-${idx}`}
                  className="bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm flex flex-col gap-1"
                >
                  <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <p className="text-lg font-bold text-base-content mt-1">{stat.value}</p>
                  <h3 className="text-[11px] font-medium text-base-content/60">{stat.title}</h3>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-base-content">Execution Volume</h3>
            <p className="text-xs text-base-content/70">Success vs Failed runs over time</p>
          </div>
          <div className="min-h-[280px] h-72">
            {!analytics ? (
              <AnalyticsChartSkeleton title="Execution Volume" />
            ) : executionData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <BarChart3 className="w-10 h-10 text-base-content/30 mb-2" />
                <p className="text-sm text-base-content/50">No content</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={executionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#9ca3af", fontSize: "11px" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: "11px" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: "12px",
                      borderRadius: "4px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="success"
                    name="Success"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    name="Failed"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <SearchItems
            item="Users"
            data={EMPTY_USERS}
            setFilterItems={() => {}}
            onSearchChange={handleUserSearchChange}
            placeholder="Search users..."
            containerClass="max-w-xs"
            inputContainerClass="relative"
          />
          <span className="text-xs text-base-content/70">
            {userTotal} users · {agents.length} agents
          </span>
        </div>

        {/* Users table */}
        <div className="bg-base-100 border border-base-300 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-base-300 flex items-center gap-2">
            <Users size={16} className="text-base-content/70" />
            <h2 className="text-sm font-semibold text-base-content">Users</h2>
            <span className="text-xs text-base-content/70">Agent owners in this embed</span>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-base-content/70 text-center py-10">
              {debouncedSearch
                ? `No users match "${debouncedSearch}".`
                : "No users yet — users appear when agents are created in this embed."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-xs uppercase text-base-content/80 font-semibold">
                    <th className="w-8" />
                    <th>User</th>
                    <th>Agents</th>
                    <th>Requests</th>
                    <th>Success</th>
                    <th>Tokens</th>
                    <th>Cost</th>
                    <th>Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const key = user.user_id || "unknown";
                    const isOpen = expandedUserId === key;
                    return (
                      <React.Fragment key={key}>
                        <tr
                          className="hover:bg-base-200/60 cursor-pointer"
                          onClick={() => setExpandedUserId(isOpen ? null : key)}
                        >
                          <td>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                          <td>
                            <span className="font-medium text-sm">
                              {emailLocalPart(user.external_user_id) || emailLocalPart(user.email) || user.name}
                            </span>
                          </td>
                          <td>{user.agent_count}</td>
                          <td>{user.total_requests}</td>
                          <td>
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-success" />
                              {user.success_rate}%
                            </span>
                          </td>
                          <td>{formatTokens(user.total_tokens)}</td>
                          <td>{formatCost(user.est_cost)}</td>
                          <td>
                            {user.last_active ? (
                              <span className="group relative inline-grid cursor-help text-xs [&>span]:col-start-1 [&>span]:row-start-1 [&>span]:whitespace-nowrap">
                                {/* Reserve width with the longer absolute date so hover swap never reflows */}
                                <span className="invisible pointer-events-none" aria-hidden="true">
                                  {formatDate(user.last_active)}
                                </span>
                                <span className="opacity-100 group-hover:opacity-0 transition-opacity duration-150">
                                  {formatRelativeTime(user.last_active)}
                                </span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                  {formatDate(user.last_active)}
                                </span>
                              </span>
                            ) : (
                              <span className="text-base-content/50 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-base-200/40">
                            <td colSpan={8} className="p-0">
                              <div className="px-10 py-3 space-y-1">
                                <p className="text-[11px] uppercase tracking-wider text-base-content/60 mb-2">
                                  Agents for this user
                                </p>
                                {(user.agents || []).length === 0 ? (
                                  <p className="text-xs text-base-content/70">No agents</p>
                                ) : (
                                  (user.agents || []).map((a) => (
                                    <div
                                      key={a.bridge_id}
                                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
                                    >
                                      <div className="flex flex-col truncate">
                                        <span className="font-medium truncate">{a.name}</span>
                                        <span className="text-[11px] text-base-content/50 truncate">
                                          {a.bridge_id}
                                        </span>
                                      </div>
                                      <span className="text-xs text-base-content/70 shrink-0">
                                        {a.total_requests} req · {formatCost(a.est_cost)}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && userPageCount > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-base-300">
              <span className="text-xs text-base-content/50">
                {(currentUserPage - 1) * USERS_PAGE_SIZE + 1}–{Math.min(currentUserPage * USERS_PAGE_SIZE, userTotal)}{" "}
                of {userTotal}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={currentUserPage <= 1}
                  onClick={() => setUserPage(currentUserPage - 1)}
                >
                  Prev
                </button>
                <span className="text-xs text-base-content/60">
                  {currentUserPage} / {userPageCount}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  disabled={currentUserPage >= userPageCount}
                  onClick={() => setUserPage(currentUserPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmbedAnalyticsTab;
