"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, AlertTriangle, Loader2 } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { formatRelativeTime } from "@/utils/utility";
import { getBatchHistory } from "@/config/historyApi";

const BATCH_FILTERS = [
  { key: "completed", label: "Completed", icon: CheckCircle2, className: "text-success" },
  { key: "queued", label: "Queued", icon: Clock3, className: "text-warning" },
  { key: "error", label: "Error", icon: AlertTriangle, className: "text-error" },
];

const PAGE_LIMIT = 30;

const BatchSubthreadPanel = ({
  agentId,
  threadId,
  subThreadId,
  subThreadIdFromURL,
  selectedBatchMessageId,
  onSelectBatch,
  onSelectSubThread,
}) => {
  const subThreads = useCustomSelector((state) =>
    Array.isArray(state?.historyReducer?.subThreads) ? state.historyReducer.subThreads : []
  );

  const [filter, setFilter] = useState("completed");
  const userPickedFilterRef = useRef(false);
  const [batches, setBatches] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasAnyBatches, setHasAnyBatches] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const requestIdRef = useRef(0);

  const loadBatches = useCallback(
    async (nextPage, currentFilter) => {
      if (!agentId) return;
      const isFirstPage = nextPage === 1;
      const reqId = ++requestIdRef.current;
      isFirstPage ? setLoading(true) : setLoadingMore(true);
      try {
        const data = await getBatchHistory({
          agent_id: agentId,
          thread_id: threadId || undefined,
          sub_thread_id: subThreadId || undefined,
          filter: currentFilter,
          page: nextPage,
          limit: PAGE_LIMIT,
        });
        if (reqId !== requestIdRef.current) return; // stale response
        const items = Array.isArray(data?.data) ? data.data : [];
        setBatches((prev) => (isFirstPage ? items : [...prev, ...items]));
        setHasMore(items.length === PAGE_LIMIT);
        if (items.length > 0) setHasAnyBatches(true);
        setErrorMsg("");
      } catch (err) {
        if (reqId === requestIdRef.current) {
          setBatches((prev) => (isFirstPage ? [] : prev));
          setHasMore(false);
          setErrorMsg(err?.response?.data?.message || err?.message || "Failed to load batches");
        }
      } finally {
        if (reqId === requestIdRef.current) {
          isFirstPage ? setLoading(false) : setLoadingMore(false);
        }
      }
    },
    [agentId, threadId, subThreadId]
  );

  // Reset "has any batches" memory when scope changes (agent/thread/subThread)
  useEffect(() => {
    setHasAnyBatches(false);
    userPickedFilterRef.current = false;
  }, [agentId, threadId, subThreadId]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadBatches(1, filter);
  }, [filter, agentId, threadId, subThreadId, loadBatches]);

  // Probe all filters in parallel to determine if ANY batches exist for this scope.
  // This ensures the sidebar shows even when the currently selected filter is empty.
  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          BATCH_FILTERS.map((f) =>
            getBatchHistory({
              agent_id: agentId,
              thread_id: threadId || undefined,
              sub_thread_id: subThreadId || undefined,
              filter: f.key,
              page: 1,
              limit: 1,
            }).catch(() => null)
          )
        );
        if (cancelled) return;
        const counts = results.map((data) => (Array.isArray(data?.data) ? data.data.length : 0));
        const anyHasBatches = counts.some((c) => c > 0);
        if (anyHasBatches) setHasAnyBatches(true);
        // Auto-select the first filter tab that has batches when the user hasn't picked one yet
        // for the current scope and the current filter is empty.
        if (!userPickedFilterRef.current && anyHasBatches) {
          const currentIdx = BATCH_FILTERS.findIndex((f) => f.key === filter);
          if (currentIdx === -1 || counts[currentIdx] === 0) {
            const firstNonEmpty = BATCH_FILTERS.find((_, i) => counts[i] > 0);
            if (firstNonEmpty && firstNonEmpty.key !== filter) {
              setFilter(firstNonEmpty.key);
            }
          }
        }
      } catch {
        /* ignore probe errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId, threadId, subThreadId]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    loadBatches(next, filter);
  };

  const filterMeta = BATCH_FILTERS.find((f) => f.key === filter) || BATCH_FILTERS[0];

  // Hide batches column entirely when scope has no batches at all.
  // Keep it visible while loading the very first request to avoid flicker.
  // Also keep it visible while an error is present so the user can see what went wrong.
  const showBatches = !!agentId && (loading || hasAnyBatches || batches.length > 0 || !!errorMsg);
  const showSubThreads = subThreads.length > 1;
  const isVisible = showBatches || showSubThreads;
  const showBoth = showBatches && showSubThreads;
  const panelWidth = showBoth ? 448 : showBatches ? 256 : 192;

  const sortedSubThreads = [...subThreads].sort(
    (a, b) => new Date(b?.created_at || b?.updated_at || 0) - new Date(a?.created_at || a?.updated_at || 0)
  );

  const handleBatchClick = (batch) => {
    if (!onSelectBatch) return;
    // Prefer message_id when available for parity with previous behavior; fall back to batch_id.
    onSelectBatch(batch?.message_id || batch?.batch_id, batch);
  };

  const batchesColumn = showBatches && (
    <div className="w-64 shrink-0 border-r border-base-300 last:border-r-0 flex flex-col">
      <div className="px-3 py-2 border-b border-base-300 text-xs font-semibold text-base-content/60 uppercase tracking-wider sticky top-0 bg-base-200 z-10 whitespace-nowrap">
        Batches
      </div>
      <div className="px-2 pt-2 sticky top-[33px] bg-base-200 z-10">
        <div role="tablist" className="tabs tabs-boxed tabs-xs w-full">
          {BATCH_FILTERS.map((f) => {
            const Icon = f.icon;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                role="tab"
                onClick={() => {
                  userPickedFilterRef.current = true;
                  setFilter(f.key);
                }}
                className={`tab tab-xs gap-1 flex-1 ${active ? "tab-active" : ""}`}
                title={f.label}
              >
                <Icon size={11} className={active ? "" : f.className} />
                <span className="text-[10px]">{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-base-content/60">
            <Loader2 size={14} className="animate-spin mr-2" /> Loading...
          </div>
        ) : errorMsg ? (
          <div className="px-3 py-6 text-center text-xs text-error">{errorMsg}</div>
        ) : batches.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-base-content/50">No {filter} batches</div>
        ) : (
          <ul className="flex flex-col gap-1 p-2">
            {batches.map((batch, index) => {
              const Icon = filterMeta.icon;
              const key = batch?.batch_id || batch?.message_id || index;
              const isActive =
                selectedBatchMessageId &&
                (selectedBatchMessageId === batch?.message_id || selectedBatchMessageId === batch?.batch_id);
              const createdAt = batch?.created_at || batch?.updated_at;
              const label = batch?.display_name || batch?.batch_id || `Batch ${index + 1}`;
              return (
                <li
                  key={key}
                  onClick={() => handleBatchClick(batch)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors duration-150 ${
                    isActive ? "bg-primary text-primary-content" : "hover:bg-base-300 text-base-content"
                  }`}
                  title={label}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium truncate">{label}</span>
                    {createdAt && (
                      <span className={`text-[10px] ${isActive ? "text-primary-content/70" : "text-base-content/50"}`}>
                        {formatRelativeTime(createdAt)}
                      </span>
                    )}
                  </div>
                  <Icon size={13} className={isActive ? "text-primary-content" : filterMeta.className} />
                </li>
              );
            })}
            {hasMore && (
              <li>
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full text-xs py-2 text-base-content/70 hover:text-primary disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );

  const subThreadsColumn = showSubThreads && (
    <div className="w-48 shrink-0">
      <div className="px-3 py-2 border-b border-base-300 text-xs font-semibold text-base-content/60 uppercase tracking-wider sticky top-0 bg-base-200 z-10 whitespace-nowrap">
        Sub Threads
      </div>
      <ul className="flex flex-col gap-1 p-2">
        {sortedSubThreads.map((st) => {
          const isActive = subThreadIdFromURL === st.sub_thread_id;
          return (
            <li
              key={st.sub_thread_id}
              onClick={() => onSelectSubThread(st.sub_thread_id)}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors duration-150 ${
                isActive ? "bg-primary text-primary-content" : "hover:bg-base-300 text-base-content"
              }`}
            >
              <span className="truncate flex-1">{st.display_name || st.sub_thread_id}</span>
              {(st.updated_at || st.created_at) && (
                <span className={`shrink-0 ${isActive ? "text-primary-content/70" : "text-base-content/40"}`}>
                  {formatRelativeTime(st.updated_at || st.created_at)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div
      className="shrink-0 border-r border-base-300 bg-base-200 flex flex-row overflow-y-auto h-screen transition-all duration-200"
      style={{
        width: isVisible ? `${panelWidth}px` : "0px",
        minWidth: isVisible ? `${panelWidth}px` : "0px",
        overflow: "hidden",
      }}
    >
      {batchesColumn}
      {subThreadsColumn}
    </div>
  );
};

export default BatchSubthreadPanel;
