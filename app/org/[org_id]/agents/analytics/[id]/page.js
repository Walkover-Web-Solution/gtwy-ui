"use client";

import React, { use, useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useQueryParams } from "@/customHooks/useQueryParams";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getThread } from "@/store/action/historyAction";
import { getAgentAnalyticsAction } from "@/store/action/analyticsAction";
import { setSelectedVersion } from "@/store/reducer/historyReducer";
import Protected from "@/components/Protected";

import { BarChart3, X, Bot, Filter, ChevronDown, Wrench, BookOpen } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

import Sidebar from "@/components/historyPageComponents/Sidebar";
import BatchSubthreadPanel from "@/components/historyPageComponents/BatchSubthreadPanel";
import ThreadContainer from "@/components/historyPageComponents/ThreadContainer";
import { getStatsConfig, MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import ChatAiConfigDeatilViewModal from "@/components/modals/ChatAiConfigDeatilViewModal";
import { AnalyticsStatsSkeleton, AnalyticsChartSkeleton } from "@/components/skeletons/AnalyticsSkeleton";
import { getAgentAnalyticsFiltersApi } from "@/config/analyticsApi";

// URL params that must never be forwarded to the analytics API.
const UI_ONLY_QUERY_PARAMS = new Set([
  "thread_id",
  "subThread_id",
  "sub_thread_id",
  "batch_id",
  "message_id",
  "navigated",
  "type",
  "_rsc",
  "feedback",
  "version",
]);

const FEEDBACK_TO_API = { 1: "good", 2: "bad", good: "good", bad: "bad" };

function buildAnalyticsQueryParams(
  rawParams,
  { selectedVersion, filterByFields = {}, filterVariableRows = [{ key: "", value: "" }], extra = {} } = {}
) {
  const entries = typeof rawParams?.entries === "function" ? Object.fromEntries(rawParams.entries()) : { ...rawParams };

  const queryParams = {};
  for (const [key, value] of Object.entries(entries)) {
    if (UI_ONLY_QUERY_PARAMS.has(key) || value == null || value === "") continue;
    queryParams[key] = value;
  }

  const mappedFeedback = FEEDBACK_TO_API[entries.feedback];
  if (mappedFeedback) {
    queryParams.user_feedback = mappedFeedback;
  }

  if (queryParams.start) {
    queryParams.start_date = queryParams.start;
    delete queryParams.start;
  }
  if (queryParams.end) {
    queryParams.end_date = queryParams.end;
    delete queryParams.end;
  }
  if (queryParams.start_date || queryParams.end_date) {
    delete queryParams.range;
  } else {
    queryParams.range = queryParams.range || "30d";
  }

  if (selectedVersion && selectedVersion !== "all") {
    queryParams.version_id = selectedVersion;
  }

  if (!queryParams.tool_id) delete queryParams.tool_id;
  if (!queryParams.model) delete queryParams.model;
  if (!queryParams.knowledgebase_id) delete queryParams.knowledgebase_id;
  if (!queryParams.agent_id) delete queryParams.agent_id;
  if (!queryParams.interval) queryParams.interval = "1h";

  const activeFilterBy = {};
  if (filterByFields.thread_id?.trim()) activeFilterBy.thread_id = filterByFields.thread_id.trim();
  if (filterByFields.sub_thread_id?.trim()) activeFilterBy.sub_thread_id = filterByFields.sub_thread_id.trim();
  if (filterByFields.message_id?.trim()) activeFilterBy.message_id = filterByFields.message_id.trim();
  if (filterByFields.batch_id?.trim()) activeFilterBy.batch_id = filterByFields.batch_id.trim();
  if (filterByFields.user?.trim()) activeFilterBy.user = filterByFields.user.trim();
  if (filterByFields.llm_message?.trim()) activeFilterBy.llm_message = filterByFields.llm_message.trim();
  const presentVars = {};
  for (const row of filterVariableRows) {
    const k = row.key.trim();
    if (!k) continue;
    presentVars[k] = row.value.trim();
  }
  if (Object.keys(presentVars).length > 0) {
    activeFilterBy.variables = presentVars;
  }
  if (Object.keys(activeFilterBy).length > 0) {
    queryParams.filter_by = activeFilterBy;
  }

  return { ...queryParams, ...extra };
}

function Page({ params, searchParams }) {
  const resolvedSearchParams = use(searchParams);
  const resolvedParams = use(params);
  const search = useSearchParams();
  const pathName = usePathname();
  const dispatch = useDispatch();

  const { thread, analyticsData, selectedVersion, knowledgeBaseData, analyticsLoading, history_page_chatbot_token } =
    useCustomSelector((state) => {
      return {
        thread: state?.historyReducer?.thread || [],
        analyticsData: state?.analyticsReducer?.analyticsData?.[resolvedParams.id] || {},
        selectedVersion: state?.historyReducer?.selectedVersion || "all",
        knowledgeBaseData: state?.knowledgeBaseReducer?.knowledgeBaseData?.[resolvedParams?.org_id] || [],
        analyticsLoading: state?.analyticsReducer?.loading || false,
        history_page_chatbot_token: state?.bridgeReducer?.org?.[resolvedParams?.org_id]?.history_page_chatbot_token,
      };
    });

  // Derive pagination from analytics response
  const hasMore = analyticsData?.pagination?.has_more ?? false;

  // Map knowledge base IDs to their display names
  const knowledgeBaseNameMap = useMemo(() => {
    const map = {};
    knowledgeBaseData.forEach((kb) => {
      const id = kb._id || kb.id;
      if (id) map[id] = kb.title || kb.name || id;
    });
    return map;
  }, [knowledgeBaseData]);

  // Thread details slider reuses ThreadItem, whose "Debug Agent" action needs the
  // chatbot embed script — loaded here the same way the history page layout does it.
  const scriptId = "chatbot-main-script";
  const scriptSrcProd = process.env.NEXT_PUBLIC_CHATBOT_SCRIPT_SRC_PROD;

  useEffect(() => {
    if (!history_page_chatbot_token) return;

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      document.head.removeChild(existingScript);
    }

    const script = document.createElement("script");
    script.setAttribute("embedToken", history_page_chatbot_token);
    script.setAttribute("hideIcon", "true");
    script.id = scriptId;
    script.src = scriptSrcProd;
    document.head.appendChild(script);

    return () => {
      const script = document.getElementById(scriptId);
      if (script) {
        document.head.removeChild(script);
      }
    };
  }, [history_page_chatbot_token]);

  const [searchQuery, setSearchQuery] = useState(() => search.get("keyword") || "");
  const [page, setPage] = useState(1);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedSubThreadId, setSelectedSubThreadId] = useState(null);
  const [selectedBatchMessageId, setSelectedBatchMessageId] = useState(null);
  const [searchMessageId, setSearchMessageId] = useState(null);
  const [sidebarExpandedThreadId, setSidebarExpandedThreadId] = useState(null);
  const [sidebarExpandedSubThreadId, setSidebarExpandedSubThreadId] = useState(null);
  const [, setIsSliderOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [executionChartType, setExecutionChartType] = useState("area");
  const [latencyChartType, setLatencyChartType] = useState("area");

  const router = useRouter();
  const { buildUrl } = useQueryParams();
  const searchRef = useRef(null);
  const isFirstRender = useRef(true);
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState({
    filterByFields: {
      thread_id: "",
      sub_thread_id: "",
      message_id: "",
      batch_id: "",
      user: "",
      llm_message: "",
    },
    filterVariableRows: [{ key: "", value: "" }],
  });
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const customDropdownRef = useRef(null);

  // Search-by-fields state (moved out from sidebar for analytics)
  const [filterByFields, setFilterByFields] = useState({
    thread_id: "",
    sub_thread_id: "",
    message_id: "",
    batch_id: "",
    user: "",
    llm_message: "",
  });
  const [filterVariableRows, setFilterVariableRows] = useState([{ key: "", value: "" }]);
  const [isAdvanceFilterOpen, setIsAdvanceFilterOpen] = useState(false);
  const [showAllToolGroup, setShowAllToolGroup] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (customDropdownRef.current && !customDropdownRef.current.contains(e.target)) {
        setIsCustomOpen(false);
      }
    };
    if (isCustomOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isCustomOpen]);

  // Local state for the filter dropdown
  const getNormalizedRange = (r) => {
    if (r === "7") return "7d";
    if (r === "30") return "30d";
    if (r === "1" || r === "24") return "24h";
    return r || "30d";
  };

  const [filterStart, setFilterStart] = useState(resolvedSearchParams?.start || "");
  const [filterEnd, setFilterEnd] = useState(resolvedSearchParams?.end || "");
  const [filterRange, setFilterRange] = useState(getNormalizedRange(resolvedSearchParams?.range));
  const [filterInterval, setFilterInterval] = useState(resolvedSearchParams?.interval || "1h");
  const [filterFeedback, setFilterFeedback] = useState(resolvedSearchParams?.feedback || "all");
  const [filterError, setFilterError] = useState(resolvedSearchParams?.error === "true");
  const [filterReviewFailed, setFilterReviewFailed] = useState(resolvedSearchParams?.review_failed === "true");
  const parseArrayParam = (v) =>
    v
      ? String(v)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const [filterTool, setFilterTool] = useState(parseArrayParam(resolvedSearchParams?.tool_id));
  const [filterModel, setFilterModel] = useState(parseArrayParam(resolvedSearchParams?.model));
  const [filterKnowledgeBase, setFilterKnowledgeBase] = useState(
    parseArrayParam(resolvedSearchParams?.knowledgebase_id)
  );
  const [filterAgent, setFilterAgent] = useState(parseArrayParam(resolvedSearchParams?.agent_id));
  const [filterOptions, setFilterOptions] = useState({
    tools_data: {},
    unique_model: {},
    knowledgebase_data: {},
    agent_data: {},
  });

  const hasAnyFilter = Boolean(
    filterStart ||
    filterEnd ||
    (filterInterval && filterInterval !== "1h") ||
    filterFeedback !== "all" ||
    filterError ||
    filterReviewFailed ||
    filterTool.length ||
    filterModel.length ||
    filterKnowledgeBase.length ||
    filterAgent.length ||
    Object.values(filterByFields).some((v) => v && String(v).trim() !== "") ||
    filterVariableRows.some((row) => row.key.trim() || row.value.trim()) ||
    searchQuery.trim()
  );

  const hasAdvancedFilterValues = Boolean(
    Object.values(filterByFields).some((v) => v && String(v).trim() !== "") ||
    filterVariableRows.some((row) => row.key.trim() || row.value.trim())
  );

  // Auto-clear applied advanced filters when user manually empties all input fields
  useEffect(() => {
    if (!hasAdvancedFilterValues) {
      const hasAppliedFilters =
        Object.values(appliedAdvancedFilters.filterByFields).some((v) => v && String(v).trim() !== "") ||
        appliedAdvancedFilters.filterVariableRows.some((row) => row.key.trim() || row.value.trim());
      if (hasAppliedFilters) {
        setAppliedAdvancedFilters({
          filterByFields: { thread_id: "", sub_thread_id: "", message_id: "", batch_id: "", user: "", llm_message: "" },
          filterVariableRows: [{ key: "", value: "" }],
        });
      }
    }
  }, [hasAdvancedFilterValues, appliedAdvancedFilters]);

  // Derive sidebar thread list from analytics API response threads
  const historyData = useMemo(() => {
    const threads = analyticsData?.threads || [];
    // Preserve keyword-search payload (message + sub_thread.messages) from the API.
    return threads.map((t) => ({
      ...t,
      thread_id: t.thread_id,
      updated_at: t.updated_at,
      message: Array.isArray(t.message) ? t.message : [],
      sub_thread: Array.isArray(t.sub_thread)
        ? t.sub_thread
        : t.sub_thread_id
          ? [{ sub_thread_id: t.sub_thread_id }]
          : [],
    }));
  }, [analyticsData?.threads]);

  const summary = analyticsData?.summary || {};
  const requestsOverTime = analyticsData?.requests_over_time || [];
  const responseTime = analyticsData?.response_time || [];

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const executionData = requestsOverTime.map((item) => ({
    time: formatDate(item.t),
    success: item.success,
    failed: item.failed,
  }));

  const latencyData = responseTime.map((item) => ({
    time: formatDate(item.t),
    typical: Number(((item.typical || 0) / 1000).toFixed(2)),
    slow: Number(((item.slow || 0) / 1000).toFixed(2)),
    worst: Number(((item.worst || 0) / 1000).toFixed(2)),
  }));

  useEffect(() => {
    const urlVersion = search.get("version") || "all";
    if (urlVersion !== selectedVersion) {
      dispatch(setSelectedVersion(urlVersion));
    }
  }, [resolvedParams?.id, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const keyword = search.get("keyword") || "";
    setSearchQuery(keyword);
    if (searchRef.current) {
      searchRef.current.value = keyword;
    }
  }, [search]);

  useEffect(() => {
    return () => {
      dispatch(setSelectedVersion("all"));
    };
  }, [dispatch]);

  // Never restore thread/slider state or filters from URL on load or refresh.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);

    // Clear thread/slider UI keys
    const uiKeys = ["thread_id", "subThread_id", "message_id", "batch_id"];
    let dirty = false;
    uiKeys.forEach((key) => {
      if (p.has(key)) {
        p.delete(key);
        dirty = true;
      }
    });

    // Clear all filter keys
    const filterKeys = [
      "start",
      "end",
      "range",
      "interval",
      "feedback",
      "version",
      "tool_id",
      "model",
      "knowledgebase_id",
      "agent_id",
      "error",
      "review_failed",
      "keyword",
      "page",
    ];
    filterKeys.forEach((key) => {
      if (p.has(key)) {
        p.delete(key);
        dirty = true;
      }
    });

    if (dirty) {
      router.replace(`${pathName}?${p.toString()}`, undefined, { shallow: true });
    }

    // Reset thread/slider state
    setSelectedThreadId(null);
    setSelectedSubThreadId(null);
    setSelectedBatchMessageId(null);
    setSidebarExpandedThreadId(null);
    setSidebarExpandedSubThreadId(null);
    setIsSliderOpen(false);

    // Reset all filter states
    setFilterStart("");
    setFilterEnd("");
    setFilterRange("30d");
    setFilterInterval("1h");
    setFilterFeedback("all");
    setFilterError(false);
    setFilterReviewFailed(false);
    setFilterTool([]);
    setFilterModel([]);
    setFilterKnowledgeBase([]);
    setFilterAgent([]);
    setSearchQuery("");
    if (searchRef.current) searchRef.current.value = "";
    setFilterByFields({ thread_id: "", sub_thread_id: "", message_id: "", batch_id: "", user: "", llm_message: "" });
    setFilterVariableRows([{ key: "", value: "" }]);
    setAppliedAdvancedFilters({
      filterByFields: { thread_id: "", sub_thread_id: "", message_id: "", batch_id: "", user: "", llm_message: "" },
      filterVariableRows: [{ key: "", value: "" }],
    });
    dispatch(setSelectedVersion("all"));

    // Skip the 1-second initial delay so the clean fetch runs immediately on re-render
    isFirstRender.current = false;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!resolvedParams?.id) return;
    const fetchFilters = async () => {
      try {
        const data = await getAgentAnalyticsFiltersApi(resolvedParams.id);
        setFilterOptions({
          tools_data: data.tools_data || {},
          unique_model: data.unique_model || {},
          knowledgebase_data: data.knowledgebase_data || {},
          agent_data: data.agent_data || {},
        });
      } catch (e) {
        console.error("Failed to fetch filter options:", e);
      }
    };
    fetchFilters();
  }, [resolvedParams?.id]);

  const getAnalyticsQueryParams = useCallback(
    (extra = {}) =>
      buildAnalyticsQueryParams(search, {
        selectedVersion,
        filterByFields: appliedAdvancedFilters.filterByFields,
        filterVariableRows: appliedAdvancedFilters.filterVariableRows,
        extra,
      }),
    [search, selectedVersion, appliedAdvancedFilters]
  );

  const analyticsUrlKey = useMemo(() => {
    const params = new URLSearchParams(search.toString());
    ["thread_id", "subThread_id", "sub_thread_id", "batch_id", "message_id"].forEach((key) => {
      params.delete(key);
    });
    return params.toString();
  }, [search]);

  const memoizedSearchParams = useMemo(() => {
    const p = Object.fromEntries(search.entries());
    delete p.thread_id;
    delete p.subThread_id;
    delete p.message_id;
    delete p.batch_id;
    return p;
  }, [search]);

  // Fetch agent analytics (with a 1-second delay on refresh/initial mount, and immediately on subsequent updates)
  useEffect(() => {
    if (!resolvedParams?.id) return;
    const queryParams = getAnalyticsQueryParams();
    setPage(1);
    setTimeout(() => {
      dispatch(getAgentAnalyticsAction(resolvedParams.id, queryParams, resolvedParams.org_id));
    }, 1000);
  }, [resolvedParams?.id, resolvedParams?.org_id, analyticsUrlKey, selectedVersion, appliedAdvancedFilters, dispatch]);

  const dispatchAnalyticsWithAdvancedFilters = (nextAdvancedFilters) => {
    if (!resolvedParams?.id) return;
    setAppliedAdvancedFilters(nextAdvancedFilters);
  };

  const buildAnalyticsQueryParamsForFetch = (extra = {}) => getAnalyticsQueryParams(extra);

  const noop = useCallback(() => {}, []);
  const analyticsLoadingRef = useRef(analyticsLoading);
  useEffect(() => {
    analyticsLoadingRef.current = analyticsLoading;
  }, [analyticsLoading]);

  const fetchMoreData = useCallback(async () => {
    if (!hasMore || analyticsLoadingRef.current) return;
    const nextPage = page + 1;
    const queryParams = buildAnalyticsQueryParamsForFetch({ page: nextPage });
    await dispatch(getAgentAnalyticsAction(resolvedParams.id, queryParams, resolvedParams.org_id));
    setPage(nextPage);
  }, [hasMore, page, buildAnalyticsQueryParamsForFetch, resolvedParams.id, resolvedParams.org_id, dispatch]);

  const handleSearch = useCallback(
    (query) => {
      const trimmed = (query || "").trim();
      setSearchQuery(trimmed);
      const url = new URL(window.location.href);
      if (trimmed) {
        url.searchParams.set("keyword", trimmed);
      } else {
        url.searchParams.delete("keyword");
      }
      url.searchParams.delete("thread_id");
      url.searchParams.delete("subThread_id");
      url.searchParams.delete("message_id");
      url.searchParams.delete("batch_id");
      setSelectedThreadId(null);
      setSelectedSubThreadId(null);
      setSelectedBatchMessageId(null);
      setSearchMessageId(null);
      setSidebarExpandedThreadId(null);
      setSidebarExpandedSubThreadId(null);
      setIsSliderOpen(false);
      router.replace(url.pathname + url.search);
    },
    [router]
  );

  const handleAnalyticsSidebarSelect = useCallback((threadId, subThreadId) => {
    setSidebarExpandedThreadId(threadId);
    setSidebarExpandedSubThreadId(subThreadId);
  }, []);

  const threadHandler = useCallback(
    async (thread_id, item, options = {}) => {
      const opts = options && typeof options === "object" ? options : {};
      const firstSubThreadId =
        opts.subThreadId || item?.sub_thread?.[0]?.sub_thread_id || item?.sub_thread_id || thread_id;

      setSelectedThreadId(thread_id);
      setSelectedSubThreadId(firstSubThreadId);
      setSidebarExpandedThreadId(thread_id);
      setSidebarExpandedSubThreadId(firstSubThreadId);
      setIsSliderOpen(true);
      setSelectedBatchMessageId(null);

      dispatch(
        getThread({
          threadId: thread_id,
          bridgeId: resolvedParams.id,
          nextPage: 1,
          user_feedback: "all",
          subThreadId: firstSubThreadId,
          versionId: "",
          error: false,
        })
      );

      router.push(
        buildUrl(
          {
            thread_id: encodeURIComponent(String(thread_id).replace(/&/g, "%26")),
            subThread_id: encodeURIComponent(String(firstSubThreadId).replace(/&/g, "%26")),
            message_id: null,
            batch_id: null,
          },
          pathName
        )
      );
    },
    [pathName, router, buildUrl, resolvedParams.id, dispatch]
  );

  const handleAnalyticsMessageNavigate = useCallback(
    (messageId) => {
      router.push(buildUrl({ message_id: messageId || null }, pathName));
    },
    [pathName, router, buildUrl]
  );

  const handleSelectSubThread = useCallback(
    async (subThreadId, threadIdOverride) => {
      setSelectedBatchMessageId(null);
      setSearchMessageId(null);
      const threadId = threadIdOverride || selectedThreadId || sidebarExpandedThreadId;
      if (!threadId) return;

      setSelectedThreadId(threadId);
      setSelectedSubThreadId(subThreadId);
      setSidebarExpandedThreadId(threadId);
      setSidebarExpandedSubThreadId(subThreadId);
      setIsSliderOpen(true);

      dispatch(
        getThread({
          threadId,
          bridgeId: resolvedParams.id,
          nextPage: 1,
          user_feedback: "all",
          subThreadId,
          versionId: "",
          error: false,
        })
      );

      router.push(
        buildUrl(
          {
            thread_id: encodeURIComponent(String(threadId).replace(/&/g, "%26")),
            subThread_id: encodeURIComponent(String(subThreadId).replace(/&/g, "%26")),
            message_id: null,
            batch_id: null,
          },
          pathName
        )
      );
    },
    [pathName, selectedThreadId, sidebarExpandedThreadId, resolvedParams.id, dispatch, router, buildUrl]
  );

  const handleCloseAside = useCallback(() => {
    setSelectedThreadId(null);
    setSelectedSubThreadId(null);
    setSelectedBatchMessageId(null);
    setSearchMessageId(null);
    setIsSliderOpen(false);
    router.push(buildUrl({ thread_id: null, subThread_id: null, message_id: null, batch_id: null }, pathName));
  }, [pathName, router, buildUrl]);

  const handleSelectBatch = useCallback((messageId) => {
    setSearchMessageId(null);
    setSelectedBatchMessageId((prev) => (prev === messageId ? null : messageId));
  }, []);

  const handleThreadItemClick = useCallback((thread_id, item, value) => {
    if (value === "AiConfig" || value === "Latency" || value === "Memory") {
      setSelectedItem({ variables: item.variables, ...item, value });
      openModal(MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL);
    }
  }, []);

  const applyFilters = (updates = {}) => {
    const newStart = updates.start !== undefined ? updates.start : filterStart;
    const newEnd = updates.end !== undefined ? updates.end : filterEnd;
    const newRange = updates.range !== undefined ? updates.range : filterRange;
    const newInterval = updates.interval !== undefined ? updates.interval : filterInterval;
    const newFeedback = updates.feedback !== undefined ? updates.feedback : filterFeedback;
    const newError = updates.error !== undefined ? updates.error : filterError;
    const newReviewFailed = updates.review_failed !== undefined ? updates.review_failed : filterReviewFailed;
    const newTool = updates.tool_id !== undefined ? updates.tool_id : filterTool;
    const newModel = updates.model !== undefined ? updates.model : filterModel;
    const newKnowledgeBase = updates.knowledgebase_id !== undefined ? updates.knowledgebase_id : filterKnowledgeBase;
    const newAgent = updates.agent_id !== undefined ? updates.agent_id : filterAgent;

    router.push(
      buildUrl(
        {
          start: newStart || null,
          end: newEnd || null,
          range: !newStart && !newEnd && newRange ? newRange : null,
          interval: newInterval || null,
          feedback: newFeedback && newFeedback !== "all" ? newFeedback : null,
          error: newError ? "true" : null,
          review_failed: newReviewFailed ? "true" : null,
          tool_id: newTool?.length ? newTool.join(",") : null,
          model: newModel?.length ? newModel.join(",") : null,
          knowledgebase_id: newKnowledgeBase?.length ? newKnowledgeBase.join(",") : null,
          agent_id: newAgent?.length ? newAgent.join(",") : null,
          // clear thread selection so sidebar doesn't auto-expand and thread_id doesn't leak to API
          thread_id: null,
          subThread_id: null,
          message_id: null,
          batch_id: null,
        },
        pathName
      )
    );
  };

  const clearFilters = () => {
    setFilterStart("");
    setFilterEnd("");
    setFilterRange("30d");
    setFilterInterval("1h");
    setFilterFeedback("all");
    setFilterError(false);
    setFilterReviewFailed(false);
    setFilterTool([]);
    setFilterModel([]);
    setFilterKnowledgeBase([]);
    setFilterAgent([]);
    setFilterByFields({ thread_id: "", sub_thread_id: "", message_id: "", batch_id: "", user: "", llm_message: "" });
    setFilterVariableRows([{ key: "", value: "" }]);
    dispatch(setSelectedVersion("all"));
    setIsCustomOpen(false);

    const emptyAdvancedFilters = {
      filterByFields: { thread_id: "", sub_thread_id: "", message_id: "", batch_id: "", user: "", llm_message: "" },
      filterVariableRows: [{ key: "", value: "" }],
    };
    setAppliedAdvancedFilters(emptyAdvancedFilters);

    router.push(
      buildUrl(
        {
          start: null,
          end: null,
          range: null,
          interval: "1h",
          feedback: null,
          error: null,
          tool_id: null,
          model: null,
          knowledgebase_id: null,
          agent_id: null,
          review_failed: null,
          keyword: null,
          thread_id: null,
          subThread_id: null,
          message_id: null,
          batch_id: null,
        },
        pathName
      )
    );

    if (document.activeElement) {
      document.activeElement.blur();
    }
  };

  return (
    <div className="flex h-[calc(100vh-40px)] w-full overflow-hidden bg-base-200/50">
      {/* Main Dashboard Area */}
      <div className="flex-1 relative flex flex-row max-w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Dashboard Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-base-content">Agent Analytics</h1>
                <p className="text-sm text-base-content/60 mt-1">
                  Overview of agent performance and execution history.
                </p>
              </div>
            </div>

            {/* KPI Stats Row */}
            {Object.keys(summary).length === 0 ? (
              <AnalyticsStatsSkeleton />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
                {getStatsConfig(summary).map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-start">
                        <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                          <Icon size={16} />
                        </div>
                        <div
                          className={`flex items-center gap-1 text-xs font-semibold ${stat.trend === "up" ? "text-emerald-500" : "text-red-500"}`}
                        >
                          {stat.change}
                        </div>
                      </div>
                      <div className="flex flex-col mt-2">
                        <p className="text-xl font-bold text-base-content">{stat.value}</p>
                        <h3 className="text-[11px] font-medium text-base-content/60 mt-0.5">{stat.title}</h3>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Filters Container */}
            <div className="bg-base-100 border border-base-300 rounded-lg  mb-8 shadow-sm">
              {/* Row 1: Time Range, Interval, Feedback, Error, Advance Toggle */}
              <div className="flex items-center gap-4 px-4 py-1.5 flex-wrap">
                {/* Time Range */}
                <span className="text-[11px] font-bold tracking-widest text-base-content/40 uppercase shrink-0">
                  Time Range
                </span>
                <div className="flex gap-1.5 shrink-0 ">
                  {[
                    { label: "24h", value: "24h" },
                    { label: "7d", value: "7d" },
                    { label: "30d", value: "30d" },
                  ].map((item) => {
                    const isActive = filterRange === item.value && !filterStart && !filterEnd;

                    return (
                      <button
                        key={item.value}
                        onClick={() => {
                          setFilterRange(item.value);
                          setFilterStart("");
                          setFilterEnd("");
                          applyFilters({ range: item.value, start: "", end: "" });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          isActive ? "bg-blue-500 text-white" : "bg-base-200 text-base-content/70 hover:bg-base-300"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}

                  {/* Custom Date Dropdown replacing the pill */}
                  <div ref={customDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCustomOpen(!isCustomOpen)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border-none outline-none focus:outline-none focus:ring-0 ${
                        filterStart || filterEnd
                          ? "bg-blue-500 text-white"
                          : "bg-base-200 text-base-content/70 hover:bg-base-300"
                      }`}
                    >
                      Custom
                    </button>
                    {isCustomOpen && (
                      <div className="absolute left-0 z-50 menu p-4 shadow-xl border border-base-300 bg-base-100 rounded-box w-80 ">
                        <h3 className="font-semibold text-sm mb-4 text-base-content">Custom Date Range</h3>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-base-content/70 mb-1">Start Date</label>
                            <input
                              type="datetime-local"
                              className="input input-sm input-bordered w-full text-xs"
                              value={filterStart}
                              max={filterEnd}
                              onChange={(e) => {
                                setFilterStart(e.target.value);
                                setFilterRange("");
                              }}
                              onClick={(e) => e.target.showPicker()}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-base-content/70 mb-1">End Date</label>
                            <input
                              type="datetime-local"
                              className="input input-sm input-bordered w-full text-xs"
                              value={filterEnd}
                              min={filterStart}
                              onChange={(e) => {
                                setFilterEnd(e.target.value);
                                setFilterRange("");
                              }}
                              onClick={(e) => e.target.showPicker()}
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              className="btn btn-sm btn-primary flex-1"
                              disabled={!filterStart && !filterEnd}
                              onClick={() => {
                                applyFilters();
                                setIsCustomOpen(false);
                                if (document.activeElement) document.activeElement.blur();
                              }}
                            >
                              Apply
                            </button>
                            <button
                              className="btn btn-sm btn-outline flex-1"
                              disabled={!hasAnyFilter}
                              onClick={() => {
                                clearFilters();
                                setIsCustomOpen(false);
                              }}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-px h-4 bg-base-300 shrink-0"></div>

                {/* Interval */}
                <span className="text-[11px] font-bold tracking-widest text-base-content/40 uppercase shrink-0">
                  Interval
                </span>
                <div className="flex gap-1.5 shrink-0">
                  {[
                    { label: "1h", value: "1h" },
                    { label: "3h", value: "3h" },
                    { label: "6h", value: "6h" },
                    { label: "12h", value: "12h" },
                    { label: "24h", value: "24h" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => {
                        const newInterval = filterInterval === item.value ? "" : item.value;
                        setFilterInterval(newInterval);
                        applyFilters({ interval: newInterval });
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        filterInterval === item.value
                          ? "bg-blue-500 text-white"
                          : "bg-base-200 text-base-content/70 hover:bg-base-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="w-px h-4 bg-base-300 shrink-0"></div>

                {/* Feedback */}
                <span className="text-[11px] font-bold tracking-widest text-base-content/40 uppercase shrink-0">
                  Feedback
                </span>
                <div className="flex gap-1.5 shrink-0">
                  {[
                    { label: "Any", value: "all" },
                    { label: "Good", value: "1" },
                    { label: "Bad", value: "2" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setFilterFeedback(item.value);
                        applyFilters({ feedback: item.value });
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        filterFeedback === item.value
                          ? "bg-blue-500 text-white"
                          : "bg-base-200 text-base-content/70 hover:bg-base-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Reviewer Failures Toggle */}
                <label
                  className={`flex items-center gap-2 cursor-pointer shrink-0 px-3 py-1.5 rounded-full transition-colors ${
                    filterReviewFailed ? "bg-[#FD9900] text-white border border-[#FD9900]" : "border border-base-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className={`toggle toggle-sm scale-75 origin-center ${filterReviewFailed ? "toggle-warning" : ""}`}
                    checked={filterReviewFailed}
                    onChange={(e) => {
                      setFilterReviewFailed(e.target.checked);
                      applyFilters({ review_failed: e.target.checked });
                    }}
                  />
                  <span className={`text-xs font-medium ${filterReviewFailed ? "text-white" : "text-base-content/70"}`}>
                    Reviewer Failures
                  </span>
                </label>

                {/* Error Toggle */}
                <label
                  className={`flex items-center gap-2 cursor-pointer shrink-0 px-3 py-1.5 rounded-full transition-colors ${
                    filterError ? "bg-[#FA2C36] text-white border border-[#FA2C36]" : "border border-base-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className={`toggle toggle-sm scale-75 origin-center ${filterError ? "toggle-error" : ""}`}
                    checked={filterError}
                    onChange={(e) => {
                      setFilterError(e.target.checked);
                      applyFilters({ error: e.target.checked });
                    }}
                  />
                  <span className={`text-xs font-medium ${filterError ? "text-white" : "text-base-content/70"}`}>
                    Error History
                  </span>
                </label>

                {/* Advance Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setIsAdvanceFilterOpen(!isAdvanceFilterOpen)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${
                    isAdvanceFilterOpen
                      ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:border-primary/40"
                      : "bg-base-100 text-base-content/70 border-base-200 hover:bg-primary/5 hover:text-primary hover:border-primary/40 dark:bg-base-100 dark:hover:bg-primary/10 dark:hover:text-primary"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Search by Fields
                  <ChevronDown className={`w-4 h-4 transition-transform ${isAdvanceFilterOpen ? "rotate-180" : ""}`} />
                </button>

                {hasAnyFilter && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
              </div>

              {/* Row 2: Advance Filters (expandable inside same container) */}
              <div
                className={`overflow-hidden px-4 pt-2 transition-all duration-300 ${
                  isAdvanceFilterOpen
                    ? "max-h-[600px] opacity-100  pt-3 pb-3 border-t border-base-200 dark:border-t-base-200 bg-[#F8FAFC] dark:bg-base-200/50 space-y-4"
                    : "max-h-0 opacity-0"
                }`}
              >
                {/* Tool, Knowledge Base, Agent & Model badges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
                  {/* Col 1: Tool + Knowledge Base + Agent */}
                  <div>
                    <span className="text-[11px] font-bold tracking-widest text-base-content/40 uppercase block mb-1.5">
                      Tool
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Single All button for Tool + KB + Agent */}
                      <button
                        onClick={() => {
                          setFilterTool([]);
                          setFilterKnowledgeBase([]);
                          setFilterAgent([]);
                          applyFilters({ tool_id: [], knowledgebase_id: [], agent_id: [] });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          !filterTool.length && !filterKnowledgeBase.length && !filterAgent.length
                            ? "bg-blue-500 text-white"
                            : "bg-base-200 text-base-content/70 hover:bg-base-300"
                        }`}
                      >
                        All
                      </button>

                      {/* Combined Tool + KB + Agent badges */}
                      {(() => {
                        const allItems = [
                          ...Object.entries(filterOptions.tools_data).map(([name, id]) => ({ type: "tool", name, id })),
                          ...Object.entries(filterOptions.knowledgebase_data).map(([name, id]) => ({
                            type: "kb",
                            name: knowledgeBaseNameMap[id] || name,
                            id,
                          })),
                          ...Object.entries(filterOptions.agent_data).map(([name, id]) => ({
                            type: "agent",
                            name,
                            id,
                          })),
                        ];
                        const isSelected = (item) => {
                          if (item.type === "tool") return filterTool.includes(item.id);
                          if (item.type === "kb") return filterKnowledgeBase.includes(item.id);
                          return filterAgent.includes(item.id);
                        };
                        const toggle = (item) => {
                          if (item.type === "tool") {
                            const next = filterTool.includes(item.id)
                              ? filterTool.filter((t) => t !== item.id)
                              : [...filterTool, item.id];
                            setFilterTool(next);
                            applyFilters({ tool_id: next });
                          } else if (item.type === "kb") {
                            const next = filterKnowledgeBase.includes(item.id)
                              ? filterKnowledgeBase.filter((k) => k !== item.id)
                              : [...filterKnowledgeBase, item.id];
                            setFilterKnowledgeBase(next);
                            applyFilters({ knowledgebase_id: next });
                          } else {
                            const next = filterAgent.includes(item.id)
                              ? filterAgent.filter((a) => a !== item.id)
                              : [...filterAgent, item.id];
                            setFilterAgent(next);
                            applyFilters({ agent_id: next });
                          }
                        };
                        const visibleItems = showAllToolGroup ? allItems : allItems.slice(0, 8);
                        return (
                          <>
                            {visibleItems.map((item) => {
                              const selected = isSelected(item);
                              const iconColor = selected
                                ? "text-white"
                                : item.type === "tool"
                                  ? "text-amber-500"
                                  : item.type === "kb"
                                    ? "text-emerald-500"
                                    : "text-violet-500";
                              return (
                                <button
                                  key={`${item.type}-${item.id}`}
                                  onClick={() => toggle(item)}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                                    selected
                                      ? "bg-blue-500 text-white"
                                      : "bg-base-200 text-base-content/70 hover:bg-base-300"
                                  }`}
                                  title={item.name}
                                >
                                  {item.type === "tool" && <Wrench className={`w-3 h-3 ${iconColor}`} />}
                                  {item.type === "kb" && <BookOpen className={`w-3 h-3 ${iconColor}`} />}
                                  {item.type === "agent" && <Bot className={`w-3 h-3 ${iconColor}`} />}
                                  {item.name.length > 18 ? item.name.slice(0, 18) + "..." : item.name}
                                </button>
                              );
                            })}
                            {allItems.length > 8 && (
                              <button
                                onClick={() => setShowAllToolGroup(!showAllToolGroup)}
                                className="px-3 py-1 rounded-full text-xs font-medium transition-colors border border-dashed border-base-content/30 text-base-content/60 hover:border-base-content/50 hover:text-base-content"
                              >
                                {showAllToolGroup ? "Less" : `+${allItems.length - 8} More`}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Col 2: Model */}
                  <div>
                    <span className="text-[11px] font-bold tracking-widest text-base-content/40 uppercase block mb-1.5">
                      Model
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => {
                          setFilterModel([]);
                          applyFilters({ model: [] });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          !filterModel.length
                            ? "bg-blue-500 text-white"
                            : "bg-base-200 text-base-content/70 hover:bg-base-300"
                        }`}
                      >
                        All
                      </button>
                      {(showAllModels
                        ? Object.entries(filterOptions.unique_model).flatMap(([service, models]) =>
                            models.map((m) => ({ service, model: m }))
                          )
                        : Object.entries(filterOptions.unique_model)
                            .flatMap(([service, models]) => models.map((m) => ({ service, model: m })))
                            .slice(0, 4)
                      ).map(({ service, model: m }) => (
                        <button
                          key={`${service}-${m}`}
                          onClick={() => {
                            const next = filterModel.includes(m)
                              ? filterModel.filter((x) => x !== m)
                              : [...filterModel, m];
                            setFilterModel(next);
                            applyFilters({ model: next });
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            filterModel.includes(m)
                              ? "bg-blue-500 text-white"
                              : "bg-base-200 text-base-content/70 hover:bg-base-300"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                      {Object.entries(filterOptions.unique_model).flatMap(([service, models]) => models.map((m) => m))
                        .length > 4 && (
                        <button
                          onClick={() => setShowAllModels(!showAllModels)}
                          className="px-3 py-1 rounded-full text-xs font-medium transition-colors border border-dashed border-base-content/30 text-base-content/60 hover:border-base-content/50 hover:text-base-content"
                        >
                          {showAllModels
                            ? "Less"
                            : `+${Object.entries(filterOptions.unique_model).flatMap(([service, models]) => models.map((m) => m)).length - 4} More`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Search by Fields */}
                <div className="">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { key: "thread_id", label: "Thread ID" },
                      { key: "sub_thread_id", label: "Sub Thread ID" },
                      { key: "message_id", label: "Message ID" },
                      { key: "batch_id", label: "Batch ID" },
                      { key: "user", label: "User" },
                      { key: "llm_message", label: "LLM Message" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium text-base-content/70 mb-0.5">{f.label}</label>
                        <input
                          type="text"
                          className="input input-sm input-bordered w-full rounded-lg text-xs"
                          placeholder={`Search ${f.label.toLowerCase()}...`}
                          value={filterByFields[f.key] || ""}
                          onChange={(e) => setFilterByFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-xs font-medium text-base-content/70 mb-0.5">Present Variables</label>
                      <div className="space-y-2">
                        {filterVariableRows.map((row, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              className="input input-sm rounded-lg input-bordered flex-1 text-xs"
                              placeholder="key"
                              value={row.key}
                              onChange={(e) => {
                                const next = [...filterVariableRows];
                                next[idx].key = e.target.value;
                                setFilterVariableRows(next);
                              }}
                            />
                            <input
                              type="text"
                              className="input input-sm rounded-lg input-bordered flex-1 text-xs"
                              placeholder="value"
                              value={row.value}
                              onChange={(e) => {
                                const next = [...filterVariableRows];
                                next[idx].value = e.target.value;
                                setFilterVariableRows(next);
                              }}
                            />
                            {filterVariableRows.length > 1 && (
                              <button
                                type="button"
                                className="px-2 py-1 rounded-md text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                                onClick={() => {
                                  const next = filterVariableRows.filter((_, i) => i !== idx);
                                  setFilterVariableRows(next.length ? next : [{ key: "", value: "" }]);
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          className="px-3 py-1 rounded-md text-xs font-medium border border-dashed border-base-content/30 text-base-content/60 hover:border-base-content/50 hover:text-base-content transition-colors"
                          onClick={() => setFilterVariableRows((prev) => [...prev, { key: "", value: "" }])}
                        >
                          + Add Key/Value
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-3">
                    <button
                      className="px-5 py-1 rounded-lg text-sm font-medium border border-base-200 text-base-content/70 hover:bg-primary/5 hover:text-primary hover:border-primary/40 dark:hover:bg-primary/10 dark:hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={!hasAdvancedFilterValues}
                      onClick={() => {
                        const emptyFields = {
                          thread_id: "",
                          sub_thread_id: "",
                          message_id: "",
                          batch_id: "",
                          user: "",
                          llm_message: "",
                        };
                        setFilterByFields(emptyFields);
                        setFilterVariableRows([{ key: "", value: "" }]);
                        dispatchAnalyticsWithAdvancedFilters({
                          filterByFields: emptyFields,
                          filterVariableRows: [{ key: "", value: "" }],
                        });
                      }}
                    >
                      Reset Fields
                    </button>
                    <button
                      className="px-5 py-1 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={!hasAdvancedFilterValues}
                      onClick={() => {
                        if (document.activeElement) document.activeElement.blur();
                        dispatchAnalyticsWithAdvancedFilters({
                          filterByFields,
                          filterVariableRows,
                        });
                      }}
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Success / Failure Chart */}
              <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-semibold text-base-content">Execution Volume</h3>
                    <p className="text-xs text-base-content/60">Success vs Failed runs over time</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExecutionChartType((prev) => (prev === "area" ? "bar" : "area"))}
                      className="btn btn-ghost btn-xs btn-circle"
                      title="Toggle bar / area"
                    >
                      <BarChart3 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-[240px]">
                  {analyticsData?.requests_over_time === undefined ? (
                    <AnalyticsChartSkeleton title="Execution Volume" />
                  ) : executionData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <BarChart3 className="w-10 h-10 text-base-content/30 mb-2" />
                      <p className="text-sm text-base-content/50">No content</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={executionData}>
                        <defs>
                          <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: "#9ca3af", fontSize: "11px" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: "11px" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            fontSize: "12px",
                            borderRadius: "4px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        {executionChartType === "area" ? (
                          <>
                            <Area
                              type="monotone"
                              dataKey="success"
                              stroke="#10b981"
                              strokeWidth={2}
                              fill="url(#gradSuccess)"
                            />
                            <Area
                              type="monotone"
                              dataKey="failed"
                              stroke="#ef4444"
                              strokeWidth={2}
                              fill="url(#gradFailed)"
                            />
                          </>
                        ) : (
                          <>
                            <Bar dataKey="success" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </>
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Latency Chart */}
              <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-semibold text-base-content">Average Latency</h3>
                    <p className="text-xs text-base-content/60">Agent response time (s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLatencyChartType((prev) => (prev === "area" ? "bar" : "area"))}
                      className="btn btn-ghost btn-xs btn-circle"
                      title="Toggle bar / area"
                    >
                      <BarChart3 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-[240px]">
                  {analyticsData?.response_time === undefined ? (
                    <AnalyticsChartSkeleton title="Average Latency" />
                  ) : latencyData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <BarChart3 className="w-10 h-10 text-base-content/30 mb-2" />
                      <p className="text-sm text-base-content/50">No content</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={latencyData}>
                        <defs>
                          <linearGradient id="gradWorst" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="gradSlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="gradTypical" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: "#9ca3af", fontSize: "11px" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: "11px" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            fontSize: "12px",
                            borderRadius: "4px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        {latencyChartType === "area" ? (
                          <>
                            <Area
                              type="monotone"
                              dataKey="worst"
                              stroke="#ef4444"
                              strokeWidth={2}
                              fill="url(#gradWorst)"
                            />
                            <Area
                              type="monotone"
                              dataKey="slow"
                              stroke="#f59e0b"
                              strokeWidth={2}
                              fill="url(#gradSlow)"
                            />
                            <Area
                              type="monotone"
                              dataKey="typical"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              fill="url(#gradTypical)"
                            />
                          </>
                        ) : (
                          <>
                            <Bar dataKey="worst" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="slow" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="typical" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </>
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Backdrop overlay when slider is open */}
        {selectedThreadId && (
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-30 transition-opacity duration-300"
            onClick={handleCloseAside}
          />
        )}

        {/* Slide-in Thread Detail Panel - right to left */}
        <div
          className={`absolute top-0 right-0 h-full bg-base-100 shadow-2xl border-l border-base-300 z-40 flex flex-col transform transition-transform duration-300 ease-in-out ${
            selectedThreadId ? "translate-x-0 w-[85%]" : "translate-x-full w-[85%]"
          }`}
        >
          <div className="h-14 border-b border-base-300 flex items-center justify-between px-4 bg-base-100 shrink-0">
            <h3 className="font-semibold text-sm truncate">Thread Details</h3>
            <button onClick={handleCloseAside} className="btn btn-ghost btn-sm btn-circle shrink-0">
              <X size={16} className="text-base-content/60 hover:text-base-content" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <ThreadContainer
              thread={
                selectedBatchMessageId && !searchMessageId
                  ? thread.filter((msg) => msg?.message_id === selectedBatchMessageId)
                  : thread
              }
              searchParamsHook={search}
              isFetchingMore={false}
              setIsFetchingMore={() => {}}
              searchMessageId={searchMessageId}
              setSearchMessageId={setSearchMessageId}
              keepSearchMessageId={true}
              fillParent={true}
              pathName={pathName}
              search={search}
              historyData={historyData}
              threadHandler={handleThreadItemClick}
              setLoading={() => {}}
              threadPage={1}
              setThreadPage={() => {}}
              hasMoreThreadData={false}
              setHasMoreThreadData={() => {}}
              selectedVersion={"all"}
              previousPrompt={""}
              isErrorTrue={false}
            />
          </div>
        </div>
      </div>

      {/* Batch Subthread Panel - between main content and sidebar */}
      <BatchSubthreadPanel
        thread={thread}
        subThreadIdFromURL={selectedSubThreadId}
        parentThreadId={selectedThreadId}
        selectedBatchMessageId={selectedBatchMessageId}
        onSelectBatch={handleSelectBatch}
        onSelectSubThread={handleSelectSubThread}
      />

      {/* Right Sidebar */}
      <div className="h-full shrink-0 z-50 flex relative">
        <Sidebar
          historyData={historyData}
          threadHandler={threadHandler}
          fetchMoreData={fetchMoreData}
          hasMore={hasMore}
          loading={analyticsLoading}
          params={resolvedParams}
          searchParams={memoizedSearchParams}
          setSearchMessageId={setSearchMessageId}
          searchMessageId={searchMessageId}
          onAnalyticsMessageNavigate={handleAnalyticsMessageNavigate}
          setPage={setPage}
          setHasMore={noop}
          filterOption={filterFeedback}
          setFilterOption={setFilterFeedback}
          searchRef={searchRef}
          setThreadPage={noop}
          selectedVersion={selectedVersion}
          setIsErrorTrue={setFilterError}
          isErrorTrue={filterError}
          activeFilterByRef={undefined}
          isAnalytics={true}
          handleSearch={handleSearch}
          selectedThreadId={selectedThreadId}
          sidebarExpandedThreadId={sidebarExpandedThreadId}
          sidebarExpandedSubThreadId={sidebarExpandedSubThreadId}
          onAnalyticsSidebarSelect={handleAnalyticsSidebarSelect}
          onAnalyticsSelectSubThread={handleSelectSubThread}
        />
      </div>

      <ChatAiConfigDeatilViewModal
        modalContent={
          selectedItem?.value === "Latency"
            ? selectedItem?.latency
            : selectedItem?.value === "Memory"
              ? selectedItem?.memoryContent
              : selectedItem?.AiConfig
        }
        modalTitle={
          selectedItem?.value === "Latency"
            ? "Latency Details"
            : selectedItem?.value === "Memory"
              ? "Memory"
              : "AI Configuration"
        }
      />
    </div>
  );
}

export default Protected(Page);
