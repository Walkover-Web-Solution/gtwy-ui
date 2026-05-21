"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useSearchParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";

import { CircleDownIcon, BotMessageIcon } from "@/components/Icons";
import ThreadItem from "./ThreadItem";
import InfiniteScroll from "react-infinite-scroll-component";
import { scrollToBottom, scrollToTop } from "./AssistFile";
import { getThread, updateContentHistory } from "@/store/action/historyAction";
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
  const { searchResults, isSearchActive, isSingleQuery } = useCustomSelector((state) => ({
    searchResults: Array.isArray(state?.historyReducer?.search?.results) ? state.historyReducer.search.results : [],
    isSearchActive: state?.historyReducer?.search?.isActive || false,
    isSingleQuery: (() => {
      const isEmbedUser = state?.appInfoReducer?.embedUserDetails?.isEmbedUser;
      if (isEmbedUser) return false;
      const bridgeInfo = state?.bridgeReducer?.allBridgesMap?.[bridgeId];
      const isStateless = bridgeInfo?.settings?.stateless_conversation === true;
      if (!isStateless) return false;
      const userMessageCount = Array.isArray(thread) ? thread.filter((msg) => msg?.user).length : 0;
      return userMessageCount <= 1;
    })(),
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
  const [debugQuery, setDebugQuery] = useState("");

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

  // Debug Agent — send a query to the chatbot using the last thread item's context (single-query/stateless mode)
  const handleAskAi = useCallback(() => {
    const trimmed = debugQuery.trim();
    if (!trimmed || !Array.isArray(thread) || thread.length === 0) return;
    const lastIndex = thread.length - 1;
    const lastItem = thread[lastIndex];
    if (!lastItem) return;

    const aiconfig = handleAddTestCase(lastItem, lastIndex, true);
    let variables = {
      aiconfig,
      response: lastItem?.chatbot_message ? lastItem.chatbot_message : lastItem?.llm_message,
    };
    try {
      variables = { "System Prompt": lastItem.prompt, ...variables };
    } catch (error) {
      console.error("Failed to build debug variables:", error);
    }

    if (typeof window.SendDataToChatbot === "function") {
      window.SendDataToChatbot({
        parentId: "",
        bridgeName: "history_page_chabot",
        threadId: String(lastItem?.id),
        variables,
        version_id: "null",
        hideCloseButton: "false",
      });
      setTimeout(() => {
        if (typeof window.openChatbot === "function") window.openChatbot();
        setTimeout(() => {
          if (typeof window.Chatbot?.askAi === "function") {
            window.Chatbot.askAi({ message: trimmed });
          }
        }, 300);
      }, 100);
      setDebugQuery("");
    } else {
      console.warn("Chatbot embed script not loaded. SendDataToChatbot is unavailable.");
    }
  }, [debugQuery, thread, handleAddTestCase]);

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

  // Scroll to searched message
  const scrollToSearchedMessage = useCallback(
    async (messageId) => {
      if (!messageId || !historyRef.current) return;

      const MAX_ATTEMPTS = threadMessageState?.totalPages || 1;
      const DELAY_MS = 100;

      const findMessageAndScroll = async (attempt = 1) => {
        const messageElement = threadRefs.current?.[messageId];
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (attempt < MAX_ATTEMPTS) {
          scrollToTop(historyRef, messageId);
          await new Promise((r) => setTimeout(r, DELAY_MS));
          await findMessageAndScroll(attempt + 1);
        }
      };

      findMessageAndScroll();
    },
    [threadMessageState?.totalPages]
  );

  useEffect(() => {
    if (searchMessageId) scrollToSearchedMessage(searchMessageId);
  }, [searchMessageId, scrollToSearchedMessage]);

  return (
    <div
      data-testid="thread-container"
      id="thread-container"
      className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-2.5rem)]"
    >
      <div className="w-full flex-1 flex flex-col min-h-0 relative">
        <div
          data-testid="thread-container-scrollable-div"
          id="scrollableDiv"
          ref={historyRef}
          onScroll={onScroll}
          className="w-full text-start flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative"
          style={{
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection,
          }}
        >
          {/* Show loading skeleton when loading with no data */}
          {loadingData && (!thread || thread.length === 0) ? (
            <ChatLoadingSkeleton />
          ) : !loadingData && (!thread || thread.length === 0) ? (
            <div className="flex items-center justify-center h-full">
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
              <div ref={contentRef} className="pb-16 px-3 pt-4" style={{ width: "100%" }}>
                {Array.isArray(thread) &&
                  thread.map((item, index) => (
                    <ThreadItem
                      key={index}
                      params={{ org_id: orgId, id: bridgeId }}
                      index={index}
                      item={item}
                      thread={thread}
                      isSingleQuery={isSingleQuery}
                      threadHandler={threadHandler}
                      formatDateAndTime={formatDateAndTime}
                      integrationData={integrationData}
                      threadRefs={threadRefs}
                      searchMessageId={searchMessageId}
                      setSearchMessageId={setSearchMessageId}
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

      {/* Debug Agent footer — sticky page footer (single-query / stateless only) */}
      {isSingleQuery && Array.isArray(thread) && thread.length > 0 && (
        <div className="sticky bottom-0 shrink-0 px-3 py-2 bg-base-100 z-10">
          <div className="flex items-center gap-2 border border-base-200 rounded-lg px-3 py-2 bg-base-100 focus-within:border-primary/50 transition-colors">
            <BotMessageIcon className="h-3.5 w-3.5 text-base-content/40 shrink-0" />
            <input
              type="text"
              value={debugQuery}
              onChange={(e) => setDebugQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && debugQuery.trim()) {
                  handleAskAi();
                }
              }}
              placeholder="Debug with me..."
              className="flex-1 bg-transparent text-sm outline-none text-base-content placeholder:text-base-content/30"
            />
            <button
              id="thread-container-debug-agent-button"
              disabled={!debugQuery.trim()}
              onClick={handleAskAi}
              className="btn btn-primary btn-xs rounded-md"
            >
              Send
            </button>
          </div>
        </div>
      )}

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
