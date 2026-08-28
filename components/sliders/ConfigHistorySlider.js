"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CloseIcon, FileTextIcon } from "@/components/Icons";
import { toggleSidebar } from "@/utils/utility";
import { getBridgeConfigHistory, getBridgeLevelConfigHistory } from "@/config/index";
import {
  CONFIG_HISTORY_FILTER_KEYS,
  CONFIG_HISTORY_FEATURE_OPTIONS,
  CONFIG_HISTORY_BRIDGE_FEATURE_OPTIONS,
  CONFIG_HISTORY_HIDDEN_TYPES,
  CONFIG_HISTORY_SCOPE,
} from "@/utils/enums";
import { splitDraftAndHistory, groupByDate, buildRevertPayload, isSystemHistoryType } from "@/utils/configHistoryUtils";
import { HistoryRow } from "./ConfigHistoryItem";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { toast } from "react-toastify";
import InfiniteScroll from "react-infinite-scroll-component";

const PAGE_SIZE = 25;
const SLIDER_ID = "default-config-history-slider";

function ConfigHistorySlider({ versionId }) {
  const dispatch = useDispatch();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(new Set());
  const [revertingId, setRevertingId] = useState(null);
  const [users, setUsers] = useState([]);
  const [lastPublishedAt, setLastPublishedAt] = useState(null);
  const [scope, setScope] = useState(CONFIG_HISTORY_SCOPE.VERSION);
  const [filters, setFilters] = useState({
    [CONFIG_HISTORY_FILTER_KEYS.USER_IDS]: [],
    [CONFIG_HISTORY_FILTER_KEYS.TYPES]: [],
  });

  const isBridgeScope = scope === CONFIG_HISTORY_SCOPE.BRIDGE;
  const featureOptions = isBridgeScope ? CONFIG_HISTORY_BRIDGE_FEATURE_OPTIONS : CONFIG_HISTORY_FEATURE_OPTIONS;
  const labels = useMemo(() => Object.fromEntries(featureOptions.map((o) => [o.value, o.label])), [featureOptions]);

  const bridgeId = useCustomSelector((state) => {
    for (const [id, versions] of Object.entries(state?.bridgeReducer?.bridgeVersionMapping || {})) {
      if (versionId && versions?.[versionId]) return id;
    }
    return null;
  });

  const currentVersion = useCustomSelector((state) =>
    bridgeId && versionId ? state?.bridgeReducer?.bridgeVersionMapping?.[bridgeId]?.[versionId] : null
  );

  const fetchHistory = useCallback(
    async (p = 1, f = filters, nextScope = scope) => {
      const el = document.getElementById(SLIDER_ID);
      if (!el || el.classList.contains("translate-x-full")) return;
      if (nextScope === CONFIG_HISTORY_SCOPE.BRIDGE ? !bridgeId : !versionId) return;

      setLoading(true);
      try {
        const res =
          nextScope === CONFIG_HISTORY_SCOPE.BRIDGE
            ? await getBridgeLevelConfigHistory(bridgeId, p, PAGE_SIZE, f)
            : await getBridgeConfigHistory(versionId, p, PAGE_SIZE, f);

        if (res?.userData?.users?.length) setUsers(res.userData.users);

        if (!res?.success) {
          if (p === 1) {
            setHistory([]);
            if (res?.userData?.lastPublishedAt !== undefined) {
              setLastPublishedAt(res.userData.lastPublishedAt);
            }
          }
          setHasMore(false);
          return;
        }

        const rows = res?.userData?.updates ?? [];
        if (p === 1 && res?.userData?.lastPublishedAt !== undefined) {
          setLastPublishedAt(res.userData.lastPublishedAt);
        }
        setHistory((prev) => (p === 1 ? rows : [...prev, ...rows]));
        setHasMore(rows.length >= PAGE_SIZE);
      } catch (e) {
        console.error("History fetch failed:", e);
      } finally {
        setLoading(false);
      }
    },
    [versionId, bridgeId, filters, scope]
  );

  const reset = useCallback(() => {
    setFilters({ [CONFIG_HISTORY_FILTER_KEYS.USER_IDS]: [], [CONFIG_HISTORY_FILTER_KEYS.TYPES]: [] });
    setLastPublishedAt(null);
    setExpanded(new Set());
    setScope(CONFIG_HISTORY_SCOPE.VERSION);
  }, []);

  // Close slider when versionId changes (agent navigation)
  useEffect(() => {
    const sliderElement = document.getElementById(SLIDER_ID);
    if (!sliderElement) return;

    const isOpen = !sliderElement.classList.contains("translate-x-full");
    if (isOpen) {
      toggleSidebar(SLIDER_ID, "right");
      reset();
    }
  }, [versionId, reset]);

  const switchScope = (nextScope) => {
    if (nextScope === scope) return;
    setScope(nextScope);
    setFilters({ [CONFIG_HISTORY_FILTER_KEYS.USER_IDS]: [], [CONFIG_HISTORY_FILTER_KEYS.TYPES]: [] });
    setLastPublishedAt(null);
    setPage(1);
    setHistory([]);
    setExpanded(new Set());
    setHasMore(true);
  };

  useEffect(() => {
    const el = document.getElementById(SLIDER_ID);
    if (!el) return;

    const obs = new MutationObserver(() => {
      const open = !el.classList.contains("translate-x-full");
      if (open && versionId) {
        setPage(1);
        setHistory([]);
        setExpanded(new Set());
        fetchHistory(1);
      } else if (!open) reset();
    });

    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [versionId, fetchHistory, reset]);

  useEffect(() => {
    if (page > 1) fetchHistory(page, filters, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    setPage(1);
    setHistory([]);
    setExpanded(new Set());
    fetchHistory(1, filters, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, scope, versionId, bridgeId]);

  const visible = useMemo(
    () => history.filter((i) => !(CONFIG_HISTORY_HIDDEN_TYPES || []).includes(i?.type)),
    [history]
  );
  const { draftItems, historyItems } = useMemo(
    () => (isBridgeScope ? { draftItems: [], historyItems: visible } : splitDraftAndHistory(visible, lastPublishedAt)),
    [visible, lastPublishedAt, isBridgeScope]
  );
  const grouped = useMemo(() => groupByDate(historyItems), [historyItems]);

  const toggle = (id) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handleRevert = async (item) => {
    if (isBridgeScope) {
      return toast.info("Switch to This version to revert a change");
    }
    const payload = buildRevertPayload(item, currentVersion);
    if (!payload) return toast.error("Nothing to revert");

    setRevertingId(item.id);
    try {
      const result = await dispatch(
        updateBridgeVersionAction({
          versionId,
          bridgeId,
          dataToSend: { ...payload, ...(item.id != null && { reverted_from_id: item.id }) },
        })
      );
      if (result?.success) {
        toast.success("Change reverted");
        setPage(1);
        setHistory([]);
        fetchHistory(1, filters, scope);
      } else {
        toast.error(result?.error || "Revert failed");
      }
    } catch {
      toast.error("Revert failed");
    } finally {
      setRevertingId(null);
    }
  };

  const renderHistoryRow = (item, id, isDraft = false) => (
    <HistoryRow
      key={id}
      item={item}
      labels={labels}
      expanded={expanded.has(id)}
      onToggle={() => toggle(id)}
      showRevert={
        !isBridgeScope &&
        item?.type !== "Version published" &&
        item?.type !== "bridge_status" &&
        !isSystemHistoryType(item?.type)
      }
      onRevert={handleRevert}
      isReverting={revertingId === item.id}
      revertingId={revertingId}
      isDraft={isDraft}
      allHistory={visible}
      showVersionMeta={isBridgeScope}
    />
  );

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val ? [val] : [] }));

  return (
    <aside
      id={SLIDER_ID}
      data-testid="config-history-sidebar"
      className="sidebar-container fixed z-very-high flex flex-col top-0 right-0 p-4 w-full md:w-[32rem] h-screen bg-base-200 border-l border-base-300 translate-x-full"
    >
      <div className="flex flex-col gap-4 h-full min-h-0">
        <div className="flex justify-between items-center border-b border-base-300 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileTextIcon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-base font-semibold">Updates History</p>
          </div>
          <button
            onClick={() => {
              toggleSidebar(SLIDER_ID, "right");
              reset();
            }}
            className="p-1.5 rounded-lg hover:bg-base-300"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-base-100 rounded-lg p-4 border border-base-300 shrink-0 space-y-3">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-base-200">
            <button
              type="button"
              onClick={() => switchScope(CONFIG_HISTORY_SCOPE.VERSION)}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                !isBridgeScope
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-base-content/55 hover:text-base-content"
              }`}
            >
              This version
            </button>
            <button
              type="button"
              onClick={() => switchScope(CONFIG_HISTORY_SCOPE.BRIDGE)}
              disabled={!bridgeId}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40 ${
                isBridgeScope
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-base-content/55 hover:text-base-content"
              }`}
            >
              Bridge
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Filter by User</label>
              <select
                className="select select-sm select-bordered w-full"
                value={filters[CONFIG_HISTORY_FILTER_KEYS.USER_IDS][0] || ""}
                onChange={(e) => setFilter(CONFIG_HISTORY_FILTER_KEYS.USER_IDS, e.target.value)}
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Filter by Feature</label>
              <select
                className="select select-sm select-bordered w-full"
                value={filters[CONFIG_HISTORY_FILTER_KEYS.TYPES][0] || ""}
                onChange={(e) => setFilter(CONFIG_HISTORY_FILTER_KEYS.TYPES, e.target.value)}
              >
                <option value="">All Features</option>
                {featureOptions.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => {
              setFilters({ [CONFIG_HISTORY_FILTER_KEYS.USER_IDS]: [], [CONFIG_HISTORY_FILTER_KEYS.TYPES]: [] });
              setExpanded(new Set());
            }}
            className="w-full py-1.5 text-xs bg-base-300 rounded hover:bg-base-200"
          >
            Clear
          </button>
        </div>

        <div id="config-history-scroll" className="flex-1 overflow-y-auto min-h-0">
          {loading && page === 1 ? (
            <div className="flex justify-center h-40 items-center">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : (
            <InfiniteScroll
              dataLength={history.length}
              next={() => setPage((p) => p + 1)}
              hasMore={hasMore}
              loader={
                <div className="flex justify-center py-4">
                  <span className="loading loading-spinner loading-md" />
                </div>
              }
              endMessage={
                history.length > 0 && <p className="text-center text-xs text-base-content/30 py-5">— All caught up —</p>
              }
              scrollableTarget="config-history-scroll"
            >
              <div className="space-y-4 pb-2">
                {draftItems.length > 0 && (
                  <div className="rounded-xl border border-warning/35 bg-warning/5 p-3 space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning" /> Draft
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30">
                        {draftItems.length} unpublished
                      </span>
                    </div>
                    {draftItems.map((item, i) => renderHistoryRow(item, `draft-${item.id ?? i}`, true))}
                  </div>
                )}

                {grouped.map(({ label, items }) => (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-semibold text-base-content/50 tracking-wider">{label}</span>
                      <div className="flex-1 h-px bg-base-300" />
                    </div>
                    <div className="space-y-2">
                      {items.map((item, i) => renderHistoryRow(item, `history-${item.id ?? `${label}-${i}`}`))}
                    </div>
                  </div>
                ))}

                {!draftItems.length && !grouped.length && (
                  <div className="text-center py-12 text-base-content/30">
                    <FileTextIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No history found</p>
                    {isBridgeScope && (
                      <p className="text-xs mt-1.5 text-base-content/25">
                        Bridge tab shows agent-level changes and version create/delete events
                      </p>
                    )}
                  </div>
                )}
              </div>
            </InfiniteScroll>
          )}
        </div>
      </div>
    </aside>
  );
}

export default ConfigHistorySlider;
