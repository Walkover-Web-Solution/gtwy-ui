"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useSearchParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";

import { CircleDownIcon } from "@/components/Icons";
import ThreadItem from "./ThreadItem";
import InfiniteScroll from "react-infinite-scroll-component";
import { scrollToBottom, scrollToTop, scrollElementIntoContainer } from "./AssistFile";
import { getThread, updateContentHistory } from "@/store/action/historyAction";
import { clearThreadData } from "@/store/reducer/historyReducer";
import { useCustomSelector } from "@/customHooks/customSelector";
import { closeModal, openModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import AddTestCaseModal from "../modals/AddTestCaseModal";
import HistoryPagePromptUpdateModal from "../modals/HistoryPagePromptUpdateModal";
import { ChatLoadingSkeleton } from "./ChatLayoutLoader";
import EditMessageModal from "../modals/EditMessageModal";
import { improvePrompt } from "@/config/utilityApi";

// ------------------------------------
// Constants
// ------------------------------------
const PAGE_SIZE = 40;
const SCROLL_BOTTOM_THRESHOLD = 16; // px

const ThreadContainer = ({
  thread,
  filterOption,
  isFetchingMore,
  setIsFetchingMore,
  searchMessageId,
  setSearchMessageId,
  pathName: pathNameProp,
  search,
  historyData,
  threadHandler,
  setLoading,
  threadPage,
  setThreadPage,
  hasMoreThreadData,
  setHasMoreThreadData,
  selectedVersion,
  previousPrompt,
  isErrorTrue,
  fillParent = false,
  keepSearchMessageId = false,
}) => {
  const routeParams = useParams();
  const orgId = routeParams?.org_id;
  const bridgeId = routeParams?.id;
  const pathname = usePathname();
  const searchParamsHook = useSearchParams();
  const router = useRouter();

  const threadIdFromURL = searchParamsHook.get("thread_id");
  const subThreadIdFromURL = searchParamsHook.get("subThread_id");
  const versionFromURL = searchParamsHook.get("version");
  const errorFromURL = searchParamsHook.get("error");

  const dispatch = useDispatch();
  const integrationData = useCustomSelector((state) => state?.bridgeReducer?.org?.[orgId]?.integrationData) || {};
  const { searchResults, isSearchActive } = useCustomSelector((state) => ({
    searchResults: Array.isArray(state?.historyReducer?.search?.results) ? state.historyReducer.search.results : [],
    isSearchActive: state?.historyReducer?.search?.isActive || false,
  }));

  const historyRef = useRef(null);
  const contentRef = useRef(null);
  const previousScrollHeightRef = useRef(0);
  const threadRefs = useRef({});
  const isMountedRef = useRef(false);
  const lastFetchedThreadKeyRef = useRef(null);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [flexDirection, setFlexDirection] = useState("column");
  const [threadMessageState, setThreadMessageState] = useState();
  const [testCaseConversation, setTestCaseConversation] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [promotToUpdate, setPromptToUpdate] = useState(null);
  const [modalInput, setModalInput] = useState(null);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [generatedPrompts, setGeneratedPrompts] = useState({}); // Store generated prompts by message ID

  const formatDateAndTime = useCallback((created_at) => {
    const date = new Date(created_at);
    const options = {
      year: "numeric",
      month: "numeric",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString("en-US", options);
  }, []);

  const handleAddTestCase = useCallback(
    (item, index, variables = false) => {
      const conversation = [];
      let AiConfigForVariable = {};
      AiConfigForVariable = thread[index]?.AiConfig ? thread[index]?.AiConfig : {};

      // Extract variables from the thread item
      const threadItem = thread[index] || {};
      const threadVariables =
        threadItem.variables && typeof threadItem.variables === "object" && !Array.isArray(threadItem.variables)
          ? { ...threadItem.variables }
          : {};

      const itemWithVariables = {
        ...item,
        // Backend fetches ai_config using message_id (see historyService.findHistoryByMessageId).
        message_id: item?.message_id || threadItem?.message_id || item?.id || null,
        AiConfig: AiConfigForVariable,
        threadVariables: threadVariables,
      };
      conversation.push(itemWithVariables || {});
      setTestCaseConversation(conversation);
      if (variables) return AiConfigForVariable;
      openModal(MODAL_TYPE.ADD_TEST_CASE_MODAL);
    },
    [thread]
  );

  const handleSave = useCallback(() => {
    if (!modalInput?.content?.trim()) {
      alert("Message cannot be empty.");
      return;
    }
    dispatch(
      updateContentHistory({
        id: modalInput?.Id,
        bridge_id: bridgeId ?? orgId, // prefer explicit bridgeId, fallback to orgId if needed
        message: modalInput.content,
        index: modalInput.index,
      })
    );
    setModalInput("");
    closeModal(MODAL_TYPE.EDIT_MESSAGE_MODAL);
  }, [modalInput, dispatch, bridgeId, orgId, thread]);

  const handleImprovePrompt = async () => {
    setIsImprovingPrompt(true);
    try {
      const variables = {};
      thread.forEach((item) => {
        if (item.id === modalInput?.Id) {
          const conversation = item?.AiConfig?.input || item?.AiConfig?.messages;
          const filteredConversation = conversation.filter((value) => {
            if (value.role === "developer") {
              variables["prompt"] = value.content;
            }
            return value.role !== "developer";
          });
          filteredConversation.push({
            role: "assistant",
            content: modalInput.originalContent,
          });
          variables["conversation_history"] = filteredConversation;
        }
      });
      variables["updated_response"] = modalInput.content;
      let data;
      try {
        data = await improvePrompt(variables);
      } catch (error) {
        console.error(error);
      }
      if (data) {
        setPromptToUpdate(JSON.parse(data)?.updated_prompt);
        setGeneratedPrompts((prev) => ({
          ...prev,
          [modalInput?.Id]: JSON.parse(data)?.updated_prompt,
        }));
        openModal(MODAL_TYPE?.HISTORY_PAGE_PROMPT_UPDATE_MODAL);
      }
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  const handleClose = useCallback(() => {
    setModalInput("");
    closeModal(MODAL_TYPE.EDIT_MESSAGE_MODAL);
  }, []);

  const handleShowGeneratedPrompt = useCallback(() => {
    if (modalInput?.Id && generatedPrompts[modalInput.Id]) {
      setPromptToUpdate(generatedPrompts[modalInput.Id]);
      closeModal(MODAL_TYPE.EDIT_MESSAGE_MODAL);
      openModal(MODAL_TYPE.HISTORY_PAGE_PROMPT_UPDATE_MODAL);
    }
  }, [modalInput, generatedPrompts]);

  const handleRegenerateFromModal = useCallback(async () => {
    if (!modalInput?.Id) return;
    // Trigger regeneration
    setTimeout(() => {
      handleImprovePrompt();
    }, 100);
  }, [modalInput, handleImprovePrompt]);

  const handlePromptSaved = useCallback(() => {
    if (modalInput?.Id) {
      // Clear the generated prompt for this message when saved
      setGeneratedPrompts((prev) => {
        const updated = { ...prev };
        delete updated[modalInput.Id];
        return updated;
      });
    }
  }, [modalInput]);

  const calcFlexDirection = useCallback(() => {
    if (historyRef.current && contentRef.current) {
      setFlexDirection(contentRef.current.clientHeight < historyRef.current.clientHeight ? "column" : "column-reverse");
    }
  }, []);

  const handleScroll = useCallback(() => {
    const container = historyRef.current;
    if (!container) return;
    const { scrollTop, clientHeight, scrollHeight } = container;

    let nearBottom;

    if (flexDirection === "column-reverse") {
      // In reverse mode, scrollTop = 0 means at bottom, negative values are bounce
      nearBottom = scrollTop <= SCROLL_BOTTOM_THRESHOLD && scrollTop >= -50;
    } else {
      // Normal mode: check distance from bottom
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      nearBottom = distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD;
    }

    setShowScrollToBottom(!nearBottom);
  }, [flexDirection]);

  // ------------------------------------
  // Effects: mount / cleanup
  // ------------------------------------
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    calcFlexDirection();
  }, [thread, calcFlexDirection]);

  // Attach scroll listener via onScroll prop in JSX, but ensure first bottom snap
  useEffect(() => {
    if (historyRef.current && threadPage === 1) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [threadPage]);

  // Keep auto-scroll on new messages when already near bottom
  useEffect(() => {
    if (!showScrollToBottom) scrollToBottom(historyRef);
  }, [thread, showScrollToBottom]);

  // ------------------------------------
  // Fetch logic (debounced + stale guard)
  // ------------------------------------
  const pathName = pathNameProp || pathname;
  const availableThreads = useMemo(() => {
    if (isSearchActive) {
      return searchResults;
    }
    return Array.isArray(historyData) ? historyData : [];
  }, [isSearchActive, searchResults, historyData]);

  const fetchThread = useCallback(
    async ({ threadId, subThreadId, version, error, page = 1 }) => {
      return dispatch(
        getThread({
          threadId,
          bridgeId: bridgeId ?? orgId,
          nextPage: page,
          user_feedback: filterOption,
          subThreadId,
          versionId: selectedVersion === "all" ? "" : selectedVersion,
          error: error || isErrorTrue,
        })
      );
    },
    [dispatch, bridgeId, orgId, filterOption, selectedVersion, isErrorTrue]
  );

  // Initial load + handle URL thread_id changes
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const thread_id = threadIdFromURL;
      const subThreadId = subThreadIdFromURL || thread_id;
      const error = errorFromURL || isErrorTrue;
      const version = versionFromURL || "";

      // If no thread selected, navigate to the first one from whichever data source is active
      if (!thread_id && Array.isArray(availableThreads) && availableThreads.length > 0) {
        const firstThreadId = availableThreads[0]?.thread_id;
        if (firstThreadId) {
          const params = new URLSearchParams(searchParamsHook.toString());
          params.set("thread_id", firstThreadId);
          params.set("subThread_id", firstThreadId);
          if (version) params.set("version", version);
          if (error) params.set("error", String(error));
          if (search?.type) params.set("type", search.type);
          params.set("navigated", "true");
          router.push(`${pathName}?${params.toString()}`, undefined, { scroll: false });
          return;
        }
      }

      if (!thread_id || !availableThreads?.some((h) => h?.thread_id === thread_id)) {
        return;
      }

      const messageIdFromURL = searchParamsHook.get("message_id");
      const fetchKey = `${thread_id}|${subThreadId}|${version}|${error}|${filterOption}|${messageIdFromURL}`;
      if (lastFetchedThreadKeyRef.current === fetchKey && thread.length > 0) {
        return;
      }

      // Detect thread switch and set flag immediately (synchronous)
      const isThreadSwitch = lastFetchedThreadKeyRef.current && lastFetchedThreadKeyRef.current !== fetchKey;
      if (isThreadSwitch) {
        dispatch(clearThreadData());
        setLoadingData(true);
      }

      lastFetchedThreadKeyRef.current = fetchKey;

      if (!isThreadSwitch) {
        setLoadingData(true);
      }
      try {
        // small debounce to absorb rapid filter/URL changes
        await new Promise((r) => setTimeout(r, 150));
        if (cancelled) return;
        const res = await fetchThread({
          threadId: thread_id,
          subThreadId,
          version,
          error,
          page: 1,
        });

        if (cancelled || !isMountedRef.current) return;

        if (res) {
          setThreadMessageState({
            totalPages: res?.totalPages,
            totalEntries: res?.totalEnteries,
          });
          setHasMoreThreadData((res?.data?.length || 0) >= PAGE_SIZE);
        }

        setIsFetchingMore(false);
        setLoading(false);
      } finally {
        if (isMountedRef.current) {
          setLoadingData(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    threadIdFromURL,
    filterOption,
    availableThreads,
    errorFromURL,
    subThreadIdFromURL,
    searchParamsHook.get("message_id"),
  ]);

  // Fetch more (pagination)
  const fetchMoreThreadData = useCallback(async () => {
    if (isFetchingMore) return;
    setIsFetchingMore(true);
    previousScrollHeightRef.current = historyRef.current?.scrollHeight || 0;

    const nextPage = (threadPage || 1) + 1;
    const res = await fetchThread({
      threadId: threadIdFromURL,
      subThreadId: subThreadIdFromURL || threadIdFromURL,
      version: versionFromURL || "",
      error: errorFromURL || isErrorTrue,
      page: nextPage,
    });

    setThreadPage(nextPage);
    const length = res?.data?.length || 0;
    setHasMoreThreadData(length >= PAGE_SIZE);
    if (!res || length < PAGE_SIZE) setSearchMessageId(null);
    setIsFetchingMore(false);
  }, [
    isFetchingMore,
    threadPage,
    fetchThread,
    threadIdFromURL,
    subThreadIdFromURL,
    versionFromURL,
    errorFromURL,
    isErrorTrue,
    setThreadPage,
    setHasMoreThreadData,
    setSearchMessageId,
    setIsFetchingMore,
  ]);

  // Maintain scroll position when more items prepended in column-reverse mode
  useLayoutEffect(() => {
    if (isFetchingMore && historyRef.current && hasMoreThreadData) {
      const diff = (historyRef.current.scrollHeight || 0) - previousScrollHeightRef.current;
      historyRef.current.scrollTop += diff;
    }
    // re-run when thread changes because new messages appended
  }, [thread, isFetchingMore, hasMoreThreadData]);

  // Show/hide "scroll to bottom" button
  const onScroll = handleScroll; // stable

  // Window message listener (with cleanup)
  useEffect(() => {
    const handleEvent = (event) => {
      if (event?.data?.type !== "FRONT_END_ACTION") return;
      const data = event?.data?.data;
      if (data) {
        setPromptToUpdate(data?.prompt || data);
        openModal(MODAL_TYPE.HISTORY_PAGE_PROMPT_UPDATE_MODAL);
      }
    };
    window.addEventListener("message", handleEvent);
    return () => window.removeEventListener("message", handleEvent);
  }, []);

  const scrollToSearchedMessage = useCallback(
    async (messageId) => {
      if (!messageId || !historyRef.current) return;

      const MAX_ATTEMPTS = Math.max(threadMessageState?.totalPages || 1, fillParent ? 30 : 15);
      const DELAY_MS = fillParent ? 150 : 100;

      // Wait for slide-panel animation + thread fetch only when content is not ready yet
      if (fillParent && (!thread?.length || loadingData)) {
        await new Promise((r) => setTimeout(r, 320));
      }

      const findMessageAndScroll = async (attempt = 1) => {
        const container = historyRef.current;
        const messageElement = threadRefs.current?.[messageId] || document.getElementById(`message-${messageId}`);

        if (messageElement && container) {
          if (threadRefs.current) threadRefs.current[messageId] = messageElement;
          scrollElementIntoContainer(container, messageElement, "smooth");
          return;
        }

        if (attempt < MAX_ATTEMPTS) {
          if (flexDirection === "column-reverse") {
            scrollToTop(historyRef, messageId);
          }
          await new Promise((r) => setTimeout(r, DELAY_MS));
          await findMessageAndScroll(attempt + 1);
        }
      };

      findMessageAndScroll();
    },
    [threadMessageState?.totalPages, fillParent, flexDirection, thread?.length, loadingData]
  );

  useEffect(() => {
    if (searchMessageId) scrollToSearchedMessage(searchMessageId);
  }, [searchMessageId, scrollToSearchedMessage, thread?.length, loadingData]);

  return (
    <div
      data-testid="thread-container"
      id="thread-container"
      className={`flex-1 flex flex-col overflow-hidden bg-history-page ${fillParent ? "h-full min-h-0" : "h-[calc(100vh-2.5rem)]"}`}
    >
      <div className="w-full flex-1 flex flex-col min-h-0 relative bg-history-page">
        <div
          data-testid="thread-container-scrollable-div"
          id="scrollableDiv"
          ref={historyRef}
          onScroll={onScroll}
          className="w-full text-start flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative bg-history-page"
          style={{
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection,
          }}
        >
          {/* Show loading skeleton when loading */}
          {loadingData ? (
            <ChatLoadingSkeleton />
          ) : !thread || thread.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-history-page">
              <p className="text-gray-500 text-lg">No history present</p>
            </div>
          ) : (
            <InfiniteScroll
              dataLength={thread?.length || 0}
              next={fetchMoreThreadData}
              hasMore={!!hasMoreThreadData}
              loader={<p />}
              scrollThreshold="250px"
              inverse={flexDirection === "column-reverse"}
              scrollableTarget="scrollableDiv"
            >
              <div ref={contentRef} className="pb-16 px-4 pt-4 w-full overflow-hidden">
                {Array.isArray(thread) &&
                  thread.map((item, index) => (
                    <ThreadItem
                      key={index}
                      params={{ org_id: orgId, id: bridgeId }}
                      index={index}
                      item={item}
                      thread={thread}
                      threadHandler={threadHandler}
                      formatDateAndTime={formatDateAndTime}
                      integrationData={integrationData}
                      threadRefs={threadRefs}
                      searchMessageId={searchMessageId}
                      setSearchMessageId={setSearchMessageId}
                      keepSearchMessageIdAfterHighlight={keepSearchMessageId}
                      handleAddTestCase={handleAddTestCase}
                      setModalInput={setModalInput}
                      modalInput={modalInput}
                    />
                  ))}
              </div>
            </InfiniteScroll>
          )}
        </div>

        {showScrollToBottom && (
          <button
            data-testid="thread-container-scroll-to-bottom"
            id="thread-container-scroll-to-bottom"
            onClick={() => scrollToBottom(historyRef)}
            className="fixed bottom-16 right-4 bg-gray-500 text-white p-2 rounded-full shadow-lg z-[5]"
            aria-label="Scroll to bottom"
          >
            <CircleDownIcon size={24} />
          </button>
        )}
      </div>

      <AddTestCaseModal testCaseConversation={testCaseConversation} setTestCaseConversation={setTestCaseConversation} />

      <HistoryPagePromptUpdateModal
        searchParams={Object.fromEntries(searchParamsHook.entries())}
        promotToUpdate={promotToUpdate}
        previousPrompt={previousPrompt}
        handleRegenerate={modalInput?.Id && generatedPrompts[modalInput?.Id] ? handleRegenerateFromModal : null}
        isRegenerating={isImprovingPrompt}
        onPromptSaved={handlePromptSaved}
      />

      <EditMessageModal
        setModalInput={setModalInput}
        handleClose={handleClose}
        handleSave={handleSave}
        modalInput={modalInput}
        handleImprovePrompt={handleImprovePrompt}
        isImprovingPrompt={isImprovingPrompt}
        hasGeneratedPrompt={modalInput?.Id && generatedPrompts[modalInput?.Id]}
        handleShowGeneratedPrompt={handleShowGeneratedPrompt}
      />
    </div>
  );
};

export default ThreadContainer;
