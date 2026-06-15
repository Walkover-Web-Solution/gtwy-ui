import React, { useState, useRef, useCallback } from "react";
import { ChevronRight, ChevronLeft, Search, Filter } from "lucide-react";
import InfiniteScroll from "react-infinite-scroll-component";
import { formatRelativeTime, formatDate } from "@/utils/utility";

const statusDot = {
  success: "bg-emerald-500",
  failed: "bg-red-500",
  running: "bg-blue-400 animate-pulse",
};

// Group history data by date strings
const groupHistoryByDate = (historyData) => {
  const groups = {};
  historyData.forEach((item) => {
    // Determine status (basic heuristic, adjust if needed)
    const isError = item.error ? true : false;
    const status = isError ? "failed" : "success";

    const dateStr = formatDate(item.updated_at || item.created_at) || "Today";
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push({ ...item, computedStatus: status });
  });
  return groups;
};

const DashboardSidebar = ({
  historyData = [],
  loading,
  searchQuery,
  setSearchQuery,
  handleSearch,
  clearInput,
  fetchMoreData,
  hasMore,
  selectedThreadId,
  onSelectThread,
  totalRuns = 0,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const searchRef = useRef(null);

  const groupedData = groupHistoryByDate(historyData);
  const dateGroups = Object.keys(groupedData);

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const handleChange = useCallback(
    debounce((e) => {
      const value = e?.target?.value || "";
      setSearchQuery(value);
      handleSearch(value);
    }, 500),
    [handleSearch, setSearchQuery]
  );

  return (
    <div
      className={`${
        sidebarCollapsed ? "w-12" : "w-72"
      } border-r border-base-300 bg-base-100 flex flex-col transition-all duration-300 shrink-0 h-full relative z-10 shadow-[1px_0_0_0_#e5e5e5] rounded-l-xl`}
    >
      {/* Sidebar header */}
      <div
        className={`h-14 flex items-center border-b border-base-300 px-3 shrink-0 ${
          sidebarCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!sidebarCollapsed && (
          <>
            <div>
              <p className="text-xs font-semibold text-base-content">Execution History</p>
              <p className="text-[10px] text-base-content/60">{totalRuns} total runs</p>
            </div>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 hover:bg-base-200 rounded-md transition-colors text-base-content/60 hover:text-base-content"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-1.5 hover:bg-base-200 rounded-md transition-colors text-base-content/60 hover:text-base-content"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!sidebarCollapsed && (
        <>
          {/* Search bar */}
          <div className="px-3 py-2.5 border-b border-base-300 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchRef?.current?.value || "");
              }}
              className="relative"
            >
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-base-content/40" />
              <input
                type="text"
                ref={searchRef}
                placeholder="Search..."
                onChange={handleChange}
                className="w-full pl-7 pr-2.5 py-1.5 bg-base-200 border border-base-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-base-content/50"
              />
            </form>
          </div>

          {/* Log list */}
          <div className="flex-1 overflow-y-auto" id="dashboard-sidebar-scrollable">
            {loading && historyData.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            ) : historyData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <Filter className="w-5 h-5 text-base-content opacity-30" />
                <p className="text-[11px] text-base-content/60">No results</p>
              </div>
            ) : (
              <InfiniteScroll
                dataLength={historyData.length}
                next={fetchMoreData}
                hasMore={hasMore}
                loader={
                  <div className="flex justify-center py-2">
                    <span className="loading loading-spinner loading-xs"></span>
                  </div>
                }
                scrollableTarget="dashboard-sidebar-scrollable"
              >
                {dateGroups.map((dateGroup) => {
                  const executions = groupedData[dateGroup];
                  return (
                    <div key={dateGroup}>
                      <div className="px-3 pt-3 pb-1 sticky top-0 bg-base-100 z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-base-content/50">
                            {dateGroup}
                          </span>
                          <div className="flex-1 h-px bg-base-300" />
                        </div>
                      </div>
                      <div className="px-2 pb-1">
                        {executions.map((execution) => (
                          <button
                            key={execution.thread_id}
                            onClick={() => onSelectThread(execution.thread_id)}
                            className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-all ${
                              selectedThreadId === execution.thread_id
                                ? "bg-primary/10 border border-primary/20"
                                : "hover:bg-base-200 border border-transparent"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[execution.computedStatus]}`}
                            />
                            <span className="text-xs font-medium truncate flex-1 leading-none text-base-content">
                              {execution.thread_id || "Agent"}
                            </span>
                            <span className="text-[10px] text-base-content/60 shrink-0 tabular-nums">
                              {formatRelativeTime(execution.updated_at || execution.created_at)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </InfiniteScroll>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardSidebar;
