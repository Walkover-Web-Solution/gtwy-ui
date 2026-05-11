import { useCustomSelector } from "@/customHooks/customSelector.js";
import { getHistoryAction, getSubThreadsAction } from "@/store/action/historyAction.js";
import { clearSubThreadData, clearThreadData, setSelectedVersion } from "@/store/reducer/historyReducer.js";
import { USER_FEEDBACK_FILTER_OPTIONS, HISTORY_FILTER_BY_FIELDS } from "@/utils/enums.js";
import { formatDate, formatRelativeTime } from "@/utils/utility.js";
import { ThumbsDownIcon, ThumbsUpIcon, UserIcon, MessageCircleIcon } from "@/components/Icons";
import { useEffect, useState, memo, useCallback } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import CreateFineTuneModal from "../modals/CreateFineTuneModal.js";
import DateRangePicker from "./DateRangePicker.js";
import { usePathname, useRouter } from "next/navigation.js";
import { FileTextIcon, X } from "lucide-react";

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
  }) => {
    const { subThreads, userFeedbackCount, bridgeVersionsArray, allBridgesMap, bridgeVersionMapping } =
      useCustomSelector((state) => ({
        subThreads: Array.isArray(state?.historyReducer?.subThreads) ? state.historyReducer.subThreads : [],
        userFeedbackCount: state?.historyReducer?.userFeedbackCount,
        bridgeVersionsArray: Array.isArray(state?.bridgeReducer?.allBridgesMap?.[params?.id]?.versions)
          ? state.bridgeReducer.allBridgesMap[params.id].versions
          : [],
        allBridgesMap: state?.bridgeReducer?.allBridgesMap || {},
        bridgeVersionMapping: state?.bridgeReducer?.bridgeVersionMapping || {},
      }));

    const [selectedThreadIds, _setSelectedThreadIds] = useState([]);
    const [expandedThreads, setExpandedThreads] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [filterByFields, setFilterByFields] = useState({ ...HISTORY_FILTER_BY_FIELDS, variables: {} });
    const [variableKey, setVariableKey] = useState("");
    const [variableValue, setVariableValue] = useState("");
    const isBridgeStateless = (bridgeId) => {
      const bridgeInfo = allBridgesMap?.[bridgeId];
      const versions = bridgeInfo?.versions || [];
      const vMapping = bridgeVersionMapping?.[bridgeId] || {};
      return versions.some((vId) => vMapping?.[vId]?.settings?.stateless_conversation === true);
    };

    const isThreadSingleQuery = (item) => {
      if (!isBridgeStateless(params?.id)) return false;
      // For the currently expanded thread, check actual subthread count from reducer
      if (decodeURIComponent(searchParams?.thread_id) === item?.thread_id) {
        return subThreads.length <= 1;
      }
      // For other threads, assume single query since we don't have their subthread count
      return true;
    };
    const searchQuery = (searchRef?.current && searchRef.current.value) || searchParams?.message_id || "";
    const dispatch = useDispatch();
    const pathName = usePathname();
    const router = useRouter();

    useEffect(() => {
      if (
        expandedThreads?.length &&
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
    }, [subThreads, expandedThreads, searchParams?.thread_id, searchParams?.subThread_id]);

    const handleVersionChange = async (event) => {
      const version = event.target.value;
      dispatch(clearSubThreadData());
      dispatch(setSelectedVersion(version));
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
      }
    }, [searchParams?.thread_id]);

    useEffect(() => {
      const p = new URLSearchParams(window.location.search);
      const liveVersion = p.get("version");
      const liveThreadId = p.get("thread_id");
      const versionMismatch = selectedVersion !== "all" && liveVersion !== selectedVersion;
      if (!liveThreadId || !liveVersion || versionMismatch) {
        return;
      }
      if (subThreads?.length > 0) {
        const firstSubThreadId = subThreads[0]?.sub_thread_id;
        if (firstSubThreadId) {
          const url = `${pathName}?version=${liveVersion}&thread_id=${liveThreadId}&subThread_id=${firstSubThreadId}&start=${p.get("start") || ""}&end=${p.get("end") || ""}${p.get("message_id") ? `&message_id=${p.get("message_id")}` : ""}&type=${p.get("type") || ""}`;
          router.push(url, undefined, { shallow: true });
        }
      }
    }, [subThreads, selectedVersion]);
    const debounce = (func, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      };
    };
    useEffect(() => {
      if (searchParams?.message_id) {
        // Set the search query state and input value
        if (searchRef?.current) {
          searchRef.current.value = searchParams.message_id;
        }
        handleChange();
      }
    }, [searchParams?.message_id]);
    const handleChange = useCallback(
      debounce((e) => {
        const value = e?.target?.value.trim() || searchParams?.message_id || "";
        const filterBy = { ...filterByFields };
        if (variableKey.trim() && variableValue.trim()) {
          filterBy.variables = { [variableKey.trim()]: variableValue.trim() };
        } else {
          delete filterBy.variables;
        }
        handleSearch(e, value, filterBy);
      }, 500),
      [searchParams?.message_id, filterByFields, variableKey, variableValue]
    );

    const handleSearch = async (e, directValue, filterBy) => {
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
      messageId ? setSearchMessageId(messageId) : toast.error("Message ID null or not found");
    };

    const handleSelectSubThread = async (subThreadId, threadId) => {
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
      if (isError === true) {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("error", "true");
        const queryString = newSearchParams.toString();
        await dispatch(getHistoryAction(params.id, 1, filterOption, true, selectedVersion));
        setThreadPage(1);
        setIsErrorTrue(true);
        setHasMore(true);
        dispatch(clearThreadData());
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
        className="drawer-side justify-items-stretch text-xs bg-base-200 w-[310px] min-w-[310px] max-w-[310px] border-r border-base-300 relative h-screen overflow-y-auto overflow-x-hidden"
        id="sidebar"
      >
        <CreateFineTuneModal params={params} selectedThreadIds={selectedThreadIds} />
        <div className="p-2 gap-2 flex flex-col w-full min-w-0">
          <div
            data-testid="history-sidebar-advance-filter"
            id="history-sidebar-advance-filter"
            className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-lg min-h-0 overflow-hidden"
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
              <div className="space-y-2 px-2 pb-2 w-full min-w-0">
                <DateRangePicker
                  params={params}
                  setFilterOption={setFilterOption}
                  setHasMore={setHasMore}
                  setPage={setPage}
                  selectedVersion={selectedVersion}
                  filterOption={filterOption}
                  isErrorTrue={isErrorTrue}
                />

                <div className="p-2 bg-base-200 rounded-lg">
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

                <div className="p-2 bg-base-200 rounded-lg w-full min-w-0">
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
                            type="text"
                            className="input input-xs input-bordered w-full text-xs"
                            placeholder={`Search ${fieldKey.replace(/_/g, " ")}...`}
                            value={filterByFields[fieldKey] || ""}
                            onChange={(e) => setFilterByFields((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                          />
                        </div>
                      ))}
                    <div className="flex flex-col gap-0.5">
                      <label className="text-xs text-base-content/70 capitalize">variables</label>
                      <div className="flex gap-1 w-full min-w-0">
                        <input
                          autoComplete="off"
                          type="text"
                          className="input input-xs input-bordered flex-1 min-w-0 text-xs"
                          placeholder="key"
                          value={variableKey}
                          onChange={(e) => setVariableKey(e.target.value)}
                        />
                        <input
                          autoComplete="off"
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
                      handleSearch(null, searchRef?.current?.value || "", filterBy);
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
          <div className="flex items-center">
            <select
              data-testid="history-sidebar-version-select"
              id="history-sidebar-version-select"
              className="select select-bordered select-sm w-full text-xs"
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
              let pf;
              try {
                pf = JSON.parse(filterByText);
              } catch {}
              handleSearch(e, searchRef?.current?.value || "", pf);
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
              className="input input-bordered input-sm w-full pr-6 text-xs"
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
        <div className="flex-1 overflow-hidden">
          {loading || searchLoading ? (
            <div className="flex justify-center items-center bg-base-200 h-full">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : historyData.length === 0 ? (
            <NoDataFound />
          ) : (
            <InfiniteScroll
              dataLength={historyData.length}
              next={fetchMoreData}
              hasMore={hasMore}
              loader={<h4></h4>}
              scrollableTarget="sidebar"
            >
              <div className="slider-container min-w-[45%] w-full overflow-x-auto pb-20">
                <ul className="menu min-h-full text-base-content flex flex-col space-y-1">
                  {historyData.map((item) => (
                    <div className={`${"flex-col"}`} key={item?.thread_id}>
                      <div className="flex flex-col">
                        <li
                          data-testid={`history-sidebar-thread-${item?.thread_id}`}
                          id={`history-sidebar-thread-${item?.thread_id}`}
                          className={`${
                            decodeURIComponent(searchParams?.thread_id) === item?.thread_id
                              ? "text-base-100 bg-primary hover:text-base-100 hover:bg-primary rounded-md"
                              : ""
                          } flex-grow cursor-pointer group`}
                          onClick={() => {
                            const isCurrentlySelected = decodeURIComponent(searchParams?.thread_id) === item?.thread_id;

                            if (isCurrentlySelected && !searchQuery) {
                              // If thread is already selected and no search query, toggle dropdown
                              handleToggleThread(item?.thread_id);
                            } else {
                              // Otherwise, select the thread
                              threadHandler(item?.thread_id);
                            }
                          }}
                        >
                          <a className="w-full h-full flex items-center justify-between relative">
                            {!isThreadSingleQuery(item) && (
                              <span className="truncate flex-1 mr-1.5 text-xs">{truncate(item?.thread_id, 30)}</span>
                            )}
                            <span className="group-hover:hidden">{formatRelativeTime(item?.updated_at)}</span>
                            <span className="hidden group-hover:inline">{formatDate(item?.updated_at)}</span>
                            {/* Tooltip for full thread ID on hover */}
                            {!isThreadSingleQuery(item) && item?.thread_id?.length > 35 && (
                              <div className="absolute left-0 top-full mt-1 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-low max-w-[260px] break-words shadow-lg pointer-events-none">
                                {item?.thread_id}
                              </div>
                            )}
                          </a>
                        </li>
                        {decodeURIComponent(searchParams?.thread_id) === item?.thread_id && (
                          <div className="space-y-3">
                            <div
                              key={item.id}
                              className="rounded-x-lg rounded-b-lg shadow-sm bg-base-100 overflow-hidden"
                            >
                              {item?.sub_thread && item.sub_thread?.length > 0 && (
                                <div className="bg-base-100">
                                  <div className="p-2">
                                    <div className="space-y-1.5">
                                      {item?.sub_thread?.map((subThread, index) => (
                                        <div key={index}>
                                          <li
                                            data-testid={`history-sidebar-search-subthread-${subThread?.sub_thread_id}`}
                                            id={`history-sidebar-search-subthread-${subThread?.sub_thread_id}`}
                                            className={`ml-4 ${
                                              decodeURIComponent(searchParams?.subThread_id) ===
                                              subThread?.sub_thread_id
                                                ? "cursor-pointer hover:bg-base-primary hover:text-base-100 rounded-md transition-all duration-200 text-xs bg-primary text-base-100"
                                                : "cursor-pointer hover:bg-base-300 hover:text-base-content rounded-md transition-all duration-200 text-xs"
                                            } flex-grow group`}
                                            onClick={() => handleSelectSubThread(subThread?.sub_thread_id)}
                                          >
                                            <a className="w-full h-full flex items-center justify-between relative">
                                              <span className="truncate flex-1 mr-1.5 text-xs flex items-center">
                                                <MessageCircleIcon
                                                  className={`w-3 h-3 mr-1.5 flex-shrink-0 ${
                                                    searchParams?.subThread_id === subThread?.sub_thread_id
                                                      ? "text-base-100"
                                                      : "text-base-content"
                                                  }`}
                                                />
                                                {truncate(subThread?.display_name || subThread?.sub_thread_id, 20)}
                                              </span>
                                              {(subThread?.updated_at || subThread?.created_at) && (
                                                <>
                                                  <span className="group-hover:hidden">
                                                    {formatRelativeTime(subThread?.updated_at)}
                                                  </span>
                                                  <span className="hidden group-hover:inline">
                                                    {formatDate(subThread?.created_at || subThread?.created_at)}
                                                  </span>
                                                </>
                                              )}
                                            </a>
                                          </li>
                                          {subThread?.messages?.length > 0 && (
                                            <div className="mt-2 ml-4 space-y-2">
                                              {subThread?.messages?.map((msg, msgIndex) => (
                                                <div
                                                  data-testid={`history-sidebar-message-${msg?.message_id}`}
                                                  id={`history-sidebar-message-${msg?.message_id}`}
                                                  key={msgIndex}
                                                  onClick={() => handleSetMessageId(msg?.message_id)}
                                                  className={`cursor-pointer rounded-md transition-all duration-200 text-xs bg-base-100 hover:bg-base-200 text-base-content border-l-2 border-transparent hover:border-base-300`}
                                                >
                                                  <div className="flex items-start gap-1.5">
                                                    <UserIcon className="w-2.5 h-2.5 mt-0.5 text-base-content" />
                                                    <span>{truncate(msg?.message, 35)}</span>
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
                                <div className="p-2">
                                  <div className="space-y-1.5 ml-2">
                                    {item?.message?.map((msg, index) => (
                                      <div
                                        data-testid={`history-sidebar-thread-message-${msg?.message_id}`}
                                        id={`history-sidebar-thread-message-${msg?.message_id}`}
                                        key={index}
                                        onClick={() => handleSetMessageId(msg?.message_id)}
                                        className={`cursor-pointer p-2 rounded-md transition-all duration-200 text-xs bg-base-100 hover:bg-base-200 text-base-content hover:text-gray-800 border-l-2 border-transparent hover:border-base-300`}
                                      >
                                        <div className="flex items-start gap-1.5">
                                          <UserIcon className="w-2.5 h-2.5 mt-0.5 text-base-content" />
                                          <span>{truncate(msg?.message, 32)}</span>
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
            </InfiniteScroll>
          )}
        </div>
      </div>
    );
  }
);

export default Sidebar;
