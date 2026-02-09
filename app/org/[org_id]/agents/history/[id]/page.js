"use client";

import React, { use, useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getHistoryAction } from "@/store/action/historyAction";
import { clearThreadData, clearHistoryData, setSelectedVersion } from "@/store/reducer/historyReducer";
import Protected from "@/components/Protected";
import ChatDetails from "@/components/historyPageComponents/ChatDetails";
import { ChatLoadingSkeleton } from "@/components/historyPageComponents/ChatLayoutLoader";

// Lazy load the components to reduce initial render time
const ThreadContainer = React.lazy(() => import("@/components/historyPageComponents/ThreadContainer"));
const Sidebar = React.lazy(() => import("@/components/historyPageComponents/Sidebar"));

export const runtime = "edge";
function Page({ params, searchParams }) {
  const resolvedSearchParams = use(searchParams);
  const resolvedParams = use(params);
  const search = useSearchParams();
  const router = useRouter();
  const pathName = usePathname();
  const dispatch = useDispatch();
  const sidebarRef = useRef(null);
  const searchRef = useRef();
  const { historyData, thread, selectedVersion, previousPrompt } = useCustomSelector((state) => ({
    historyData: state?.historyReducer?.history || [],
    thread: state?.historyReducer?.thread || [],
    selectedVersion: state?.historyReducer?.selectedVersion || "all",
    previousPrompt:
      state?.bridgeReducer?.bridgeVersionMapping?.[resolvedParams?.id]?.[resolvedSearchParams?.version]?.configuration
        ?.prompt || "",
  }));
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchMessageId, setSearchMessageId] = useState(null);
  const [filterOption, setFilterOption] = useState("all");
  const [threadPage, setThreadPage] = useState(1);
  const [hasMoreThreadData, setHasMoreThreadData] = useState(true);
  const [isErrorTrue, setIsErrorTrue] = useState(false);

  const closeSliderOnEsc = useCallback((event) => {
    if (event.key === "Escape") setIsSliderOpen(false);
  }, []);

  const handleClickOutside = useCallback((event) => {
    if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
      setIsSliderOpen(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      const cleanUrl = new URL(window.location.href);
      const version = search.get("version");
      const type = search.get("type");

      // Preserve both version and type parameters
      let params = [];
      if (version) params.push(`version=${version}`);
      if (type) params.push(`type=${type}`);

      cleanUrl.search = params.length ? `?${params.join("&")}` : "";
      window.history.replaceState({}, "", cleanUrl);
      dispatch(clearThreadData());
      dispatch(clearHistoryData());
      dispatch(setSelectedVersion("all"));
    };
  }, []);

  useEffect(() => {
    const handleEvents = (action) => {
      document[`${action}EventListener`]("keydown", closeSliderOnEsc);
      document[`${action}EventListener`]("mousedown", handleClickOutside);
    };
    handleEvents("add");
    return () => handleEvents("remove");
  }, [closeSliderOnEsc, handleClickOutside]);

  useEffect(() => {
    const fetchInitialData = async (resolvedParams, resolvedSearchParams) => {
      setLoading(true);
      dispatch(clearThreadData());
      const startDate = resolvedSearchParams?.start;
      const endDate = resolvedSearchParams?.end;
      const keyword = searchRef.current?.value || "";
      const result = await dispatch(
        getHistoryAction(resolvedParams.id, 1, filterOption, isErrorTrue, selectedVersion, keyword, startDate, endDate)
      );

      if (resolvedSearchParams?.thread_id) {
        const threadId = resolvedSearchParams?.thread_id;
        const thread = result?.find((item) => item?.thread_id === threadId);
        if (thread) {
          const messageId = resolvedSearchParams?.message_id;
          router.push(
            `${pathName}?version=${resolvedSearchParams.version}&thread_id=${threadId}&start=${startDate || ""}&end=${endDate || ""}${messageId ? `&message_id=${messageId}` : ""}&type=${resolvedSearchParams.type}&type=${resolvedSearchParams.type}`,
            undefined,
            { shallow: true }
          );
        }
      } else if (!resolvedSearchParams?.thread_id && result?.length > 0) {
        const firstThreadId = result[0]?.thread_id;
        if (firstThreadId) {
          const messageId = resolvedSearchParams?.message_id;
          router.push(
            `${pathName}?version=${resolvedSearchParams.version}&thread_id=${firstThreadId}&start=${startDate || ""}&end=${endDate || ""}${messageId ? `&message_id=${messageId}` : ""}&type=${resolvedSearchParams.type}&type=${resolvedSearchParams.type}`,
            undefined,
            { shallow: true }
          );
        }
      }
      if (isErrorTrue) {
        const firstThreadId = result[0]?.thread_id;
        if (firstThreadId) {
          const messageId = resolvedSearchParams?.message_id;
          router.push(
            `${pathName}?version=${resolvedSearchParams.version}&thread_id=${firstThreadId}&subThread_id=${firstThreadId}&error=true${messageId ? `&message_id=${messageId}` : ""}&type=${resolvedSearchParams.type}`,
            undefined,
            { shallow: true }
          );
        }
      }
      setLoading(false);
    };
    fetchInitialData(resolvedParams, resolvedSearchParams);
  }, [resolvedParams.id, filterOption, selectedVersion]);

  const threadHandler = useCallback(
    async (thread_id, item, value) => {
      // Determine role based on new data structure
      const getItemRole = () => {
        if (item?.tools_call_data && item.tools_call_data.length > 0) return "tools_call";
        if (item?.error) return "error";
        if (item?.user || item?.user_urls?.length > 0) return "user";
        if (item?.llm_message || item?.chatbot_message || item?.updated_llm_message) return "assistant";
        return "unknown";
      };

      const currentRole = getItemRole();

      // Don't handle assistant messages
      if (currentRole === "assistant") return;

      // Handle user and tools_call messages
      if (currentRole === "user" || currentRole === "tools_call" || currentRole === "error") {
        try {
          setSelectedItem({ variables: item.variables, ...item, value });
          if (value === "system Prompt" || value === "more" || item?.[value] === null) setIsSliderOpen(true);
        } catch (error) {
          console.error("Failed to fetch single message:", error);
        }
      } else {
        // Handle other cases (navigation)
        const start = search.get("start");
        const end = search.get("end");
        const messageId = search.get("message_id");
        const encodedThreadId = encodeURIComponent(thread_id.replace(/&/g, "%26"));
        router.push(
          `${pathName}?version=${resolvedSearchParams.version}&thread_id=${encodedThreadId}&subThread_id=${encodedThreadId}&start=${start || ""}&end=${end || ""}${messageId ? `&message_id=${messageId}` : ""}&type=${resolvedSearchParams.type}&type=${resolvedSearchParams.type}`,
          undefined,
          { shallow: true }
        );
      }
    },
    [pathName, resolvedParams.id, resolvedSearchParams.version, resolvedSearchParams?.start, resolvedSearchParams?.end]
  );

  const fetchMoreData = useCallback(async () => {
    const nextPage = page + 1;
    setPage(nextPage);

    // Retrieve current search/filter state
    const startDate = search.get("start");
    const endDate = search.get("end");
    const keyword = searchRef.current?.value || "";

    const result = await dispatch(
      getHistoryAction(
        resolvedParams.id,
        nextPage,
        filterOption, // Use filterOption from state
        isErrorTrue, // Use isErrorTrue from state
        selectedVersion,
        keyword,
        startDate,
        endDate
      )
    );
    if (result?.length < 40) setHasMore(false);
  }, [page, resolvedParams.id]);

  if (loading || !historyData)
    return (
      <div>
        <ChatLoadingSkeleton />
      </div>
    );

  return (
    <div className="bg-base-100 relative scrollbar-hide text-base-content max-h-[calc(100vh-9rem)]">
      <div className="drawer drawer-open overflow-hidden">
        <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
        {loading ? (
          <ChatLoadingSkeleton />
        ) : (
          <div className="drawer-content flex flex-col">
            <React.Suspense>
              <ThreadContainer
                key={`thread-container-${resolvedParams.id}-${resolvedParams.version}`}
                thread={thread}
                filterOption={filterOption}
                setFilterOption={setFilterOption}
                isFetchingMore={isFetchingMore}
                setIsFetchingMore={setIsFetchingMore}
                setLoading={setLoading}
                searchMessageId={searchMessageId}
                setSearchMessageId={setSearchMessageId}
                params={resolvedParams}
                pathName={pathName}
                search={resolvedSearchParams}
                historyData={historyData}
                threadHandler={threadHandler}
                threadPage={threadPage}
                setThreadPage={setThreadPage}
                hasMoreThreadData={hasMoreThreadData}
                setHasMoreThreadData={setHasMoreThreadData}
                selectedVersion={selectedVersion}
                setIsErrorTrue={setIsErrorTrue}
                isErrorTrue={isErrorTrue}
                previousPrompt={previousPrompt}
              />
            </React.Suspense>
          </div>
        )}
        <React.Suspense>
          <Sidebar
            historyData={historyData}
            threadHandler={threadHandler}
            fetchMoreData={fetchMoreData}
            hasMore={hasMore}
            loading={loading}
            params={resolvedParams}
            searchParams={resolvedSearchParams}
            setSearchMessageId={setSearchMessageId}
            setPage={setPage}
            setHasMore={setHasMore}
            filterOption={filterOption}
            setFilterOption={setFilterOption}
            searchRef={searchRef}
            setIsFetchingMore={setIsFetchingMore}
            setThreadPage={setThreadPage}
            threadPage={threadPage}
            hasMoreThreadData={hasMoreThreadData}
            setHasMoreThreadData={setHasMoreThreadData}
            selectedVersion={selectedVersion}
            setIsErrorTrue={setIsErrorTrue}
            isErrorTrue={isErrorTrue}
          />
        </React.Suspense>
      </div>
      <ChatDetails selectedItem={selectedItem} setIsSliderOpen={setIsSliderOpen} isSliderOpen={isSliderOpen} />
    </div>
  );
}

export default Protected(Page);
