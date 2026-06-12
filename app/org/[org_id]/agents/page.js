/* eslint-disable no-commented-code/no-commented-code, unused-imports/no-unused-imports, unused-imports/no-unused-vars */
"use client";
import CreateNewBridge from "@/components/CreateNewBridge";
import CustomTable from "@/components/customTable/CustomTable";
import MainLayout from "@/components/layoutComponents/MainLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import OnBoarding from "@/components/OnBoarding";
import PageHeader from "@/components/Pageheader";
import Protected from "@/components/Protected";
import TutorialSuggestionToast from "@/components/TutorialSuggestoinToast";
import { useCustomSelector } from "@/customHooks/customSelector";
import OpenAiIcon from "@/icons/OpenAiIcon";
import { AgentMenuItems } from "@/components/agents/AgentActionMenu";
import {
  clearBridgeUsageMetricsAction,
  deleteBridgeAction,
  fetchBridgeUsageMetricsAction,
} from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import useTutorialVideos from "@/hooks/useTutorialVideos";
import { getIconOfService, openModal, formatRelativeTime, formatDate } from "@/utils/utility";
import ResourcePage from "@/components/folders/ResourcePage";
import FolderTabs from "@/components/folders/FolderTabs";
import MoveToFolderMenu from "@/components/folders/MoveToFolderMenu";
import useFolders from "@/hooks/useFolders";
import { useFolderContext } from "@/components/folders/FolderContext";
import { Folder, Funnel, Undo2, Infinity, Trash2 } from "lucide-react";

import { ClockIcon, EllipsisIcon } from "@/components/Icons";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import usePortalDropdown from "@/customHooks/usePortalDropdown";
import SearchItems from "@/components/UI/SearchItems";
import AgentEmptyState from "@/components/AgentEmptyState";
import DeleteModal from "@/components/UI/DeleteModal";
import AccessManagementModal from "@/components/modals/AccessManagementModal";
import ConfigureEnvironmentModal from "@/components/modals/ConfigureEnvironmentModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";

export const runtime = "edge";
const ModelBadge = ({ model, service, modelsConfig }) => {
  if (!model) return null;

  // Get custom model name from modelsConfig if available
  const modelConfig = modelsConfig?.[service]?.[model];
  const displayName = modelConfig?.value !== undefined ? modelConfig.value : model;

  return (
    <span
      className="mt-1 inline-flex w-fit max-w-xs items-center gap-1 rounded-full border border-base-300/70 bg-base-200/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-base-content/60"
      title={displayName || model}
    >
      <span className="truncate text-base-content/70 normal-case max-w-[140px]">{displayName || model}</span>
    </span>
  );
};

const formatUsageNumber = (value, maximumFractionDigits = 2) => {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(numericValue);
};

const UsageProgressDonut = ({ percent, label }) => (
  <div className="relative h-16 w-16">
    <div
      className="h-full w-full rounded-full border border-base-300 bg-base-200"
      style={{
        background: `conic-gradient(#3b82f6 ${percent}%, rgba(59,130,246,0.15) ${percent}% 100%)`,
      }}
    />
    <div className="absolute inset-[6px] flex items-center justify-center rounded-full bg-base-100 text-xs font-semibold text-base-content/70">
      {label}
    </div>
  </div>
);

export const UsageSummaryPopover = ({ stats, item, isEmbedUser, onSetLimit, onResetUsage }) => {
  const { hasLimit, usagePercent, usageValue, limitValue, remaining } = stats;
  const [limit, setLimit] = useState(limitValue ?? "");
  const [resetPeriod, setResetPeriod] = useState(item?.bridge_limit_reset_period ?? "");
  const [isLimitDirty, setIsLimitDirty] = useState(false);

  const handleLimitChange = (e) => {
    const value = e.target.value;
    setLimit(value);
    const original = limitValue ?? "";
    setIsLimitDirty(String(value) !== String(original) || resetPeriod !== (item?.bridge_limit_reset_period ?? ""));
  };

  const handleResetPeriodChange = (e) => {
    const value = e.target.value;
    setResetPeriod(value);
    setIsLimitDirty(String(limit) !== String(limitValue ?? "") || value !== (item?.bridge_limit_reset_period ?? ""));
  };

  return (
    <div className="w-72 p-4 space-y-4 text-base-content">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Usage &amp; Limits</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <UsageProgressDonut
          percent={hasLimit ? usagePercent : 0}
          label={hasLimit ? `${Math.round(usagePercent)}%` : "--"}
        />
        <div className="flex-1 space-y-2 text-sm">
          <div className="flex gap-1 items-center justify-between">
            <span className="text-base-content/60">Limit</span>
            <input
              autoComplete="off"
              type="number"
              placeholder="Enter limit in $"
              className="input input-bordered max-w-sm w-full input-sm"
              value={limit}
              min="0"
              step="0.0001"
              onChange={handleLimitChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base-content/60">Used</span>
            <span className="font-semibold">{formatUsageNumber(usageValue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base-content/60">Remaining</span>
            <span className="font-semibold">{hasLimit ? formatUsageNumber(remaining) : "—"}</span>
          </div>
        </div>
      </div>

      {!isEmbedUser && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1 items-center justify-between text-sm">
            <span className="text-base-content/60">Reset Period</span>
            <select
              className="select select-bordered select-sm w-36"
              value={resetPeriod}
              onChange={handleResetPeriodChange}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              onSetLimit(item, limit, resetPeriod);
            }}
            disabled={!isLimitDirty}
          >
            Set / Update Limit
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onResetUsage} disabled={!Number(usageValue)}>
            Reset Usage
          </button>
        </div>
      )}
    </div>
  );
};

// Column label mapping for table headers
const getColumnLabel = (column) => {
  switch (column) {
    case "averageResponseTime":
      return "Average Response Time";
    case "totalTokens":
      return "Tokens";
    case "cost":
      return "Cost $";
    case "promptDetails":
      return "Prompt Details";
    case "last_used":
      return "Last Run";
    case "created_at":
    case "createdAt":
      return "Created At";
    case "updated_at":
    case "updatedAt":
      return "Updated At";
    case "created_by":
      return "Created By";
    case "updated_by":
      return "Updated By";
    case "agent_limit":
      return "Limit $";
    case "apikey_usage":
      return "Apikey Usage";
    case "agent_usage":
      return "Agent Usage";
    case "embed_usage":
      return "Embed Usage";
    default:
      return column.replace(/_/g, " ");
  }
};

const customCellRenderers = {
  cost: (row) => row.cost,
  totalTokens: (row) => row.totalTokens,
};

// Empty cell component without tooltip
const EmptyCell = () => "";

// Loading skeleton component for usage metrics
const LoadingSkeleton = () => <div className="w-8 h-4 bg-base-300 rounded animate-pulse"></div>;

const renderCreatedByCell = (createdBy, timestamp) => {
  if (!createdBy) {
    return <EmptyCell />;
  }

  // If no timestamp, just show the user name without hover behavior
  if (!timestamp) {
    return (
      <div className="w-[120px]">
        <span title={createdBy} className="truncate block flex-1">
          {createdBy}
        </span>
      </div>
    );
  }

  // If timestamp exists, show user name with date on hover
  return (
    <div className="group cursor-help w-[120px]">
      <span title={createdBy} className="group-hover:hidden  truncate block flex-1">
        {createdBy}
      </span>
      <span title={createdBy} className="hidden group-hover:inline">
        {formatDate(timestamp)}
      </span>
    </div>
  );
};

const renderUpdatedByCell = (updatedBy, timestamp) => {
  if (!updatedBy) {
    return <EmptyCell />;
  }

  // If no timestamp, just show the user name without hover behavior
  if (!timestamp) {
    return (
      <div className="w-[120px]">
        <span title={updatedBy} className="truncate block flex-1">
          {updatedBy}
        </span>
      </div>
    );
  }

  // If timestamp exists, show user name with date on hover
  return (
    <div className="group cursor-help w-[120px]">
      <span title={updatedBy} className="group-hover:hidden truncate block flex-1">
        {updatedBy}
      </span>
      <span title={updatedBy} className="hidden group-hover:inline">
        {formatDate(timestamp)}
      </span>
    </div>
  );
};

const renderLimitCell = (limit) => {
  const limitValue = Number(limit ?? 0);
  const hasLimit = Number.isFinite(limitValue) && limitValue > 0;

  if (!hasLimit) {
    return (
      <div className="flex items-center justify-center">
        <Infinity size={20} className="text-base-content" />
      </div>
    );
  }

  return <div className="text-center font-medium">{formatUsageNumber(limitValue, 4)}</div>;
};

// Footer Component
const PoweredByFooter = () => {
  return (
    <footer className="w-full py-4 border-t border-base-300">
      <div className="flex justify-center items-center gap-2  font-medium opacity-50 text-sm text-base-content/70">
        <span>Powered by</span>
        <a
          href="https://gtwy.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:text-primary-focus transition-colors"
        >
          GTWY
        </a>
      </div>
    </footer>
  );
};

function Home({ params, searchParams, isEmbedUser }) {
  const resolvedParams = use(params);
  const { folders, createFolder, renameFolder, deleteFolder, moveResource } = useFolders(
    "agent",
    resolvedParams.org_id,
    isEmbedUser
  );
  const { activeFolderId, setActiveFolderId, setDraggedResourceId } = useFolderContext();
  // Use the tutorial videos hook
  const { getApiAgentCreationVideo, getChatbotAgentCreationVideo } = useTutorialVideos();
  const resolvedSearchParams = use(searchParams);
  const dispatch = useDispatch();
  const router = useRouter();
  const type = resolvedSearchParams?.type ?? "api";
  const {
    allBridges,
    averageResponseTime,
    isLoading,
    isFirstBridgeCreation,
    descriptions,
    showHistory,
    usageMetrics,
    isAdminOrOwner,
    currentOrgRole,
    currentUser,
    linksData,
    users,
    modelsConfig,
    showDeleteAgentOption,
  } = useCustomSelector((state) => {
    const orgData = state.bridgeReducer.org[resolvedParams.org_id] || {};
    const user = state.userDetailsReducer.userDetails;
    const orgRole = state?.userDetailsReducer?.organizations?.[resolvedParams.org_id]?.role_name;

    // Check if user is admin or owner
    const isAdminOrOwner = orgRole === "Admin" || orgRole === "Owner";

    return {
      allBridges: (orgData.orgs || []).slice().reverse(),
      averageResponseTime: orgData.average_response_time || [],
      isLoading: state.bridgeReducer.loading,
      isFirstBridgeCreation: user.meta?.onboarding?.bridgeCreation || "",
      descriptions: state.flowDataReducer.flowData.descriptionsData?.descriptions || {},
      showHistory: state.appInfoReducer.embedUserDetails?.showHistory || false,
      usageMetrics: state.bridgeReducer.usageMetrics,
      users: state.orgReducer.users,
      isAdminOrOwner,
      linksData: state.flowDataReducer.flowData.linksData || [],
      currentUser: state.userDetailsReducer.userDetails,
      currentOrgRole: orgRole || "Viewer",
      modelsConfig: state.appInfoReducer.embedUserDetails?.models || {},
      showDeleteAgentOption: state.appInfoReducer.embedUserDetails?.showDeleteAgentOption ?? false,
    };
  });
  const bridgeTypeFilter = resolvedSearchParams?.type?.toLowerCase() === "chatbot" ? "chatbot" : "api";
  const pageHeaderContent = useMemo(() => {
    if (bridgeTypeFilter === "chatbot") {
      return {
        title: "Chatbot Agents",
        description:
          descriptions?.Chatbot || "Design, deploy, and monitor conversational agents tailored for your end users.",
      };
    }
    return {
      title: isEmbedUser ? "Agents" : "API Agents",
      description:
        descriptions?.Agents || "Build and manage API-powered AI agents for workflows, automations, and integrations.",
    };
  }, [bridgeTypeFilter, descriptions, isEmbedUser]);
  const deletedSectionTitle = bridgeTypeFilter === "chatbot" ? "Deleted Chatbots" : "Deleted Agents";

  useEffect(() => {
    if (resolvedSearchParams?.folder === "trash") {
      setActiveFolderId("trash");
      const url = new URL(window.location);
      if (url.searchParams.has("folder")) {
        url.searchParams.delete("folder");
        router.replace(url.pathname + url.search, { scroll: false });
      }
    }
  }, [resolvedSearchParams?.folder, setActiveFolderId, router]);

  // Initialize with empty array instead of typeFilteredBridges to avoid reference error
  const [filterBridges, setFilterBridges] = useState([]);
  const [loadingAgentId, setLoadingAgentId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [tutorialState, setTutorialState] = useState({
    showSuggestion: isFirstBridgeCreation,
    showTutorial: false,
  });
  const [usageFilterPopover, setUsageFilterPopover] = useState({ open: false, top: 0, left: 0 });
  const [usageFilterDates, setUsageFilterDates] = useState({ start_date: "", end_date: "" });
  const [usageFilterError, setUsageFilterError] = useState("");
  const [isUsageFilterSubmitting, setIsUsageFilterSubmitting] = useState(false);
  const usageFilterPopoverRef = useRef(null);
  const [selectedAgentForAccess, setSelectedAgentForAccess] = useState(null);
  const [shouldSortByMetrics, _setShouldSortByMetrics] = useState(false); // Track if user wants sorting

  // Use portal dropdown hook
  const { handlePortalOpen, handlePortalCloseImmediate, PortalDropdown, PortalStyles } = usePortalDropdown({
    offsetX: -100, // Better positioning for table dropdowns
    offsetY: 5,
    estimatedHeight: 330,
  });
  const { isDeleting, executeDelete } = useDeleteOperation();

  const usageMetricsMap = useMemo(() => {
    if (!usageMetrics?.data) {
      return {};
    }

    // Make sure we handle different response structures properly
    const metricsArray = Array.isArray(usageMetrics.data)
      ? usageMetrics.data
      : usageMetrics.data.data && Array.isArray(usageMetrics.data.data)
        ? usageMetrics.data.data
        : [];

    const result = metricsArray.reduce((acc, item) => {
      if (item?.bridge_id) {
        // Store full metrics object so we can access both total_tokens and total_cost
        acc[item.bridge_id] = item;
      }
      return acc;
    }, {});

    return result;
  }, [usageMetrics?.data]);
  const usageFilterIds = useMemo(() => new Set(Object.keys(usageMetricsMap)), [usageMetricsMap]);
  const isUsageFilterActive = useMemo(
    // Only consider filter active if explicitly set by user action
    () => Boolean(usageMetrics?.filterActive),
    [usageMetrics?.filterActive]
  );

  const usageFilterLabel = useMemo(() => {
    if (!isUsageFilterActive) return "";
    const formatReadableDate = (value) => {
      if (!value) return "";
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };
    if (!usageMetrics?.filters?.start_date && !usageMetrics?.filters?.end_date) return "";
    return `${formatReadableDate(usageMetrics?.filters?.start_date)} → ${formatReadableDate(usageMetrics?.filters?.end_date)}`;
  }, [isUsageFilterActive, usageMetrics?.filters]);

  // Process and merge metrics data with bridge data - IMPORTANT: Define this BEFORE typeFilteredBridges
  const processedBridges = useMemo(() => {
    if (!Array.isArray(allBridges) || allBridges.length === 0) {
      return [];
    }

    // Merge metrics with bridge data
    const result = allBridges.map((bridge) => {
      const metrics = usageMetricsMap[bridge._id];
      return {
        ...bridge,
        metrics,
      };
    });

    return result;
  }, [allBridges, usageMetricsMap]);

  // Now define typeFilteredBridges using processedBridges
  const typeFilteredBridges = useMemo(() => {
    if (!Array.isArray(processedBridges)) return [];
    return processedBridges.filter((bridge) => {
      const type = bridge?.bridgeType?.toLowerCase?.();
      if (bridgeTypeFilter === "chatbot") {
        return type === "chatbot";
      }
      return type !== "chatbot";
    });
  }, [processedBridges, bridgeTypeFilter]);

  // Show all bridges but only sort when user explicitly requests it
  const applyUsageFilter = (list) => {
    if (!Array.isArray(list)) return list;

    // Add hasMetrics property to each item
    const listWithMetricsFlag = list.map((item) => ({
      ...item,
      hasMetrics: usageFilterIds.has(item._id),
    }));

    // Only sort if user has explicitly requested sorting
    if (!shouldSortByMetrics) {
      return listWithMetricsFlag; // Return unsorted list
    }

    // Sort: prioritize bridges with metrics
    return [...listWithMetricsFlag].sort((a, b) => {
      // Put bridges with metrics first
      if (a.hasMetrics && !b.hasMetrics) return -1;
      if (!a.hasMetrics && b.hasMetrics) return 1;

      // If both have metrics or both don't have metrics, maintain original order
      return 0;
    });
  };

  // Simplified function to return metrics data for the table
  // Function to render the timestamp with loading indicator
  const renderMetricsTimestamp = (bridge, defaultTime) => {
    // Check if metrics are still loading using Redux loading state
    if (usageMetrics?.loading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-4 bg-base-300 rounded animate-pulse"></div>
        </div>
      );
    }

    // If metrics available, use the last_used_time from metrics
    const timestamp = bridge?.metrics?.last_used_time || defaultTime;

    if (!timestamp) return <EmptyCell />;

    return (
      <div className="group cursor-help">
        <span className="group-hover:hidden">{formatRelativeTime(timestamp)}</span>
        <span className="hidden group-hover:inline">{formatDate(timestamp)}</span>
      </div>
    );
  };

  const isUsageResetDisabled = useMemo(
    () => !isUsageFilterActive && !usageFilterDates.start_date && !usageFilterDates.end_date,
    [isUsageFilterActive, usageFilterDates.end_date, usageFilterDates.start_date]
  );

  const applyPresetUsageFilter = async (days) => {
    const end = new Date();
    const start = new Date();
    // Last N days including today
    start.setDate(end.getDate() - (days - 1));

    const toYMD = (d) => d.toISOString().slice(0, 10);
    const startDate = toYMD(start);
    const endDate = toYMD(end);

    setUsageFilterError("");
    setUsageFilterDates({ start_date: startDate, end_date: endDate });
    setIsUsageFilterSubmitting(true);
    try {
      // When user explicitly applies a filter, mark it as active
      await dispatch(
        fetchBridgeUsageMetricsAction({
          start_date: startDate,
          end_date: endDate,
          filterActive: true, // Explicitly applying filter
        })
      );
    } catch (error) {
      console.error("Failed to apply preset usage filter:", error);
    } finally {
      setIsUsageFilterSubmitting(false);
    }
  };

  const loadInitialMetrics = async () => {
    try {
      await dispatch(
        fetchBridgeUsageMetricsAction({
          start_date: null,
          end_date: null,
          filterActive: true, // Set to true to prioritize bridges with metrics
        })
      );
    } catch (error) {
      console.error("Failed to fetch initial metrics:", error);
    }
  };

  useEffect(() => {
    loadInitialMetrics();
  }, [dispatch]);

  useEffect(() => {
    setFilterBridges(typeFilteredBridges);
  }, [typeFilteredBridges]);

  // Reset loading state when component unmounts or navigation completes
  useEffect(() => {
    return () => {
      setLoadingAgentId(null);
    };
  }, [allBridges]);

  // Reset loading state when component unmounts or navigation completes
  useEffect(() => {
    return () => {
      setLoadingAgentId(null);
    };
  }, []);

  const filteredUnArchivedBridges = filterBridges?.filter(
    (item) => (item.status === 1 || item.status === undefined) && !item.deletedAt
  );
  const filteredDeletedBridges = filterBridges?.filter((item) => item.deletedAt);

  // Apply usage filter to prioritize metrics API agents
  const usageFilteredUnArchived = applyUsageFilter(filteredUnArchivedBridges);
  const usageFilteredDeleted = applyUsageFilter(filteredDeletedBridges);

  useEffect(() => {
    if (usageMetrics?.filters) {
      setUsageFilterDates({
        start_date: usageMetrics.filters.start_date,
        end_date: usageMetrics.filters.end_date,
      });
    } else {
      setUsageFilterDates({ start_date: "", end_date: "" });
    }
  }, [usageMetrics?.filters]);

  const getDaysRemaining = (deletedAt) => {
    if (!deletedAt) return 0;
    const deletedDate = new Date(deletedAt);
    const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from deletion
    const now = new Date();
    const diffTime = expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getFolderIdStr = (fid) => {
    if (!fid) return "";
    if (typeof fid === "string") return fid;
    if (typeof fid === "object") {
      if (fid.$oid) return String(fid.$oid);
      if (fid._id) return String(fid._id);
      if (typeof fid.toString === "function" && fid.toString() !== "[object Object]") {
        return fid.toString();
      }
    }
    return String(fid);
  };

  const UnArchivedBridges = usageFilteredUnArchived
    ?.filter((item) => item.status === 1 || item.status === undefined)
    .map((item) => {
      const createdAt = item.created_at || item.createdAt;
      const updatedAt = item.updated_at || item.updatedAt;
      const lastUsed = item.last_used;
      const promptTotalTokens = item?.agent_info?.prompt_total_tokens;
      const promptEnhancerPercentage = item?.ai_updates?.ai_updates?.prompt_enhancer_percentage;
      return {
        _id: item._id,
        model: item.configuration?.model || "",
        name: (
          <div className="flex gap-3 items-center">
            <div className="flex gap-2 items-center">
              {loadingAgentId === item._id ? (
                <div className="loading loading-spinner loading-sm"></div>
              ) : (
                getIconOfService(item.service, 20, 20)
              )}
            </div>
            <div className="flex-col" title={item.name}>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 w-[300px]">
                  <span className="truncate block flex-1">{item.name}</span>
                  {item.bridge_status === 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                      <ClockIcon size={12} />
                      <span className="hidden sm:inline">Paused</span>
                    </div>
                  )}
                </div>
              </div>
              <ModelBadge model={item.configuration?.model} service={item.service} modelsConfig={modelsConfig} />
            </div>
          </div>
        ),
        actualName: item?.name || "",
        slugName: item?.slugName || "",
        service: getIconOfService(item.service),
        bridgeType: item.bridgeType,
        status: item.status,
        bridge_status: item.bridge_status,
        versionId: item?.published_version_id || item?.versions?.[0],
        promptDetails:
          promptTotalTokens != null || promptEnhancerPercentage != null ? (
            <div className="flex flex-col text-xs">
              {promptTotalTokens != null && (
                <span className="font-semibold text-base-content">{formatUsageNumber(promptTotalTokens)} tokens</span>
              )}
              {promptEnhancerPercentage != null && (
                <span className={promptEnhancerPercentage < 50 ? "text-error/60" : "text-base-content/70"}>
                  {promptEnhancerPercentage}% Optimized
                </span>
              )}
            </div>
          ) : (
            <EmptyCell />
          ),
        totalTokens: item.metrics ? (
          formatUsageNumber(item.metrics.total_tokens)
        ) : usageMetrics?.loading ? (
          <LoadingSkeleton />
        ) : (
          <EmptyCell />
        ),
        totalTokens_original: item.metrics?.total_tokens || 0,
        cost: item.metrics ? (
          `${Number(item.metrics.total_cost).toFixed(4)}`
        ) : usageMetrics?.loading ? (
          <LoadingSkeleton />
        ) : (
          <EmptyCell />
        ),
        averageResponseTime: averageResponseTime[item?._id] ? averageResponseTime[item?._id] : "Not used in 24h",
        agent_limit: renderLimitCell(item?.bridge_limit),
        agent_limit_original: item?.bridge_limit || 0,
        agent_usage: item?.bridge_usage ? parseFloat(item.bridge_usage).toFixed(4) : 0,
        isLoading: loadingAgentId === item._id,
        users: item?.users,
        last_used: renderMetricsTimestamp(item, lastUsed),
        last_used_original: item.metrics?.last_used_time || lastUsed,
        last_used_orignal: usageMetricsMap[item._id]?.last_used_time || lastUsed,
        created_by: renderCreatedByCell(
          users?.find((user) => String(user?.user_id) === String(item.user_id))?.name,
          createdAt
        ),
        created_by_original: users?.find((user) => String(user?.user_id) === String(item.user_id))?.name ? (
          users?.find((user) => String(user?.user_id) === String(item.user_id))?.name
        ) : (
          <EmptyCell />
        ),
        created_at_original: createdAt,
        updated_by: renderUpdatedByCell(
          users?.find((user) => String(user?.user_id) === String(item.last_publisher_id))?.name,
          updatedAt
        ),
        updated_by_original: users?.find((user) => String(user?.user_id) === String(item.last_publisher_id))?.name ? (
          users?.find((user) => String(user?.user_id) === String(item.last_publisher_id))?.name
        ) : (
          <EmptyCell />
        ),
        updated_at_original: updatedAt,
        bridge_limit_reset_period: item?.bridge_limit_reset_period || null,
        folder_id: item?.folder_id ? getFolderIdStr(item.folder_id) : null,
      };
    });

  const displayedUnArchivedBridges = useMemo(() => {
    if (activeFolderId === "trash") {
      return [];
    }
    if (activeFolderId === null) {
      const sorted = [...UnArchivedBridges].sort((a, b) => {
        const aFolder = a.folder_id || "";
        const bFolder = b.folder_id || "";
        if (!aFolder && bFolder) return 1; // uncategorized to bottom
        if (aFolder && !bFolder) return -1; // uncategorized to bottom
        if (!aFolder && !bFolder) return 0;

        // Find folder names for alphabetical sorting
        const foldersList = Array.isArray(folders) ? folders : [];
        const folderA = foldersList.find((f) => f && getFolderIdStr(f._id) === getFolderIdStr(aFolder));
        const folderB = foldersList.find((f) => f && getFolderIdStr(f._id) === getFolderIdStr(bFolder));
        const nameA = folderA && folderA.name ? folderA.name.toLowerCase() : "";
        const nameB = folderB && folderB.name ? folderB.name.toLowerCase() : "";
        return nameA.localeCompare(nameB);
      });
      return sorted;
    }
    if (activeFolderId === "uncategorized") {
      return UnArchivedBridges.filter((b) => !b.folder_id);
    }
    return UnArchivedBridges.filter((b) => getFolderIdStr(b.folder_id) === getFolderIdStr(activeFolderId));
  }, [UnArchivedBridges, activeFolderId, folders]);

  const folderCounts = useMemo(() => {
    const unarchivedList = Array.isArray(UnArchivedBridges) ? UnArchivedBridges : [];
    const foldersList = Array.isArray(folders) ? folders : [];

    const counts = {
      all: unarchivedList.length,
      uncategorized: unarchivedList.filter((b) => !b.folder_id).length,
    };
    foldersList.forEach((folder) => {
      if (folder && folder._id) {
        counts[folder._id] = unarchivedList.filter(
          (b) => getFolderIdStr(b.folder_id) === getFolderIdStr(folder._id)
        ).length;
      }
    });
    return counts;
  }, [UnArchivedBridges, folders]);

  // Helper function to calculate days remaining for deletion (30 days from deletedAt)

  const DeletedBridges = usageFilteredDeleted?.map((item) => {
    const createdAt = item.created_at || item.createdAt;
    const updatedAt = item.updated_at || item.updatedAt;
    const lastUsed = item.last_used;
    // Direct access to metrics data without using helper functions
    const promptTotalTokens = item?.agent_info?.prompt_total_tokens;
    const promptEnhancerPercentage = item?.ai_updates?.ai_updates?.prompt_enhancer_percentage;

    return {
      _id: item._id,
      model: item.configuration?.model || "",
      name: (
        <div className="flex gap-3">
          <div className="flex gap-2 items-center">
            {loadingAgentId === item._id ? (
              <div className="loading loading-spinner loading-sm"></div>
            ) : (
              getIconOfService(item.service, 20, 20)
            )}
          </div>
          <div className="flex-col">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 w-[300px]">
                <span
                  className={loadingAgentId === item._id ? "opacity-50 truncate block flex-1" : "truncate block flex-1"}
                >
                  {item.name}
                </span>
                {loadingAgentId === item._id && <span className="text-xs text-primary opacity-70">Loading...</span>}
              </div>
            </div>
            <ModelBadge model={item.configuration?.model} service={item.service} modelsConfig={modelsConfig} />
          </div>
        </div>
      ),
      actualName: item?.name || "",
      slugName: item?.slugName || "",
      service: item.service === "openai" ? <OpenAiIcon /> : item.service,
      bridgeType: item.bridgeType,
      status: item.status,
      deletedAt: item.deletedAt,
      daysRemaining: getDaysRemaining(item.deletedAt),
      versionId: item?.published_version_id || item?.versions?.[0],
      promptDetails:
        promptTotalTokens != null || promptEnhancerPercentage != null ? (
          <div className="flex flex-col text-xs">
            {promptTotalTokens != null && (
              <span className="font-semibold text-base-content">{formatUsageNumber(promptTotalTokens)} tokens</span>
            )}
            {promptEnhancerPercentage != null && (
              <span className={promptEnhancerPercentage < 50 ? "text-error/60" : "text-base-content/70"}>
                {promptEnhancerPercentage}% Optimized
              </span>
            )}
          </div>
        ) : (
          <EmptyCell />
        ),
      totalTokens: item.metrics ? (
        formatUsageNumber(item.metrics.total_tokens)
      ) : usageMetrics?.loading ? (
        <LoadingSkeleton />
      ) : (
        <EmptyCell />
      ),
      totalTokens_original: item.metrics?.total_tokens || 0,
      cost: item.metrics ? (
        `${Number(item.metrics.total_cost).toFixed(4)}`
      ) : usageMetrics?.loading ? (
        <LoadingSkeleton />
      ) : (
        <EmptyCell />
      ),
      agent_limit: renderLimitCell(item?.bridge_limit),
      agent_limit_original: item?.bridge_limit || 0,
      averageResponseTime:
        averageResponseTime[item?._id] === 0 ? (
          <div className="text-xs">Not used in 24h</div>
        ) : (
          <div className="text-xs">{averageResponseTime[item?._id]} sec</div>
        ),
      isLoading: loadingAgentId === item._id,
      last_used: renderMetricsTimestamp(item, lastUsed),
      last_used_original: item.metrics?.last_used_time || lastUsed,
      last_used_orignal: usageMetricsMap[item._id]?.last_used_time || lastUsed,
      created_by: renderCreatedByCell(
        users?.find((user) => String(user?.user_id) === String(item.user_id))?.name,
        createdAt
      ),
      created_by_original: users?.find((user) => String(user?.user_id) === String(item.user_id))?.name,
      created_at_original: createdAt,
      updated_by: renderUpdatedByCell(
        users?.find((user) => String(user?.user_id) === String(item.last_publisher_id))?.name,
        updatedAt
      ),
      updated_by_original: users?.find((user) => String(user?.user_id) === String(item.last_publisher_id))?.name,
      updated_at_original: updatedAt,
      agent_usage: item?.bridge_usage ? parseFloat(item.bridge_usage).toFixed(4) : 0,
      folder_id: item?.folder_id ? getFolderIdStr(item.folder_id) : null,
    };
  });

  const displayedDeletedBridges = useMemo(() => {
    if (activeFolderId === "trash") {
      return DeletedBridges;
    }
    return [];
  }, [DeletedBridges, activeFolderId]);

  const prefetchedRoutes = useRef(new Set());
  const handleRowHover = (row) => {
    if (!row?._id || !row?.versionId) {
      return;
    }
    const routeKey = `${row._id}-${row.versionId}`;
    if (!prefetchedRoutes.current.has(routeKey)) {
      const prefetchUrl = `/org/${resolvedParams.org_id}/agents/configure/${row._id}?version=${row.versionId}&type=${bridgeTypeFilter}`;
      router.prefetch(prefetchUrl);
      prefetchedRoutes.current.add(routeKey);
    }
  };

  const onClickConfigure = (id, versionId) => {
    // Prevent multiple clicks while loading
    if (loadingAgentId) return;

    setLoadingAgentId(id);
    // Include the type parameter to maintain sidebar selection
    router.push(`/org/${resolvedParams.org_id}/agents/configure/${id}?version=${versionId}&type=${bridgeTypeFilter}`);
  };

  const closeUsageFilterPopover = () => {
    setUsageFilterPopover((prev) => ({ ...prev, open: false }));
  };
  const handleUsageFilterIconClick = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (typeof window === "undefined") return;

    const modalWidth = 320;
    const modalHeight = 220;

    const top = window.scrollY + Math.max(16, (window.innerHeight - modalHeight) / 2);
    const left = window.scrollX + Math.max(16, (window.innerWidth - modalWidth) / 2);

    setUsageFilterError("");
    setUsageFilterPopover({
      open: true,
      top,
      left,
    });
  };
  const handleUsageDateChange = (key, value) => {
    setUsageFilterError("");
    setUsageFilterDates((prev) => ({ ...prev, [key]: value }));
  };

  const handleUsageFilterApply = async () => {
    if (!usageFilterDates.start_date || !usageFilterDates.end_date) {
      setUsageFilterError("Please select both start and end dates.");
      return;
    }
    if (usageFilterDates.start_date > usageFilterDates.end_date) {
      setUsageFilterError("Start date cannot be after end date.");
      return;
    }
    setIsUsageFilterSubmitting(true);
    try {
      // When user explicitly applies a custom date filter, mark it as active
      await dispatch(
        fetchBridgeUsageMetricsAction({
          start_date: usageFilterDates.start_date,
          end_date: usageFilterDates.end_date,
          filterActive: true, // Explicitly applying filter
        })
      );
      closeUsageFilterPopover();
    } catch (error) {
      console.error("Failed to fetch usage metrics:", error);
    } finally {
      setIsUsageFilterSubmitting(false);
    }
  };

  const handleUsageFilterClear = () => {
    dispatch(clearBridgeUsageMetricsAction());
    setUsageFilterDates({ start_date: "", end_date: "" });
    setUsageFilterError("");
    closeUsageFilterPopover();
  };

  useEffect(() => {
    if (!usageFilterPopover.open) return;
    const handleClick = (event) => {
      // Ignore clicks on native select and options since they are managed by the browser
      if (event.target && (event.target.tagName === "OPTION" || event.target.tagName === "SELECT")) {
        return;
      }

      // Ignore clicks on body/html/null if the focus is currently on an input/select/textarea inside the popover
      if (
        document.activeElement &&
        (document.activeElement.tagName === "SELECT" ||
          document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA") &&
        usageFilterPopoverRef.current &&
        usageFilterPopoverRef.current.contains(document.activeElement)
      ) {
        if (!event.target || event.target === document.body || event.target === document.documentElement) {
          return;
        }
      }

      if (usageFilterPopoverRef.current && !usageFilterPopoverRef.current.contains(event.target)) {
        closeUsageFilterPopover();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [usageFilterPopover.open]);
  const handleUsageFilterDropdownClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const dropdownContent = (
      <ul className="menu bg-base-100 rounded-box w-56 p-2 shadow text-sm">
        <li>
          <button onClick={() => applyPresetUsageFilter(1)}>Last day</button>
        </li>
        <li>
          <button onClick={() => applyPresetUsageFilter(5)}>Last 5 days</button>
        </li>
        <li>
          <button onClick={() => applyPresetUsageFilter(10)}>Last 10 days</button>
        </li>
        <li>
          <button onClick={() => applyPresetUsageFilter(15)}>Last 15 days</button>
        </li>
        <li>
          <button onClick={() => applyPresetUsageFilter(30)}>Last 30 days</button>
        </li>

        <li className="mt-1 border-t border-base-200" />

        <li>
          <button
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              handleUsageFilterClear();
            }}
            disabled={isUsageResetDisabled}
          >
            Reset filter
          </button>
        </li>

        <li>
          <button
            onClick={(ev) => {
              // open existing custom date popover anchored near this button
              ev.preventDefault();
              ev.stopPropagation();
              handlePortalCloseImmediate();
              handleUsageFilterIconClick(ev);
            }}
          >
            Custom date range…
          </button>
        </li>
      </ul>
    );

    // Uses the same portal hook as the ellipsis EndComponent
    handlePortalOpen(e.currentTarget, dropdownContent);
  };
  const EndComponent = ({ row }) => {
    const isEditor =
      (currentOrgRole === "Editor" &&
        (row.users?.length === 0 ||
          !row.users ||
          (row.users?.length > 0 && row.users?.some((user) => user.id === currentUser.id)))) ||
      (currentOrgRole === "Viewer" && row.users?.some((user) => user.id === currentUser.id)) ||
      currentOrgRole === "Creator" ||
      isAdminOrOwner;

    const handleDropdownClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const isNearBottom = rect.bottom + 550 > window.innerHeight;

      const dropdownContent = (
        <div className="bg-base-100 rounded-box w-52 shadow-2xl p-1 border border-base-300">
          <AgentMenuItems
            bridge={row}
            bridgeData={row}
            bridgeStatus={allBridges.find((bridge) => bridge._id === row._id)?.bridge_status}
            isArchived={row?.status === 0}
            isUpdatingBridge={false}
            isEmbedUser={isEmbedUser}
            isAdminOrOwner={isAdminOrOwner}
            orgId={resolvedParams.org_id}
            onClose={handlePortalCloseImmediate}
            onSetSelectedAgent={(agent) => {
              setSelectedAgentForAccess(agent);
            }}
            handlePortalOpen={handlePortalOpen}
            handlePortalCloseImmediate={handlePortalCloseImmediate}
            showDeleteAgentOption={showDeleteAgentOption}
            onDelete={() => {
              handlePortalCloseImmediate();
              setItemToDelete(row);
              setTimeout(() => openModal(MODAL_TYPE.DELETE_MODAL), 10);
            }}
          />
          <div className="divider my-1"></div>
          <div className={`dropdown dropdown-hover dropdown-left ${isNearBottom ? "dropdown-top" : ""} w-full`}>
            <label
              tabIndex={0}
              className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 text-base-content">
                <Folder size={14} className="text-base-content/70" />
                <span>Move to Folder</span>
              </div>
            </label>
            <div
              tabIndex={0}
              className={`dropdown-content z-[100] ${isNearBottom ? "bottom-0 top-auto pb-2" : "top-0 bottom-auto pt-2"} right-full pr-2`}
            >
              <MoveToFolderMenu
                folders={folders}
                currentFolderId={row.folder_id}
                onMove={(folderId) => {
                  moveResource(row._id, folderId);
                  handlePortalCloseImmediate();
                }}
              />
            </div>
          </div>
        </div>
      );

      handlePortalOpen(e.currentTarget, dropdownContent);
    };

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center mr-4 text-sm">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {!isEmbedUser || (isEmbedUser && showHistory) ? (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  className="btn btn-outline btn-ghost btn-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(
                      `/org/${resolvedParams.org_id}/agents/history/${row._id}?version=${row?.versionId}&type=${row?.bridgeType || "chatbot"}`
                    );
                  }}
                >
                  History
                </button>
              </div>
            ) : null}
          </div>
          {(isEditor || (isEmbedUser && showDeleteAgentOption)) && (
            <div className="bg-transparent">
              <div
                role="button"
                className="hover:bg-base-200 rounded-lg p-3 cursor-pointer"
                onClick={handleDropdownClick}
              >
                <EllipsisIcon className="rotate-90" size={16} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const DeletedEndComponent = ({ row }) => {
    return (
      <div className="flex items-center justify-center gap-2">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            className="btn btn-outline btn-ghost btn-sm whitespace-nowrap flex items-center gap-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              restoreBridge(row._id);
            }}
          >
            <span className="flex items-center  gap-1">
              <div className="flex text-xs items-center gap-1">
                <Undo2 size={12} />
              </div>
              <div className="text-sm">Undo</div>
            </span>
          </button>
        </div>
        <div className="text-error font-sm mt-2 text-sm whitespace-nowrap">{row.daysRemaining} days left</div>
      </div>
    );
  };

  const deleteBridge = async (item, name) => {
    await executeDelete(async () => {
      const bridgeId = item._id;
      const response = await dispatch(deleteBridgeAction({ bridgeId, org_id: resolvedParams.org_id }));
      toast.success(response?.data?.message || response?.message || response || "Agent deleted successfully");
    });
  };

  const restoreBridge = async (bridgeId) => {
    try {
      const response = await dispatch(deleteBridgeAction({ bridgeId, org_id: resolvedParams.org_id, restore: true }));
      toast.success(response?.data?.message || response?.message || response || "Agent restored successfully");
    } catch (error) {
      console.error("Failed to restore agent", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to restore agent";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex w-full min-h-screen">
      <div className="w-full overflow-x-hidden flex flex-col min-h-screen flex-1">
        <div className="w-full max-w-full flex-1">
          {tutorialState?.showSuggestion && (
            <TutorialSuggestionToast
              setTutorialState={setTutorialState}
              flagKey={"bridgeCreation"}
              TutorialDetails={"Agent Creation"}
            />
          )}
          {tutorialState?.showTutorial && (
            <OnBoarding
              setShowTutorial={() => setTutorialState((prev) => ({ ...prev, showTutorial: false }))}
              video={bridgeTypeFilter === "chatbot" ? getChatbotAgentCreationVideo() : getApiAgentCreationVideo()}
              flagKey={"bridgeCreation"}
            />
          )}
          <CreateNewBridge orgid={resolvedParams.org_id} defaultBridgeType={bridgeTypeFilter} />
          {!typeFilteredBridges.length && isLoading && <LoadingSpinner />}
          <input autoComplete="off" id="my-drawer-2" type="checkbox" className="drawer-toggle" />
          <div className="drawer-content flex flex-col items-start justify-start">
            <div className="flex w-full justify-start gap-4 lg:gap-16 items-start">
              <div className="w-full">
                {typeFilteredBridges.length === 0 ? (
                  <AgentEmptyState
                    orgid={resolvedParams.org_id}
                    isEmbedUser={isEmbedUser}
                    defaultBridgeType={bridgeTypeFilter}
                    title={pageHeaderContent.title}
                    description={pageHeaderContent.description}
                    docLink={linksData?.find((link) => link.title === "Agents")?.blog_link}
                  />
                ) : (
                  <div className="flex flex-col lg:mx-0">
                    <div className="px-2 pt-4">
                      <MainLayout>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between w-full ">
                          <PageHeader
                            title={pageHeaderContent.title}
                            description={pageHeaderContent.description}
                            docLink={linksData?.find((link) => link.title === "Agents")?.blog_link}
                            isEmbedUser={isEmbedUser}
                          />
                        </div>
                      </MainLayout>

                      <div className="flex flex-row flex-wrap gap-4 px-4 pb-3 items-center">
                        {allBridges.length > 5 && (
                          <SearchItems data={allBridges} setFilterItems={setFilterBridges} item="Agents" />
                        )}
                        <div className="flex items-center gap-2 ml-2">
                          <button
                            type="button"
                            data-testid="agents-usage-filter-button"
                            className="btn btn-outline btn-ghost text-sm btn-sm border border-base-300 gap-1"
                            onClick={handleUsageFilterDropdownClick}
                          >
                            <Funnel size={14} />
                            <span>Usage Filter</span>
                            <span className="text-xs text-gray-500">
                              {isUsageFilterActive ? usageFilterLabel || "Last 24h" : "Last 24h"}
                            </span>
                          </button>

                          <button
                            data-testid="create-new-agent-button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openModal(MODAL_TYPE?.CREATE_BRIDGE_MODAL)}
                          >
                            {isEmbedUser
                              ? "+ Create New Agent"
                              : type === "api"
                                ? " + Create New API Agent"
                                : " + Create New Chatbot Agent"}
                          </button>
                        </div>
                      </div>
                    </div>
                    {!isEmbedUser && (
                      <FolderTabs
                        folders={folders}
                        resourceType="agent"
                        onCreateFolder={createFolder}
                        onRenameFolder={renameFolder}
                        onDeleteFolder={deleteFolder}
                        onMoveResource={moveResource}
                        showTrashTab={true}
                        deletedCount={DeletedBridges?.length || 0}
                        folderCounts={folderCounts}
                      />
                    )}

                    {activeFolderId !== "trash" && (
                      <div className="w-full overflow-visible">
                        <CustomTable
                          data={displayedUnArchivedBridges}
                          // draggableRows={true}
                          // onDragStart={(row) => setDraggedResourceId(row._id)}
                          onDragEnd={() => setDraggedResourceId(null)}
                          columnsToShow={[
                            "name",
                            "promptDetails",
                            "cost",
                            "totalTokens",
                            "agent_limit",
                            "last_used",
                            "created_by",
                            "updated_by",
                          ]}
                          sorting
                          sortingColumns={[
                            "name",
                            "cost",
                            "totalTokens",
                            "agent_limit",
                            "last_used",
                            "created_by",
                            "updated_by",
                          ]}
                          handleRowClick={(props) => onClickConfigure(props?._id, props?.versionId)}
                          handleRowHover={handleRowHover}
                          keysToExtractOnRowClick={["_id", "versionId"]}
                          keysToWrap={["name", "model"]}
                          endComponent={EndComponent}
                          onUsageFilterClick={handleUsageFilterIconClick}
                          isUsageFilterActive={isUsageFilterActive}
                          usageFilterLabel={usageFilterLabel}
                          usageFilterIsLoading={isUsageFilterSubmitting}
                          customGetColumnLabel={getColumnLabel}
                          customCellRenderers={customCellRenderers}
                        />
                      </div>
                    )}

                    {displayedDeletedBridges?.length > 0 && (
                      <div className="">
                        <div className="opacity-60 overflow-visible">
                          <CustomTable
                            data={displayedDeletedBridges}
                            columnsToShow={[
                              "name",
                              "promptDetails",
                              "cost",
                              "totalTokens",
                              "agent_limit",
                              "last_used",
                              "created_by",
                              "updated_by",
                            ]}
                            sorting
                            sortingColumns={[
                              "name",
                              "cost",
                              "totalTokens",
                              "agent_limit",
                              "last_used",
                              "created_by",
                              "updated_by",
                              "created_at",
                              "updated_at",
                            ]}
                            keysToWrap={["name", "model"]}
                            endComponent={DeletedEndComponent}
                            isUsageFilterActive={isUsageFilterActive}
                            customGetColumnLabel={getColumnLabel}
                            customCellRenderers={customCellRenderers}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Powered By Footer */}
          </div>

          {usageFilterPopover.open &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                className="fixed z-[999999999]"
                style={{ top: usageFilterPopover.top, left: usageFilterPopover.left }}
              >
                <div
                  ref={usageFilterPopoverRef}
                  data-testid="agents-usage-filter-popover"
                  className="w-72 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-2xl space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-base-content">Filter usage</p>
                      <p className="text-xs text-base-content/60">Show tokens between two dates</p>
                    </div>
                    {isUsageFilterActive && <span className="badge badge-primary badge-sm text-xs">Applied</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-base-content/60">Start date</label>
                    <input
                      autoComplete="off"
                      type="date"
                      data-testid="usage-filter-start-date"
                      className="input input-bordered input-sm w-full"
                      value={usageFilterDates.start_date}
                      max={usageFilterDates.end_date || undefined}
                      onChange={(e) => handleUsageDateChange("start_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-base-content/60">End date</label>
                    <input
                      autoComplete="off"
                      type="date"
                      data-testid="usage-filter-end-date"
                      className="input input-bordered input-sm w-full"
                      value={usageFilterDates.end_date}
                      min={usageFilterDates.start_date || undefined}
                      onChange={(e) => handleUsageDateChange("end_date", e.target.value)}
                    />
                  </div>
                  {usageFilterError && <p className="text-xs text-error">{usageFilterError}</p>}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={handleUsageFilterClear}
                      disabled={isUsageResetDisabled}
                    >
                      Reset
                    </button>
                    <button
                      className="btn btn-primary btn-sm min-w-[70px]"
                      data-testid="usage-filter-apply-button"
                      onClick={handleUsageFilterApply}
                      disabled={isUsageFilterSubmitting}
                    >
                      {isUsageFilterSubmitting ? <span className="loading loading-spinner loading-xs" /> : "Apply"}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

          {/* Single DeleteModal for all delete operations */}
          <DeleteModal
            onConfirm={deleteBridge}
            item={itemToDelete}
            title="Delete Agent"
            description={`Are you sure you want to delete the Agent "${itemToDelete?.actualName}"? This agent will be moved to deleted items and permanently removed after 30 days.`}
            loading={isDeleting}
            isAsync={true}
          />
        </div>

        {/* Powered By Footer pinned to bottom */}
        {isEmbedUser && <PoweredByFooter />}
        <AccessManagementModal agent={selectedAgentForAccess} />
        <ConfigureEnvironmentModal />

        {/* Portal components from hook */}
        <PortalStyles />
        <PortalDropdown />
      </div>
    </div>
  );
}

const WrappedHome = (props) => (
  <ResourcePage>
    <Home {...props} />
  </ResourcePage>
);
export default Protected(WrappedHome);
