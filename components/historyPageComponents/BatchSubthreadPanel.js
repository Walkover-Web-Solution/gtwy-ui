"use client";
import { CheckCircle2, Clock3, AlertTriangle } from "lucide-react";
import { BATCH_PROCESSING_STATUSES } from "@/utils/enums";
import { useCustomSelector } from "@/customHooks/customSelector";
import { formatRelativeTime } from "@/utils/utility";

const getBatchStatusMeta = (status) => {
  const statusLower = (status || "").toLowerCase();
  if (statusLower === "completed") return { icon: CheckCircle2, className: "text-success" };
  if (BATCH_PROCESSING_STATUSES.includes(statusLower)) return { icon: Clock3, className: "text-warning" };
  return { icon: AlertTriangle, className: "text-error" };
};

const BatchSubthreadPanel = ({
  thread,
  subThreadIdFromURL,
  selectedBatchMessageId,
  onSelectBatch,
  onSelectSubThread,
}) => {
  const subThreads = useCustomSelector((state) =>
    Array.isArray(state?.historyReducer?.subThreads) ? state.historyReducer.subThreads : []
  );

  const batchMessages = Array.isArray(thread) ? thread.filter((msg) => msg?.batch_data?.batch_id) : [];
  const showBatches = batchMessages.length > 0;
  const showSubThreads = subThreads.length > 1;
  const isVisible = showBatches || showSubThreads;
  const showBoth = showBatches && showSubThreads;
  const panelWidth = showBoth ? 384 : 192;

  // DEBUG: Track panel visibility transitions
  if (typeof window !== "undefined") {
    console.log("[BatchSubthreadPanel] render", {
      threadLength: Array.isArray(thread) ? thread.length : 0,
      batchMessagesCount: batchMessages.length,
      subThreadsCount: subThreads.length,
      showBatches,
      showSubThreads,
      showBoth,
      isVisible,
      panelWidth,
      subThreadIdFromURL,
      selectedBatchMessageId,
      timestamp: new Date().toISOString(),
    });
  }

  const sortedSubThreads = [...subThreads].sort(
    (a, b) => new Date(b?.created_at || b?.updated_at || 0) - new Date(a?.created_at || a?.updated_at || 0)
  );

  const batchesColumn = showBatches && (
    <div className="w-48 shrink-0 border-r border-base-300 last:border-r-0">
      <div className="px-3 py-2 border-b border-base-300 text-xs font-semibold text-base-content/60 uppercase tracking-wider sticky top-0 bg-base-200 z-10 whitespace-nowrap">
        Batches
      </div>
      <ul className="flex flex-col gap-1 p-2">
        {batchMessages.map((msg, index) => {
          const meta = getBatchStatusMeta(msg.batch_data.status);
          const Icon = meta.icon;
          const isActive = selectedBatchMessageId === msg.message_id;
          return (
            <li
              key={msg.message_id || index}
              onClick={() => onSelectBatch(msg.message_id)}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors duration-150 ${
                isActive ? "bg-primary text-primary-content" : "hover:bg-base-300 text-base-content"
              }`}
            >
              <span className="font-medium truncate flex-1">Batch {index + 1}</span>
              <Icon size={13} className={isActive ? "text-primary-content" : meta.className} />
            </li>
          );
        })}
      </ul>
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
