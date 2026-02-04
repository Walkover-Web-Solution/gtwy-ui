"use client";
import React, { useState, useEffect, useCallback } from "react";
import { CloseIcon, ClockIcon, UserIcon, FileTextIcon, SecurityIcon } from "@/components/Icons";
import { toggleSidebar } from "@/utils/utility";
import { getBridgeConfigHistory } from "@/config/index";
import InfiniteScroll from "react-infinite-scroll-component";

function ConfigHistorySlider({ versionId }) {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchHistory = useCallback(async () => {
    // Check if slider is actually open before making API call
    const sliderElement = document.getElementById("default-config-history-slider");
    const isSliderOpen = sliderElement && !sliderElement.classList.contains("translate-x-full");

    if (!versionId || !isSliderOpen) return;

    setLoading(true);
    try {
      const response = await getBridgeConfigHistory(versionId, page, pageSize);
      if (response?.success) {
        const newData = response?.userData?.updates ?? [];
        setHistoryData((prev) => (page === 1 ? newData : [...prev, ...newData]));
        setHasMore(newData.length === pageSize);
      }
    } catch (error) {
      console.error("Error fetching agent history:", error);
    } finally {
      setLoading(false);
    }
  }, [versionId, page, pageSize]);

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
            fetchHistory();
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
      fetchHistory();
    }
  }, [page, fetchHistory]);

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  const formatTime = (time) => {
    const date = new Date(time);
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    };
    return date.toLocaleString("en-US", options);
  };

  const handleCloseConfigHistorySlider = useCallback(() => {
    toggleSidebar("default-config-history-slider", "right");
  }, []);

  return (
    <aside
      id="default-config-history-slider"
      className="sidebar-container fixed z-very-high flex flex-col top-0 right-0 p-4 w-full md:w-1/3 lg:w-1/4 opacity-100 h-screen bg-base-200 transition-all duration-300 border-l border-base-300 overflow-y-auto translate-x-full "
      aria-label="Config History Slider"
    >
      <div className="flex flex-col w-full gap-4">
        <div className="flex justify-between items-center border-b pb-4">
          <div className="flex items-center gap-2">
            <FileTextIcon className="w-5 h-5" />
            <p className="text-xl font-semibold">Updates History</p>
          </div>
          <CloseIcon
            id="config-history-slider-close-icon"
            className="cursor-pointer hover:text-error transition-colors"
            onClick={handleCloseConfigHistorySlider}
          />
        </div>
        <div className="mt-2">
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
                  <div className="text-center py-4 text-base-content">
                    <p>No more history to load</p>
                  </div>
                )
              }
              scrollableTarget="default-config-history-slider"
            >
              <ul className="space-y-2 text-base-content">
                {historyData?.length > 0 ? (
                  historyData.map((item, index) => (
                    <li
                      id={`config-history-item-${index}`}
                      key={item?.id ?? index}
                      className="p-3 rounded-lg bg-base-100 shadow-sm hover:shadow-md transition duration-200"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <SecurityIcon className="h-5 w-5 text-success" />
                          <span className="text-lg font-medium">{item?.type}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-base-content">
                          <UserIcon className="w-4 h-4" />
                          <span>{item?.user_name || "Unknown User"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-base-content">
                          <ClockIcon className="w-4 h-4" />
                          <span>{formatTime(item?.time)}</span>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <div className="text-center py-8 text-base-content">
                    <FileTextIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No history available</p>
                  </div>
                )}
              </ul>
            </InfiniteScroll>
          )}
        </div>
      </div>
    </aside>
  );
}

export default ConfigHistorySlider;
