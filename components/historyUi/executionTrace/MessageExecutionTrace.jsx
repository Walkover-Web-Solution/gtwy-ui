"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { getRecursiveHistoryDataAction } from "@/store/action/historyAction";
import { flattenToolsCallData, historyMessageToEmbeddedTrace } from "@/utils/executionTraceTransform";
import { MessageRunTrace } from "./ExecutionTraceView";

/** Inline agent/tool trace in the message thread — loads on mount, no dropdown. */
export default function MessageExecutionTrace({
  item,
  bridgeId,
  rootAgentName = "Agent",
  formatDateAndTime,
  showUserMessageInTrace = false,
  onToolLogsClick,
  onToolDataClick,
  onAgentDataClick,
  onAgentHistoryClick,
}) {
  const dispatch = useDispatch();
  // Memoize item properties to prevent unnecessary re-renders
  const itemKey = useMemo(
    () => `${item?.thread_id}:${item?.message_id}:${item?.tools_call_data ? JSON.stringify(item.tools_call_data) : ""}`,
    [item?.thread_id, item?.message_id, item?.tools_call_data]
  );

  const hasToolsData = useMemo(() => flattenToolsCallData(item?.tools_call_data).length > 0, [item?.tools_call_data]);

  const shouldFetch = hasToolsData && Boolean(bridgeId && item?.thread_id && item?.message_id);

  const [loading, setLoading] = useState(shouldFetch);
  const [error, setError] = useState(null);
  const [traceData, setTraceData] = useState(null);

  const localTrace = useMemo(() => {
    if (!hasToolsData) return null;
    return historyMessageToEmbeddedTrace(item, {
      rootAgentName,
      formatTime: formatDateAndTime,
    });
  }, [itemKey, rootAgentName, formatDateAndTime, hasToolsData]);

  useEffect(() => {
    if (!hasToolsData) {
      setTraceData(null);
      setLoading(false);
      return;
    }

    if (!bridgeId || !item?.thread_id || !item?.message_id) {
      setTraceData(localTrace);
      setLoading(false);
      return;
    }

    // Reset loading and trace data immediately to display the loading spinner for the new message/thread
    setLoading(true);
    setTraceData(null);
    setError(null);

    let cancelled = false;

    async function load() {
      try {
        const response = await dispatch(
          getRecursiveHistoryDataAction({
            agent_id: bridgeId,
            thread_id: item.thread_id,
            message_id: item.message_id,
          })
        );
        if (cancelled) return;
        const message = response?.data;
        if (message) {
          setTraceData(
            historyMessageToEmbeddedTrace(message, {
              rootAgentName,
              formatTime: formatDateAndTime,
            })
          );
        } else {
          setTraceData(localTrace);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load recursive history:", err);
        setError("Could not load full agent trace. Showing available data.");
        setTraceData(localTrace);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [hasToolsData, bridgeId, itemKey, rootAgentName, formatDateAndTime, localTrace, dispatch]);

  if (!hasToolsData) return null;

  if (loading && !traceData) {
    return (
      <div className="w-full py-4 text-center text-sm text-base-content/60">
        <span className="loading loading-spinner loading-sm mr-2" />
        Loading agent execution…
      </div>
    );
  }

  const display = traceData || localTrace;

  if (!display?.run) {
    return null;
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-2 px-3 py-1.5 text-xs rounded-lg bg-warning/15 text-warning border border-warning/25">
          {error}
        </div>
      )}
      <MessageRunTrace
        run={display.run}
        agents={display.agents}
        embedded
        userMessage={showUserMessageInTrace ? item?.user : undefined}
        onToolLogsClick={onToolLogsClick}
        onToolDataClick={onToolDataClick}
        onAgentDataClick={onAgentDataClick}
        onAgentHistoryClick={onAgentHistoryClick}
      />
    </div>
  );
}
