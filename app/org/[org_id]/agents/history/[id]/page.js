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
import { openModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import ChatAiConfigDeatilViewModal from "@/components/modals/ChatAiConfigDeatilViewModal";
import BatchSubthreadPanel from "@/components/historyPageComponents/BatchSubthreadPanel";

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
  const activeFilterByRef = useRef(undefined);
  const { historyData, thread, selectedVersion, previousPrompt, isSingleQuery } = useCustomSelector((state) => {
    const threadData = state?.historyReducer?.thread || [];
    const bridgeInfo = state?.bridgeReducer?.allBridgesMap?.[resolvedParams?.id];
    const isStateless = bridgeInfo?.settings?.stateless_conversation === true;
    const isEmbedUser = state?.appInfoReducer?.embedUserDetails?.isEmbedUser;

    return {
      historyData: state?.historyReducer?.history || [],
      thread: threadData,
      selectedVersion: state?.historyReducer?.selectedVersion || "all",
      previousPrompt:
        state?.bridgeReducer?.bridgeVersionMapping?.[resolvedParams?.id]?.[resolvedSearchParams?.version]?.configuration
          ?.prompt || "",
      isSingleQuery: !isEmbedUser && isStateless && threadData.filter((msg) => msg?.user).length <= 1,
    };
  });
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
  const [selectedBatchMessageId, setSelectedBatchMessageId] = useState(null);

  useEffect(() => {
    setSelectedBatchMessageId(null);
  }, [resolvedSearchParams?.thread_id]);

  useEffect(() => {
    if (selectedBatchMessageId !== null) return;
    if (!Array.isArray(thread) || thread.length === 0) return;
    // Ensure the loaded thread actually belongs to the currently selected thread_id
    // (prevents auto-selecting a batch from a stale thread when navigating)
    const currentThreadId = resolvedSearchParams?.thread_id;
    if (currentThreadId && thread[0]?.thread_id && thread[0].thread_id !== currentThreadId) return;
    const firstBatch = thread.find((msg) => msg?.batch_data?.batch_id);
    if (firstBatch) setSelectedBatchMessageId(firstBatch.message_id);
  }, [thread, selectedBatchMessageId, resolvedSearchParams?.thread_id]);

  const displayThread = selectedBatchMessageId
    ? thread.filter((msg) => msg?.message_id === selectedBatchMessageId)
    : thread;

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
      const version = search.get("version") || selectedVersion;
      const type = search.get("type") || resolvedSearchParams?.type || "";
      const messageId = resolvedSearchParams?.message_id;
      const firstThreadId = result?.[0]?.thread_id;
      if (firstThreadId) {
        if (isErrorTrue) {
          router.push(
            `${pathName}?version=${version}&thread_id=${firstThreadId}&subThread_id=${firstThreadId}&error=true${messageId ? `&message_id=${messageId}` : ""}&type=${type}`,
            undefined,
            { shallow: true }
          );
        } else {
          router.push(
            `${pathName}?version=${version}&thread_id=${firstThreadId}&start=${startDate || ""}&end=${endDate || ""}${messageId ? `&message_id=${messageId}` : ""}&type=${type}`,
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
          if (value === "AiConfig" || value === "Latency") {
            openModal(MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL);
          } else {
            const shouldOpenSidebar = value === "more" || item?.[value] === null;
            setIsSliderOpen(shouldOpenSidebar);
          }
        } catch (error) {
          console.error("Failed to fetch single message:", error);
        }
      } else {
        // Handle other cases (navigation)
        const start = search.get("start");
        const end = search.get("end");
        const messageId = search.get("message_id");
        const encodedThreadId = encodeURIComponent(thread_id.replace(/&/g, "%26"));
        const firstSubThreadId = item?.sub_thread?.[0]?.sub_thread_id || thread_id;
        const encodedSubThreadId = encodeURIComponent(firstSubThreadId.replace(/&/g, "%26"));
        router.push(
          `${pathName}?version=${search.get("version") || selectedVersion}&thread_id=${encodedThreadId}&subThread_id=${encodedSubThreadId}&start=${start || ""}&end=${end || ""}${messageId ? `&message_id=${messageId}` : ""}&type=${search.get("type") || resolvedSearchParams.type || ""}`,
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
        filterOption,
        isErrorTrue,
        selectedVersion,
        keyword,
        startDate,
        endDate,
        activeFilterByRef.current
      )
    );
    if (result?.length < 40) setHasMore(false);
  }, [page, resolvedParams.id]);

  const batchPanel = (
    <BatchSubthreadPanel
      thread={thread}
      subThreadIdFromURL={search.get("subThread_id")}
      parentThreadId={resolvedSearchParams?.thread_id}
      selectedBatchMessageId={selectedBatchMessageId}
      onSelectBatch={(messageId) => setSelectedBatchMessageId((prev) => (prev === messageId ? null : messageId))}
      onSelectSubThread={(subThreadId) => {
        setSelectedBatchMessageId(null);
        const p = new URLSearchParams(search.toString());
        p.set("subThread_id", encodeURIComponent(subThreadId.replace(/&/g, "%26")));
        router.push(`${pathName}?${p.toString()}`);
      }}
    />
  );

  const isLoadingState = loading || !historyData;

  return (
    <div className="bg-history-page relative scrollbar-hide text-base-content h-[calc(100vh-40px)]">
      <div className="flex flex-row overflow-hidden bg-history-page min-h-full h-full relative">
        <React.Suspense>
          <div className="pl-4 h-full shrink-0 z-50 flex relative">
            <Sidebar
              historyData={historyData}
              threadHandler={threadHandler}
              fetchMoreData={fetchMoreData}
              hasMore={hasMore}
              loading={loading}
              params={resolvedParams}
              searchParams={Object.fromEntries(search.entries())}
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
              activeFilterByRef={activeFilterByRef}
            />
          </div>
        </React.Suspense>

        {batchPanel}

        <div className="flex-grow flex-1 overflow-hidden bg-history-page min-h-full h-full">
          {isLoadingState ? (
            <ChatLoadingSkeleton isSingleQuery={isSingleQuery} />
          ) : (
            <React.Suspense>
              <ThreadContainer
                key={`thread-container-${resolvedParams.id}-${resolvedParams.version}`}
                thread={displayThread}
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
          )}
        </div>
      </div>
      <ChatDetails selectedItem={selectedItem} setIsSliderOpen={setIsSliderOpen} isSliderOpen={isSliderOpen} />
      <ChatAiConfigDeatilViewModal
        modalContent={selectedItem?.value === "Latency" ? selectedItem?.latency : selectedItem?.AiConfig}
        modalTitle={selectedItem?.value === "Latency" ? "Latency Details" : "AI Configuration"}
      />
    </div>
  );
}

export default Protected(Page);
