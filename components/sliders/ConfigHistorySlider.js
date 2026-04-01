"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CloseIcon, FileTextIcon } from "@/components/Icons";
import { toggleSidebar } from "@/utils/utility";
import { getBridgeConfigHistory } from "@/config/index";
import { CONFIG_HISTORY_FILTER_KEYS, CONFIG_HISTORY_FEATURE_OPTIONS, CONFIG_HISTORY_HIDDEN_TYPES } from "@/utils/enums";
import InfiniteScroll from "react-infinite-scroll-component";

function ConfigHistorySlider({ versionId }) {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    [CONFIG_HISTORY_FILTER_KEYS.USER_IDS]: [],
    [CONFIG_HISTORY_FILTER_KEYS.TYPES]: [],
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const pageSize = 25;
  const featureLabelMap = useMemo(
    () =>
      CONFIG_HISTORY_FEATURE_OPTIONS.reduce((acc, option) => {
        acc[option.value] = option.label;
        return acc;
      }, {}),
    []
  );

  const fetchHistory = useCallback(
    async (targetPage = page, currentFilters = filters) => {
      // Check if slider is actually open before making API call
      const sliderElement = document.getElementById("default-config-history-slider");
      const isSliderOpen = sliderElement && !sliderElement.classList.contains("translate-x-full");

      if (!versionId || !isSliderOpen) return;

      setLoading(true);
      try {
        const response = await getBridgeConfigHistory(versionId, targetPage, pageSize, currentFilters);
        const usersFromResponse = response?.userData?.users;

        if (Array.isArray(usersFromResponse) && usersFromResponse.length > 0) {
          setAvailableUsers(usersFromResponse);
        }

        if (!response?.success) {
          if (targetPage === 1) {
            setHistoryData([]);
          }
          setHasMore(false);
          return;
        }

        const newData = response?.userData?.updates ?? [];
        setHistoryData((prev) => (targetPage === 1 ? newData : [...prev, ...newData]));
        setHasMore(newData.length === pageSize);
      } catch (error) {
        console.error("Error fetching agent history:", error);
      } finally {
        setLoading(false);
      }
    },
    [versionId, pageSize]
  );

  // Listen for slider open/close events using MutationObserver
  useEffect(() => {
    const sliderElement = document.getElementById("default-config-history-slider");
    if (!sliderElement) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          const isOpen = !sliderElement.classList.contains("translate-x-full");
          if (isOpen && versionId) {
            // Slider just opened, fetch history
            setPage(1);
            setHistoryData([]);
            fetchHistory(1);
          }
        }
      });
    });

    observer.observe(sliderElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [versionId, fetchHistory]);

  useEffect(() => {
    if (page > 1) {
      fetchHistory(page, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Refetch history immediately when filters change
  useEffect(() => {
    setPage(1);
    setHistoryData([]);
    fetchHistory(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleDropdownFilterChange = (filterType, value) => {
    handleFilterChange(filterType, value ? [value] : []);
  };

  const clearFilters = () => {
    setFilters({
      [CONFIG_HISTORY_FILTER_KEYS.USER_IDS]: [],
      [CONFIG_HISTORY_FILTER_KEYS.TYPES]: [],
    });
  };

  const getDateLabel = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Group historyData by date label, preserving chronological order
  // Filter out internal-only types here so hasMore uses the real raw API count
  const groupedHistory = useMemo(() => {
    const groups = [];
    const seen = new Map();
    historyData
      .filter((item) => !CONFIG_HISTORY_HIDDEN_TYPES.includes(item?.type))
      .forEach((item) => {
        const label = getDateLabel(item?.time);
        if (!seen.has(label)) {
          seen.set(label, groups.length);
          groups.push({ label, items: [] });
        }
        groups[seen.get(label)].items.push(item);
      });
    return groups;
  }, [historyData]);

  const handleCloseConfigHistorySlider = useCallback(() => {
    toggleSidebar("default-config-history-slider", "right");
    // Reset filters when closing
    setFilters({
      [CONFIG_HISTORY_FILTER_KEYS.USER_IDS]: [],
      [CONFIG_HISTORY_FILTER_KEYS.TYPES]: [],
    });
  }, []);

  return (
    <aside
      id="default-config-history-slider"
      className="sidebar-container fixed z-very-high flex flex-col top-0 right-0 p-4 w-full md:w-1/3 lg:w-1/4 opacity-100 h-screen bg-base-200 transition-all duration-300 border-l border-base-300 overflow-hidden translate-x-full "
      aria-label="Config History Slider"
    >
      <div className="flex flex-col w-full gap-4 h-full min-h-0">
        <div className="flex justify-between items-center border-b border-base-300 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileTextIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-base-content leading-tight">Updates History</p>
            </div>
          </div>
          <button
            id="config-history-slider-close-icon"
            onClick={handleCloseConfigHistorySlider}
            className="p-1.5 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-300 transition-all"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-base-100 rounded-lg p-4 border border-base-300 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1">Filter by User</label>
              <select
                className="select select-sm select-bordered w-full"
                value={filters[CONFIG_HISTORY_FILTER_KEYS.USER_IDS][0] || ""}
                onChange={(e) => handleDropdownFilterChange(CONFIG_HISTORY_FILTER_KEYS.USER_IDS, e.target.value)}
              >
                <option value="">All Users</option>
                {availableUsers?.map((user) => (
                  <option key={user?.id} value={user?.id}>
                    {user?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Filter by Feature</label>
              <select
                className="select select-sm select-bordered w-full"
                value={filters[CONFIG_HISTORY_FILTER_KEYS.TYPES][0] || ""}
                onChange={(e) => handleDropdownFilterChange(CONFIG_HISTORY_FILTER_KEYS.TYPES, e.target.value)}
              >
                <option value="">All Features</option>
                {CONFIG_HISTORY_FEATURE_OPTIONS.map((feature) => (
                  <option key={feature.value} value={feature.value}>
                    {feature.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="w-full px-3 py-1.5 text-xs bg-base-300 text-base-content rounded hover:bg-base-200 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div id="config-history-scroll-container" className="mt-2 flex-1 overflow-y-auto">
          {loading && page === 1 ? (
            <div className="flex justify-center items-center h-40">
              <div className="loading loading-spinner loading-md"></div>
            </div>
          ) : (
            <InfiniteScroll
              dataLength={historyData.length}
              next={loadMore}
              hasMore={hasMore}
              loader={
                <div className="flex justify-center py-4">
                  <div className="loading loading-spinner loading-md"></div>
                </div>
              }
              endMessage={
                historyData.length > 0 && (
                  <p className="text-center text-xs text-base-content/30 py-5">— All caught up —</p>
                )
              }
              scrollableTarget="config-history-scroll-container"
            >
              <div className="space-y-4 text-base-content">
                {groupedHistory.length > 0 ? (
                  groupedHistory.map(({ label, items }) => (
                    <div key={label}>
                      {/* Date group divider */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider whitespace-nowrap">
                          {label}
                        </span>
                        <div className="flex-1 h-px bg-base-300" />
                      </div>

                      <ul className="space-y-2">
                        {items.map((item, index) => (
                          <li
                            id={`config-history-item-${item?.id ?? index}`}
                            key={item?.id ?? index}
                            className="px-3 py-2.5 rounded-lg bg-base-100 border border-base-300 border-l-2 border-l-primary/30 hover:border-l-primary hover:bg-primary/5 hover:border-base-content/10 transition-all duration-150"
                          >
                            {/* Top row: feature name + time */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-sm font-semibold truncate text-base-content">
                                {featureLabelMap[item?.type] || item?.type}
                              </span>
                              <span className="text-xs text-base-content/40 shrink-0 tabular-nums">
                                {new Date(item?.time).toLocaleString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                            {/* Bottom row: user */}
                            <span className="text-xs text-base-content/50 truncate block">
                              {item?.user_name || "Unknown User"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-base-content/30">
                    <FileTextIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No history found</p>
                  </div>
                )}
              </div>
            </InfiniteScroll>
          )}
        </div>
      </div>
    </aside>
  );
}

export default ConfigHistorySlider;
