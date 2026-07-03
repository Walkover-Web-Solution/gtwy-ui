import { useCustomSelector } from "@/customHooks/customSelector.js";
import { getHistoryAction, getSubThreadsAction } from "@/store/action/historyAction.js";
import {
  clearSubThreadData,
  clearThreadData,
  setSelectedVersion,
  clearRecursiveHistory,
} from "@/store/reducer/historyReducer.js";
import { USER_FEEDBACK_FILTER_OPTIONS, HISTORY_FILTER_BY_FIELDS } from "@/utils/enums.js";
import { formatDate, formatRelativeTime } from "@/utils/utility.js";
import { ThumbsDownIcon, ThumbsUpIcon, UserIcon, MessageCircleIcon } from "@/components/Icons";
import { useEffect, useState, memo, useCallback, useRef, Fragment } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import CreateFineTuneModal from "../modals/CreateFineTuneModal.js";
import DateRangePicker from "./DateRangePicker.js";
import { usePathname, useRouter } from "next/navigation.js";
import { FileTextIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { AnalyticsThreadListSkeleton } from "@/components/skeletons/AnalyticsSkeleton";

const getRelativeDateGroup = (dateString) => {
  if (!dateString) return "TODAY";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "TODAY";
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDate.getTime() === startOfToday.getTime()) {
    return "TODAY";
  }

  const yesterday = new Date(startOfToday);
  yesterday.setDate(yesterday.getDate() - 1);
  if (startOfDate.getTime() === yesterday.getTime()) {
    return "YESTERDAY";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
    .format(date)
    .toUpperCase();
};

const groupHistoryByDate = (historyData) => {
  const groups = {};
  if (!Array.isArray(historyData)) return groups;
  historyData.forEach((item) => {
    const dateStr = getRelativeDateGroup(item.updated_at || item.created_at);
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(item);
  });
  return groups;
};

const Sidebar = memo(
  ({
    historyData = [],
    threadHandler,
    fetchMoreData,
    hasMore,
    loading,
    params,
    searchParams,
    setSearchMessageId,
    setPage,
    setHasMore,
    filterOption,
    setFilterOption,
    searchRef,
    setThreadPage,
    selectedVersion,
    setIsErrorTrue,
    isErrorTrue,
    activeFilterByRef,
    isAnalytics = false,
    handleSearch,
    selectedThreadId,
    sidebarExpandedThreadId = null,
    sidebarExpandedSubThreadId = null,
    onAnalyticsSidebarSelect,
    onAnalyticsSelectSubThread,
    onAnalyticsMessageNavigate,
    searchMessageId = null,
  }) => {
    const {
      subThreads,
      subThreadsParentId,
      userFeedbackCount,
      bridgeVersionsArray,
      bridgeType,
      analyticsThreads,
      historyEmbed,
    } = useCustomSelector((state) => ({
      subThreads: Array.isArray(state?.historyReducer?.subThreads) ? state.historyReducer.subThreads : [],
      subThreadsParentId: state?.historyReducer?.subThreadsParentId,
      userFeedbackCount: state?.historyReducer?.userFeedbackCount,
      bridgeVersionsArray: Array.isArray(state?.bridgeReducer?.allBridgesMap?.[params?.id]?.versions)
        ? state.bridgeReducer.allBridgesMap[params.id].versions
        : [],
      bridgeType:
        state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType ||
        state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridge_type,
      analyticsThreads: state?.analyticsReducer?.analyticsData?.[params?.id]?.threads,
      historyEmbed: state?.appInfoReducer?.embedUserDetails?.historyEmbed || false,
    }));

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedThreadIds, _setSelectedThreadIds] = useState([]);
    const [expandedThreads, setExpandedThreads] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [filterByFields, setFilterByFields] = useState({ ...HISTORY_FILTER_BY_FIELDS, variables: {} });
    const [variableKey, setVariableKey] = useState("");
    const [variableValue, setVariableValue] = useState("");
    const searchQuery =
      (searchRef?.current && searchRef.current.value) || searchParams?.keyword || searchParams?.message_id || "";
    const dispatch = useDispatch();
    const pathName = usePathname();
    const router = useRouter();

    const isSidebarThreadActive = (threadId) => {
      if (isAnalytics) {
        if (searchQuery) return sidebarExpandedThreadId === threadId;
        return selectedThreadId === threadId;
      }
      const fromParams = searchParams?.thread_id;
      return fromParams ? decodeURIComponent(fromParams) === threadId : false;
    };

    const isSidebarSubThreadActive = (subThreadId) => {
      if (isAnalytics) return sidebarExpandedSubThreadId === subThreadId;
      const fromParams = searchParams?.subThread_id;
      return fromParams ? decodeURIComponent(fromParams) === subThreadId : false;
    };

    const isSidebarMessageActive = (messageId) => {
      if (isAnalytics) return searchMessageId === messageId;
      const fromParams = searchParams?.message_id;
      return fromParams ? fromParams === messageId : false;
    };

    useEffect(() => {
      if (isAnalytics) return;
      if (
        subThreadsParentId === searchParams?.thread_id &&
        expandedThreads?.includes(searchParams?.thread_id) &&
        subThreads?.length > 0 &&
        searchParams?.thread_id &&
        searchParams?.subThread_id === searchParams?.thread_id
      ) {
        // Check if any subThread matches the thread_id
        const matchExists = subThreads.some((sub) => sub.sub_thread_id === searchParams?.thread_id);

        if (!matchExists) {
          const firstSubThreadId = subThreads[0]?.sub_thread_id;
          if (firstSubThreadId) {
            const thread_id = encodeURIComponent(searchParams?.thread_id?.replace(/&/g, "%26"));
            const firstSubThreadIdEncoded = encodeURIComponent(subThreads[0]?.sub_thread_id?.replace(/&/g, "%26"));
            router.push(
              `${pathName}?version=${searchParams?.version}&thread_id=${thread_id}&subThread_id=${firstSubThreadIdEncoded}${searchParams?.message_id ? `&message_id=${searchParams.message_id}` : ""}&type=${searchParams?.type || ""}`,
              undefined,
              { shallow: true }
            );
          }
        }
      }
    }, [
      subThreads,
      subThreadsParentId,
      expandedThreads,
      searchParams?.thread_id,
      searchParams?.subThread_id,
      searchParams?.version,
      searchParams?.message_id,
      searchParams?.type,
      pathName,
      router,
    ]);

    const handleVersionChange = async (event) => {
      const version = event.target.value;
      dispatch(clearSubThreadData());
      dispatch(clearThreadData());
      dispatch(clearRecursiveHistory());
      dispatch(setSelectedVersion(version));

      if (isAnalytics) {
        const url = new URL(window.location.href);
        if (!version || version === "all") url.searchParams.delete("version");
        else url.searchParams.set("version", version);
        router.replace(url.pathname + url.search);
      }
    };

    useEffect(() => {
      if (searchParams?.thread_id) {
        setExpandedThreads([searchParams?.thread_id]);
        dispatch(clearSubThreadData());
        dispatch(
          getSubThreadsAction({
            thread_id: searchParams?.thread_id,
            error: isErrorTrue,
            bridge_id: params.id,
            version_id: selectedVersion,
          })
        );
      } else {
        setExpandedThreads([]);
        dispatch(clearSubThreadData());
      }
    }, [searchParams?.thread_id, isErrorTrue, params.id, selectedVersion, dispatch]);

    useEffect(() => {
      if (!isAnalytics) return;
      if (sidebarExpandedThreadId) {
        setExpandedThreads([sidebarExpandedThreadId]);
        dispatch(clearSubThreadData());
        dispatch(
          getSubThreadsAction({
            thread_id: sidebarExpandedThreadId,
            error: isErrorTrue,
            bridge_id: params.id,
            version_id: selectedVersion,
          })
        );
      } else {
        setExpandedThreads([]);
        dispatch(clearSubThreadData());
      }
    }, [sidebarExpandedThreadId, isErrorTrue, params.id, selectedVersion, dispatch, isAnalytics]);

    useEffect(() => {
      const p = new URLSearchParams(window.location.search);
      const liveVersion = p.get("version");
      const liveThreadId = p.get("thread_id");
      const versionMismatch = selectedVersion !== "all" && liveVersion !== selectedVersion;
      if (!liveThreadId || !liveVersion || versionMismatch) {
        return;
      }
      if (subThreadsParentId === liveThreadId && subThreads?.length > 0 && expandedThreads?.includes(liveThreadId)) {
        const firstSubThreadId = subThreads[0]?.sub_thread_id;
        if (firstSubThreadId) {
          const url = `${pathName}?version=${liveVersion}&thread_id=${liveThreadId}&subThread_id=${firstSubThreadId}&start=${p.get("start") || ""}&end=${p.get("end") || ""}${p.get("message_id") ? `&message_id=${p.get("message_id")}` : ""}&type=${p.get("type") || ""}`;
          router.push(url, undefined, { shallow: true });
        }
      }
    }, [subThreads, subThreadsParentId, selectedVersion, expandedThreads, pathName, router]);
    const searchTimeoutRef = useRef(null);
    useEffect(() => {
      return () => clearTimeout(searchTimeoutRef.current);
    }, []);

    useEffect(() => {
      // In historyEmbed mode we only render a single message via
      // getMessageByIdApi and must NOT trigger the filter/keyword history API.
      if (historyEmbed) return;
      if (searchParams?.message_id) {
        // Set the search query state and input value
        if (searchRef?.current) {
          searchRef.current.value = searchParams.message_id;
        }
        handleChange();
      }
    }, [searchParams?.message_id, historyEmbed]);

    const handleChange = useCallback(
      (e) => {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
          const value = searchRef?.current?.value?.trim() || searchParams?.message_id || "";
          if (isAnalytics) {
            if (typeof handleSearch === "function") {
              handleSearch(value);
            }
            return;
          }
          const filterBy = { ...filterByFields };
          if (variableKey.trim() && variableValue.trim()) {
            filterBy.variables = { [variableKey.trim()]: variableValue.trim() };
          } else {
            delete filterBy.variables;
          }
          handleSearchInternal(null, value, filterBy);
        }, 500);
      },
      [searchParams?.message_id, filterByFields, variableKey, variableValue, isAnalytics, handleSearch]
    );

    const handleSearchInternal = async (e, directValue, filterBy) => {
      e?.preventDefault();
      const searchValue = directValue !== undefined ? directValue : searchRef?.current?.value || "";
      const hasActiveFilterBy =
        filterBy &&
        typeof filterBy === "object" &&
        Object.values(filterBy).some((v) => (typeof v === "object" ? Object.keys(v).length > 0 : v && v.trim() !== ""));

      if (!searchValue.trim() && !hasActiveFilterBy) {
        clearInput();
        setSearchLoading(false);
        return;
      }
      if (!searchValue && !hasActiveFilterBy && !searchParams?.start && !searchParams?.end) {
        if (searchParams?.message_id || searchParams?.start || searchParams?.end) {
          clearInput();
          setSearchLoading(false);
        }
        return;
      }

      setPage(1);
      setHasMore(true);
      setFilterOption("all");
      setExpandedThreads([]); // Collapse all threads when searching
      dispatch(clearSubThreadData());
      setSearchLoading(true);

      try {
        const currentMessageId = searchParams?.message_id;

        // Get date range from search params
        const startDate = searchParams?.start;
        const endDate = searchParams?.end;

        const activeFilterBy =
          filterBy && typeof filterBy === "object"
            ? Object.fromEntries(
                Object.entries(filterBy).filter(([_key, v]) =>
                  typeof v === "object" ? Object.keys(v).length > 0 : v && v.trim() !== ""
                )
              )
            : undefined;

        if (activeFilterByRef) {
          activeFilterByRef.current = Object.keys(activeFilterBy || {}).length > 0 ? activeFilterBy : undefined;
        }

        const result = await dispatch(
          getHistoryAction(
            params?.id,
            1,
            "all",
            isErrorTrue,
            selectedVersion,
            searchValue,
            startDate,
            endDate,
            Object.keys(activeFilterBy || {}).length > 0 ? activeFilterBy : undefined
          )
        );

        setThreadPage(1);

        const finalUrl = new URL(window.location.href);
        finalUrl.searchParams.set("version", searchParams?.version || "all");
        if (startDate) finalUrl.searchParams.set("start", startDate);
        if (endDate) finalUrl.searchParams.set("end", endDate);
        if (currentMessageId) finalUrl.searchParams.set("message_id", currentMessageId);
        if (searchParams?.type) finalUrl.searchParams.set("type", searchParams.type);

        if (result?.data?.length) {
          const firstResult = result.data[0];
          const rawThreadId = firstResult.thread_id;
          const rawSubThreadId = firstResult.sub_thread?.[0]?.sub_thread_id || rawThreadId;
          finalUrl.searchParams.set("thread_id", rawThreadId);
          finalUrl.searchParams.set("subThread_id", rawSubThreadId);
          dispatch(clearThreadData());

          router.push(finalUrl.pathname + finalUrl.search, undefined, { shallow: true });
        } else {
          finalUrl.searchParams.delete("thread_id");
          finalUrl.searchParams.delete("subThread_id");
          router.push(finalUrl.pathname + finalUrl.search, undefined, { shallow: true });
          dispatch(clearThreadData());
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
      }
    };

    const clearInput = async () => {
      if (searchRef?.current) searchRef.current.value = "";
      if (isAnalytics) {
        if (typeof setSearchMessageId === "function") {
          setSearchMessageId("");
        }
        if (typeof handleSearch === "function") {
          handleSearch("");
        }
        return;
      }
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("message_id");

      setPage(1);
      setHasMore(true);
      setFilterOption("all");
      if (activeFilterByRef) activeFilterByRef.current = undefined;

      // Reset expanded threads state when clearing search - keep threads collapsed
      setExpandedThreads([]);

      try {
        // Fetch regular history data (empty keyword)
        const startDate = searchParams?.start;
        const endDate = searchParams?.end;

        await dispatch(
          getHistoryAction(
            params?.id,
            1,
            "all",
            isErrorTrue,
            selectedVersion,
            "", // empty keyword
            startDate
          )
        );
        setThreadPage(1);

        // Update URL
        const clearUrl = new URL(window.location.href);
        clearUrl.searchParams.set("version", searchParams?.version || "all");
        if (startDate) clearUrl.searchParams.set("start", startDate);
        if (endDate) clearUrl.searchParams.set("end", endDate);
        // Remove message_id
        clearUrl.searchParams.delete("message_id");
        if (searchParams?.type) clearUrl.searchParams.set("type", searchParams.type);

        router.push(clearUrl.pathname + clearUrl.search, undefined, { shallow: true });

        setHasMore(true);
      } catch (error) {
        console.error("Clear search error:", error);
      }
    };

    const handleToggleThread = async (threadId) => {
      const isExpanded = expandedThreads?.includes(threadId);
      if (isExpanded) {
        setExpandedThreads((prev) => prev.filter((id) => id !== threadId));
      } else {
        setExpandedThreads([threadId]);
        await dispatch(
          getSubThreadsAction({
            thread_id: threadId,
            error: isErrorTrue,
            bridge_id: params.id,
            version_id: selectedVersion,
          })
        );
      }
    };

    const truncate = (string = "", maxLength) =>
      string?.length > maxLength ? string?.substring(0, maxLength - 3) + "..." : string;

    const handleSetMessageId = (messageId) => {
      if (!messageId) {
        toast.error("Message ID null or not found");
        return;
      }
      if (isAnalytics) {
        const threadId = sidebarExpandedThreadId || selectedThreadId;
        const subThreadId = sidebarExpandedSubThreadId;
        if (!selectedThreadId && threadId && typeof threadHandler === "function") {
          const item = historyData.find((h) => h.thread_id === threadId);
          if (item) threadHandler(threadId, item, { subThreadId });
        }
        setSearchMessageId(messageId);
        onAnalyticsMessageNavigate?.(messageId);
        return;
      }
      setSearchMessageId(messageId);
    };

    const handleSelectSubThread = async (subThreadId, threadId) => {
      if (isAnalytics && typeof onAnalyticsSelectSubThread === "function") {
        onAnalyticsSelectSubThread(subThreadId, threadId);
        return;
      }

      dispatch(clearThreadData());
      dispatch(clearRecursiveHistory());
      setThreadPage(1);
      setExpandedThreads([threadId]);

      const start = searchParams?.start;
      const end = searchParams?.end;
      router.push(
        `${pathName}?version=${searchParams?.version}&thread_id=${encodeURIComponent(threadId ? threadId : searchParams?.thread_id.replace(/&/g, "%26"))}&subThread_id=${encodeURIComponent(subThreadId.replace(/&/g, "%26"))}&start=${start}&end=${end}${searchParams?.message_id ? `&message_id=${searchParams.message_id}` : ""}&type=${searchParams?.type || ""}`,
        undefined,
        { shallow: true }
      );
    };

    const handleFilterChange = async (user_feedback) => {
      dispatch(clearThreadData());
      dispatch(clearRecursiveHistory());
      setFilterOption(user_feedback);
      setThreadPage(1);
    };

    const NoDataFound = () => (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-base-content mb-2">
          <FileTextIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        </div>
        <p className="text-base-content text-sm">No data available</p>
        {searchQuery && (
          <p className="text-base-content text-xs mt-1 opacity-50">No results found for "{searchQuery}"</p>
        )}
      </div>
    );

    const handleCheckError = async (isError) => {
      dispatch(clearThreadData());
      dispatch(clearRecursiveHistory());
      if (isError === true) {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("error", "true");
        const queryString = newSearchParams.toString();
        await dispatch(getHistoryAction(params.id, 1, filterOption, true, selectedVersion));
        setThreadPage(1);
        setIsErrorTrue(true);
        setHasMore(true);
        window.history.replaceState(null, "", `?${queryString}`);
      } else {
        setIsErrorTrue(false);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete("error");
        const queryString = newSearchParams.toString();
        await dispatch(getHistoryAction(params.id, 1, filterOption, false, selectedVersion));
        setThreadPage(1);
        setHasMore(true);
        window.history.replaceState(null, "", `?${queryString}`);
      }
    };

    return (
      <div
        className={`h-full flex flex-col text-xs ${isAnalytics ? "bg-white dark:bg-base-200" : "bg-base-200"} transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed
            ? `w-[48px] min-w-[48px] max-w-[48px] ${isAnalytics ? "border-l" : "border-r"} border-base-300 ${isAnalytics ? "" : "ml-4"}`
            : `w-[280px] min-w-[280px] max-w-[280px] ${isAnalytics ? "border-l" : "border-r"} border-base-300 relative ${isAnalytics ? "" : "ml-4"}`
        }`}
      >
        {isCollapsed ? (
          <div
            className={`h-full flex flex-col justify-between items-center pt-3 pb-2 w-full ${isAnalytics ? "bg-white dark:bg-base-200" : "bg-base-200"}`}
          >
            {/* Top Toggle Button with Divider */}
            <div className="flex flex-col items-center w-full">
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-base-300 text-base-content/60 hover:text-base-content transition-all"
                title="Expand sidebar"
              >
                {isAnalytics ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
              <div className="w-full border-b border-base-300 mt-3" />
            </div>

            {/* Middle Section: Vertical Text */}
            <div className="flex-grow flex flex-col items-center justify-center my-4 select-none gap-1">
              {"CHAT THREADS".split("").map((char, index) => {
                if (char === " ") {
                  return <div key={index} className="h-4" />;
                }
                return (
                  <span key={index} className="font-bold text-base-content/50 uppercase text-[13px] leading-none">
                    {char}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <CreateFineTuneModal params={params} selectedThreadIds={selectedThreadIds} />
            <div className="p-2 gap-2 flex flex-col w-full min-w-0">
              <div className="flex items-center justify-between px-1 py-1 shrink-0">
                <span className="font-bold text-base-content/50 uppercase tracking-widest text-[9px]">
                  Chat Threads
                </span>
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content hover:bg-base-300 transition-colors"
                  title="Collapse sidebar"
                >
                  {isAnalytics ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
              </div>
              {!isAnalytics && (
                <div
                  data-testid="history-sidebar-advance-filter"
                  id="history-sidebar-advance-filter"
                  className="collapse collapse-arrow border border-base-300 bg-base-100 min-h-0 overflow-hidden"
                >
                  <input
                    autoComplete="off"
                    data-testid="history-sidebar-advance-filter-toggle"
                    id="history-sidebar-advance-filter-toggle"
                    type="checkbox"
                    className="peer"
                  />
                  <div className="collapse-title font-semibold min-h-0 py-3 flex items-center">
                    <span className="text-xs">Advance Filter</span>
                  </div>
                  <div className="collapse-content !p-0 w-full min-w-0">
                    <div className="space-y-2 px-2 pb-0 w-full min-w-0">
                      <DateRangePicker
                        params={params}
                        setFilterOption={setFilterOption}
                        setHasMore={setHasMore}
                        setPage={setPage}
                        selectedVersion={selectedVersion}
                        filterOption={filterOption}
                        isErrorTrue={isErrorTrue}
                      />

                      <div className="p-2 bg-base-100">
                        <p className="text-center mb-2 text-xs font-medium">Filter Response</p>
                        <div className="flex items-center justify-center mb-2 gap-2">
                          {USER_FEEDBACK_FILTER_OPTIONS?.map((value, index) => (
                            <label key={index} className="flex items-center gap-1 cursor-pointer">
                              <input
                                autoComplete="off"
                                data-testid={`history-sidebar-filter-${value}`}
                                id={`history-sidebar-filter-${value}`}
                                type="radio"
                                name="filterOption"
                                value={value}
                                checked={filterOption === value}
                                onChange={() => handleFilterChange(value)}
                                className={`radio radio-xs ${value === "all" ? "radio-primary" : value === "1" ? "radio-success" : "radio-error"}`}
                              />
                              {value === "all" ? (
                                <span className="text-xs">All</span>
                              ) : value === "1" ? (
                                <ThumbsUpIcon size={12} />
                              ) : (
                                <ThumbsDownIcon size={12} />
                              )}
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-base-content mb-2 text-center">
                          {`The ${filterOption === "all" ? "All" : filterOption === "1" ? "Good" : "Bad"} User feedback for the agent is ${userFeedbackCount?.[filterOption === "all" ? 0 : filterOption === "1" ? 1 : 2]}`}
                        </p>

                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs">Show Error Chat History</span>
                          <input
                            autoComplete="off"
                            data-testid="history-sidebar-error-toggle"
                            id="history-sidebar-error-toggle"
                            type="checkbox"
                            className="toggle toggle-xs"
                            checked={isErrorTrue}
                            onChange={() => handleCheckError(!isErrorTrue)}
                          />
                        </div>
                      </div>

                      <div
                        className={`p-2 w-full min-w-0 ${isAnalytics ? "bg-[#F8FAFC] dark:bg-base-100" : "bg-base-100"}`}
                      >
                        <p className="text-center mb-2 text-xs font-medium">Search by Fields</p>
                        <p className="text-xs text-base-content/60 mb-2">
                          Fill in values for fields you want to search. Leave empty to skip that field.
                        </p>
                        <div className="flex flex-col gap-2">
                          {Object.keys(HISTORY_FILTER_BY_FIELDS)
                            .filter((k) => k !== "variables")
                            .map((fieldKey) => (
                              <div key={fieldKey} className="flex flex-col gap-0.5">
                                <label className="text-xs text-base-content/70 capitalize">
                                  {fieldKey.replace(/_/g, " ")}
                                </label>
                                <input
                                  autoComplete="off"
                                  data-testid={`history-sidebar-filter-by-${fieldKey}`}
                                  type="text"
                                  className="input input-xs input-bordered w-full text-xs"
                                  placeholder={`Search ${fieldKey.replace(/_/g, " ")}...`}
                                  value={filterByFields[fieldKey] || ""}
                                  onChange={(e) =>
                                    setFilterByFields((prev) => ({ ...prev, [fieldKey]: e.target.value }))
                                  }
                                />
                              </div>
                            ))}
                          <div className="flex flex-col gap-0.5">
                            <label className="text-xs text-base-content/70 capitalize">variables</label>
                            <div className="flex gap-1 w-full min-w-0">
                              <input
                                autoComplete="off"
                                data-testid="history-sidebar-filter-by-variable-key"
                                type="text"
                                className="input input-xs input-bordered flex-1 min-w-0 text-xs"
                                placeholder="key"
                                value={variableKey}
                                onChange={(e) => setVariableKey(e.target.value)}
                              />
                              <input
                                autoComplete="off"
                                data-testid="history-sidebar-filter-by-variable-value"
                                type="text"
                                className="input input-xs input-bordered flex-1 min-w-0 text-xs"
                                placeholder="value"
                                value={variableValue}
                                onChange={(e) => setVariableValue(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          data-testid="history-sidebar-filter-by-apply"
                          id="history-sidebar-filter-by-apply"
                          disabled={
                            !Object.entries(filterByFields)
                              .filter(([k]) => k !== "variables")
                              .some(([, v]) => v && v.trim() !== "") &&
                            !variableKey.trim() &&
                            !variableValue.trim()
                          }
                          className="btn btn-primary btn-xs w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => {
                            const filterBy = { ...filterByFields };
                            if (variableValue.trim()) {
                              filterBy.variables = { [variableKey.trim() || "value"]: variableValue.trim() };
                            } else {
                              delete filterBy.variables;
                            }
                            handleSearchInternal(null, searchRef?.current?.value || "", filterBy);
                          }}
                        >
                          Apply Filter
                        </button>
                        <button
                          data-testid="history-sidebar-filter-by-reset"
                          id="history-sidebar-filter-by-reset"
                          className="btn btn-ghost btn-xs w-full mt-1"
                          onClick={() => {
                            setFilterByFields({ ...HISTORY_FILTER_BY_FIELDS, variables: {} });
                            setVariableKey("");
                            setVariableValue("");
                            clearInput();
                          }}
                        >
                          Reset Fields
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center">
                <select
                  data-testid="history-sidebar-version-select"
                  id="history-sidebar-version-select"
                  className="select select-bordered select-sm rounded-lg w-full text-xs"
                  value={selectedVersion}
                  onChange={handleVersionChange}
                >
                  <option value="all">All Versions</option>
                  {bridgeVersionsArray?.map((version, index) => (
                    <option key={version} value={version}>
                      Version {index + 1}
                    </option>
                  ))}
                </select>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isAnalytics) {
                    if (typeof handleSearch === "function") {
                      handleSearch(searchRef?.current?.value || "");
                    }
                    return;
                  }
                  let pf;
                  try {
                    pf = JSON.parse(filterByText);
                  } catch {}
                  handleSearchInternal(e, searchRef?.current?.value || "", pf);
                }}
                className="relative"
              >
                <input
                  autoComplete="off"
                  data-testid="history-sidebar-search-input"
                  id="history-sidebar-search-input"
                  type="text"
                  ref={searchRef}
                  placeholder="Search..."
                  onChange={(e) => handleChange(e)}
                  className="input input-bordered input-sm rounded-lg w-full pr-6 text-xs"
                />
                {searchQuery && (
                  <X
                    data-testid="history-sidebar-search-clear"
                    id="history-sidebar-search-clear"
                    onClick={clearInput}
                    size={18}
                    className="absolute right-2 top-2 cursor-pointer"
                  />
                )}
              </form>
            </div>
            <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay"></label>

            {/* Fixed: Render search loader at the top level, not inside InfiniteScroll */}
            <div className="flex-1 overflow-y-auto" id="sidebar">
              {historyData.length === 0 &&
              (loading || searchLoading || (isAnalytics && analyticsThreads === undefined)) ? (
                isAnalytics ? (
                  <AnalyticsThreadListSkeleton />
                ) : (
                  <div className="flex justify-center items-center bg-base-200 h-full">
                    <span className="loading loading-spinner loading-md"></span>
                  </div>
                )
              ) : historyData.length === 0 ? (
                <NoDataFound />
              ) : (
                <InfiniteScroll
                  dataLength={historyData.length}
                  next={fetchMoreData}
                  hasMore={hasMore}
                  loader={
                    loading || searchLoading ? (
                      <div className="flex justify-center items-center py-4">
                        <span className="loading loading-spinner loading-sm"></span>
                      </div>
                    ) : null
                  }
                  scrollableTarget="sidebar"
                >
                  <div className="slider-container min-w-[45%] w-full overflow-x-auto pb-20">
                    {Object.keys(groupHistoryByDate(historyData)).map((dateGroup) => {
                      const items = groupHistoryByDate(historyData)[dateGroup];
                      return (
                        <div key={dateGroup} className="mb-1">
                          <div
                            className={`flex items-center gap-2 px-3 pt-1 pb-1 sticky top-0 z-10 ${isAnalytics ? "bg-white dark:bg-base-200" : "bg-base-200"}`}
                          >
                            <span className="text-[9px] font-bold uppercase tracking-widest text-base-content/50">
                              {dateGroup}
                            </span>
                            <div
                              className={`flex-1 h-px ${isAnalytics ? "bg-gray-200 dark:bg-base-300" : "bg-base-300"}`}
                            />
                          </div>
                          <ul
                            className={`min-h-full text-base-content flex flex-col space-y-2 px-2 pb-1 ${!isAnalytics ? "menu" : ""}`}
                          >
                            {items.map((item) => (
                              <div className="flex-col" key={item?.thread_id}>
                                <div className="flex flex-col">
                                  {isAnalytics ? (
                                    <div
                                      data-testid={`history-sidebar-thread-${item?.thread_id}`}
                                      id={`history-sidebar-thread-${item?.thread_id}`}
                                      className={`flex-grow cursor-pointer group rounded-lg overflow-hidden transition-colors duration-200 ${
                                        isSidebarThreadActive(item?.thread_id)
                                          ? "bg-[#EBF4FE] text-blue-900 border border-blue-200 dark:bg-primary dark:text-base-100 dark:border-primary/40 dark:hover:text-base-100 dark:hover:bg-primary shadow-md"
                                          : "hover:bg-base-300/50"
                                      }`}
                                      onClick={() => {
                                        const isCurrentlySelected = isSidebarThreadActive(item?.thread_id);
                                        if (searchQuery) {
                                          if (isCurrentlySelected) {
                                            onAnalyticsSidebarSelect?.(null, null);
                                          } else {
                                            setSearchMessageId(null);
                                            dispatch(clearThreadData());
                                            dispatch(clearRecursiveHistory());
                                            threadHandler(item?.thread_id, item);
                                          }
                                          return;
                                        }
                                        if (isCurrentlySelected) {
                                          handleToggleThread(item?.thread_id);
                                        } else {
                                          setSearchMessageId(null);
                                          dispatch(clearThreadData());
                                          dispatch(clearRecursiveHistory());
                                          threadHandler(item?.thread_id, item);
                                        }
                                      }}
                                    >
                                      <div className="w-full h-full flex items-center justify-between relative px-2 py-1.5 gap-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <p
                                            className={`text-xs truncate ${
                                              isSidebarThreadActive(item?.thread_id)
                                                ? "text-blue-900 dark:text-base-100"
                                                : "text-base-content"
                                            }`}
                                          >
                                            {truncate(item?.thread_id, 22)}
                                          </p>
                                        </div>
                                        <span
                                          className={`text-xs whitespace-nowrap group-hover:hidden ${
                                            isSidebarThreadActive(item?.thread_id)
                                              ? "text-blue-900/70 dark:text-base-100/70"
                                              : "text-base-content/60"
                                          }`}
                                        >
                                          {formatRelativeTime(item?.updated_at || item?.created_at)}
                                        </span>
                                        <span
                                          className={`text-xs whitespace-nowrap font-medium hidden group-hover:inline ${
                                            isSidebarThreadActive(item?.thread_id)
                                              ? "text-blue-900/70 dark:text-base-100/70"
                                              : "text-base-content/60"
                                          }`}
                                        >
                                          {formatDate(item?.updated_at || item?.created_at)}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <li
                                      data-testid={`history-sidebar-thread-${item?.thread_id}`}
                                      id={`history-sidebar-thread-${item?.thread_id}`}
                                      className={`${
                                        decodeURIComponent(searchParams?.thread_id) === item?.thread_id
                                          ? "text-base-100 bg-primary hover:text-base-100 hover:bg-primary shadow-md"
                                          : "hover:bg-base-300/50 transition-colors duration-200"
                                      } flex-grow cursor-pointer group`}
                                      onClick={() => {
                                        const isCurrentlySelected =
                                          decodeURIComponent(searchParams?.thread_id) === item?.thread_id;
                                        if (isCurrentlySelected && !searchQuery) {
                                          handleToggleThread(item?.thread_id);
                                        } else {
                                          dispatch(clearThreadData());
                                          dispatch(clearRecursiveHistory());
                                          threadHandler(item?.thread_id, item);
                                        }
                                      }}
                                    >
                                      <a className="w-full h-full flex flex-col relative px-2 py-1.5">
                                        {bridgeType?.toLowerCase() === "chatbot" || bridgeType === "chatbot" ? (
                                          <div
                                            className={`flex items-start gap-1 mb-1 w-full justify-between group ${
                                              decodeURIComponent(searchParams?.thread_id) === item?.thread_id ? "" : ""
                                            }`}
                                          >
                                            <p
                                              className={`text-xs truncate ${
                                                decodeURIComponent(searchParams?.thread_id) === item?.thread_id
                                                  ? "text-base-100"
                                                  : "text-base-content"
                                              }`}
                                            >
                                              {truncate(item?.thread_id, 22)}
                                            </p>
                                            <span
                                              className={`text-xs whitespace-nowrap group-hover:hidden ${
                                                decodeURIComponent(searchParams?.thread_id) === item?.thread_id
                                                  ? "text-base-100"
                                                  : "text-base-content"
                                              }`}
                                            >
                                              {formatRelativeTime(item?.updated_at || item?.created_at)}
                                            </span>
                                            <span
                                              className={`text-xs whitespace-nowrap font-medium hidden group-hover:inline ${
                                                decodeURIComponent(searchParams?.thread_id) === item?.thread_id
                                                  ? "text-base-100"
                                                  : "text-base-content"
                                              }`}
                                            >
                                              {formatDate(item?.updated_at || item?.created_at)}
                                            </span>
                                          </div>
                                        ) : (
                                          <div
                                            className={`flex items-start gap-1 mb-1 w-full group ${
                                              decodeURIComponent(searchParams?.thread_id) === item?.thread_id ? "" : ""
                                            }`}
                                          >
                                            <span
                                              className={`text-xs whitespace-nowrap group-hover:hidden ${
                                                decodeURIComponent(searchParams?.thread_id) === item?.thread_id
                                                  ? "text-base-100"
                                                  : "text-base-content"
                                              }`}
                                            >
                                              {formatRelativeTime(item?.updated_at || item?.created_at)}
                                            </span>
                                            <span
                                              className={`text-xs whitespace-nowrap group-hover:inline ${
                                                decodeURIComponent(searchParams?.thread_id) === item?.thread_id
                                                  ? "text-base-100"
                                                  : "text-base-content"
                                              }`}
                                            >
                                              {formatDate(item?.updated_at || item?.created_at)}
                                            </span>
                                          </div>
                                        )}
                                      </a>
                                    </li>
                                  )}
                                  {isSidebarThreadActive(item?.thread_id) && (
                                    <div className="space-y-3">
                                      <div
                                        key={item.id}
                                        className={
                                          isAnalytics
                                            ? "overflow-hidden rounded-b-lg border-x border-b border-blue-100 bg-[#F8FAFC] dark:bg-base-100 dark:border-base-300"
                                            : "shadow-sm bg-base-100 overflow-hidden"
                                        }
                                      >
                                        {item?.sub_thread &&
                                          item.sub_thread?.length > 0 &&
                                          !(isAnalytics && selectedThreadId) && (
                                            <div className={isAnalytics ? "bg-transparent" : "bg-base-100"}>
                                              <div className="p-2">
                                                <div className="space-y-1.5">
                                                  {item?.sub_thread?.map((subThread, index) => (
                                                    <div key={index}>
                                                      {isAnalytics ? (
                                                        <div
                                                          data-testid={`history-sidebar-search-subthread-${subThread?.sub_thread_id}`}
                                                          id={`history-sidebar-search-subthread-${subThread?.sub_thread_id}`}
                                                          className={`ml-2 ${
                                                            isSidebarSubThreadActive(subThread?.sub_thread_id)
                                                              ? "cursor-pointer rounded-md px-2 py-1.5 transition-all duration-200 text-xs bg-[#EBF4FE] text-blue-900 border border-blue-200 dark:bg-primary dark:text-base-100 dark:border-primary/40 shadow-sm"
                                                              : "cursor-pointer rounded-md px-2 py-1.5 transition-all duration-200 text-xs text-base-content hover:bg-white hover:border-blue-100 border border-transparent dark:hover:bg-base-300"
                                                          } flex-grow group`}
                                                          onClick={() =>
                                                            handleSelectSubThread(
                                                              subThread?.sub_thread_id,
                                                              item?.thread_id
                                                            )
                                                          }
                                                        >
                                                          <div className="w-full h-full flex items-center justify-between relative gap-2">
                                                            <span className="truncate flex-1 text-xs flex items-center min-w-0">
                                                              <MessageCircleIcon
                                                                className={`w-3 h-3 mr-1.5 flex-shrink-0 ${
                                                                  isSidebarSubThreadActive(subThread?.sub_thread_id)
                                                                    ? "text-blue-700 dark:text-base-100"
                                                                    : "text-blue-500 dark:text-base-content"
                                                                }`}
                                                              />
                                                              {truncate(
                                                                subThread?.display_name || subThread?.sub_thread_id,
                                                                20
                                                              )}
                                                            </span>
                                                            {(subThread?.updated_at || subThread?.created_at) && (
                                                              <>
                                                                <span
                                                                  className={`text-[10px] whitespace-nowrap group-hover:hidden ${
                                                                    isSidebarSubThreadActive(subThread?.sub_thread_id)
                                                                      ? "text-blue-700/70 dark:text-base-100/70"
                                                                      : "text-base-content/50"
                                                                  }`}
                                                                >
                                                                  {formatRelativeTime(subThread?.updated_at)}
                                                                </span>
                                                                <span
                                                                  className={`text-[10px] whitespace-nowrap hidden group-hover:inline ${
                                                                    isSidebarSubThreadActive(subThread?.sub_thread_id)
                                                                      ? "text-blue-700/70 dark:text-base-100/70"
                                                                      : "text-base-content/50"
                                                                  }`}
                                                                >
                                                                  {formatDate(
                                                                    subThread?.created_at || subThread?.created_at
                                                                  )}
                                                                </span>
                                                              </>
                                                            )}
                                                          </div>
                                                        </div>
                                                      ) : (
                                                        <li
                                                          data-testid={`history-sidebar-search-subthread-${subThread?.sub_thread_id}`}
                                                          id={`history-sidebar-search-subthread-${subThread?.sub_thread_id}`}
                                                          className={`ml-4 ${
                                                            isSidebarSubThreadActive(subThread?.sub_thread_id)
                                                              ? "cursor-pointer hover:bg-base-primary hover:text-base-100 transition-all duration-200 text-xs bg-primary text-base-100"
                                                              : "cursor-pointer hover:bg-base-300 hover:text-base-content transition-all duration-200 text-xs"
                                                          } flex-grow group`}
                                                          onClick={() =>
                                                            handleSelectSubThread(
                                                              subThread?.sub_thread_id,
                                                              item?.thread_id
                                                            )
                                                          }
                                                        >
                                                          <a className="w-full h-full flex items-center justify-between relative">
                                                            <span className="truncate flex-1 mr-1.5 text-xs flex items-center">
                                                              <MessageCircleIcon
                                                                className={`w-3 h-3 mr-1.5 flex-shrink-0 ${
                                                                  isSidebarSubThreadActive(subThread?.sub_thread_id)
                                                                    ? "text-base-100"
                                                                    : "text-base-content"
                                                                }`}
                                                              />
                                                              {truncate(
                                                                subThread?.display_name || subThread?.sub_thread_id,
                                                                20
                                                              )}
                                                            </span>
                                                            {(subThread?.updated_at || subThread?.created_at) && (
                                                              <>
                                                                <span className="group-hover:hidden">
                                                                  {formatRelativeTime(subThread?.updated_at)}
                                                                </span>
                                                                <span className="hidden group-hover:inline">
                                                                  {formatDate(
                                                                    subThread?.created_at || subThread?.created_at
                                                                  )}
                                                                </span>
                                                              </>
                                                            )}
                                                          </a>
                                                        </li>
                                                      )}
                                                      {subThread?.messages?.length > 0 && (
                                                        <div
                                                          className={`mt-1.5 space-y-1 ${isAnalytics ? "ml-3 pl-2 border-l border-blue-100 dark:border-base-300" : "mt-2 ml-4 space-y-2"}`}
                                                        >
                                                          {subThread?.messages?.map((msg, msgIndex) => (
                                                            <div
                                                              data-testid={`history-sidebar-message-${msg?.message_id}`}
                                                              id={`history-sidebar-message-${msg?.message_id}`}
                                                              key={msgIndex}
                                                              onClick={() => handleSetMessageId(msg?.message_id)}
                                                              className={
                                                                isAnalytics
                                                                  ? `${
                                                                      isSidebarMessageActive(msg?.message_id)
                                                                        ? "cursor-pointer rounded-md px-2 py-1.5 transition-all duration-200 text-xs bg-[#EBF4FE] text-blue-900 border border-blue-200 dark:bg-primary dark:text-base-100 dark:border-primary/40"
                                                                        : "cursor-pointer rounded-md px-2 py-1.5 transition-all duration-200 text-xs bg-white text-blue-900/80 border border-blue-100 hover:bg-[#EBF4FE]/60 hover:border-blue-200 dark:bg-base-200 dark:text-base-content dark:border-base-300"
                                                                    }`
                                                                  : "cursor-pointer transition-all duration-200 text-xs bg-base-100 hover:bg-base-200 text-base-content border-l-2 border-transparent hover:border-base-300"
                                                              }
                                                            >
                                                              <div className="flex items-start gap-1.5">
                                                                <UserIcon
                                                                  className={`w-2.5 h-2.5 mt-0.5 flex-shrink-0 ${
                                                                    isAnalytics
                                                                      ? isSidebarMessageActive(msg?.message_id)
                                                                        ? "text-blue-700 dark:text-base-100"
                                                                        : "text-blue-400 dark:text-base-content"
                                                                      : "text-base-content"
                                                                  }`}
                                                                />
                                                                <span className="leading-snug">
                                                                  {truncate(msg?.message, 35)}
                                                                </span>
                                                              </div>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        {item?.message && item?.message?.length > 0 && (
                                          <div className="p-2 pt-0">
                                            <div className={`space-y-1 ${isAnalytics ? "ml-1" : "space-y-1.5 ml-2"}`}>
                                              {item?.message?.map((msg, index) => (
                                                <div
                                                  data-testid={`history-sidebar-thread-message-${msg?.message_id}`}
                                                  id={`history-sidebar-thread-message-${msg?.message_id}`}
                                                  key={index}
                                                  onClick={() => handleSetMessageId(msg?.message_id)}
                                                  className={
                                                    isAnalytics
                                                      ? `${
                                                          isSidebarMessageActive(msg?.message_id)
                                                            ? "cursor-pointer rounded-md px-2 py-1.5 transition-all duration-200 text-xs bg-[#EBF4FE] text-blue-900 border border-blue-200 dark:bg-primary dark:text-base-100 dark:border-primary/40"
                                                            : "cursor-pointer rounded-md px-2 py-1.5 transition-all duration-200 text-xs bg-white text-blue-900/80 border border-blue-100 hover:bg-[#EBF4FE]/60 hover:border-blue-200 dark:bg-base-200 dark:text-base-content dark:border-base-300"
                                                        }`
                                                      : "cursor-pointer p-2 transition-all duration-200 text-xs bg-base-100 hover:bg-base-200 text-base-content border-l-2 border-transparent hover:border-base-300"
                                                  }
                                                >
                                                  <div className="flex items-start gap-1.5">
                                                    <UserIcon
                                                      className={`w-2.5 h-2.5 mt-0.5 flex-shrink-0 ${
                                                        isAnalytics
                                                          ? isSidebarMessageActive(msg?.message_id)
                                                            ? "text-blue-700 dark:text-base-100"
                                                            : "text-blue-400 dark:text-base-content"
                                                          : "text-base-content"
                                                      }`}
                                                    />
                                                    <span className="leading-snug">{truncate(msg?.message, 32)}</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </InfiniteScroll>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
);

export default Sidebar;
