"use client";
/* eslint-disable no-commented-code/no-commented-code, unused-imports/no-unused-imports, unused-imports/no-unused-vars */
import React, { useEffect, useMemo, useState, use, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, ChevronRight, Wrench, Bot, Settings, Funnel, Clock, Layers, Link2, Folder } from "lucide-react";
import { toast } from "react-toastify";
import PageHeader from "@/components/Pageheader";
import MainLayout from "@/components/layoutComponents/MainLayout";
import SearchItems from "@/components/UI/SearchItems";
import { useCustomSelector } from "@/customHooks/customSelector";
import InfoTooltip from "@/components/InfoTooltip";
import { updateFuntionApiAction, getAgentsVersionsDataAction } from "@/store/action/bridgeAction";
import { isEqual } from "lodash";
import FunctionParameterModal from "@/components/configuration/configurationComponent/FunctionParameterModal";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, formatRelativeTime, formatDate, getStatusClass } from "@/utils/utility";
import CustomTable from "@/components/customTable/CustomTable";
import usePortalDropdown from "@/customHooks/usePortalDropdown";
import ResourcePage from "@/components/folders/ResourcePage";
import FolderTabs from "@/components/folders/FolderTabs";
import MoveToFolderMenu from "@/components/folders/MoveToFolderMenu";
import useFolders from "@/hooks/useFolders";
import { useFolderContext } from "@/components/folders/FolderContext";
import Protected from "@/components/Protected";

export const runtime = "edge";

const FEATURED_APPS = [
  { domain: "gmail.com", name: "Gmail" },
  { domain: "notion.so", name: "Notion" },
  { domain: "slack.com", name: "Slack" },
  { domain: "drive.google.com", name: "Google Drive" },
];

const getColumnLabel = (column) => {
  switch (column) {
    case "title":
      return "Tool Name";
    case "script_id":
      return "Script ID";
    case "description":
      return "Description";
    case "status":
      return "Status";
    case "agents":
      return "Connected Agents";
    case "versions":
      return "Versions";
    case "createdAt":
      return "Created At";
    case "updatedAt":
      return "Updated At";
    default:
      return column.replace(/_/g, " ");
  }
};

const EmptyState = ({ onAddTool }) => (
  <div className="w-full flex justify-center">
    <div
      className="w-full max-w-2xl flex flex-col items-center justify-center text-center px-6 py-12 mx-auto"
      style={{
        border: "2px dashed var(--fallback-bc,oklch(var(--bc)/0.25))",
        borderRadius: 6,
        background: "var(--fallback-b1,oklch(var(--b1)/1))",
      }}
    >
      <h2
        className="text-base-content"
        style={{ fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", marginBottom: 8 }}
      >
        Add New Tool
      </h2>
      <p className="text-base-content/70 max-w-md" style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
        Choose from over 2,500+ apps to supercharge your workflow and unlock powerful automation.
      </p>
      <div className="flex items-center gap-3 mb-6">
        {FEATURED_APPS.map((app) => (
          <img
            key={app.domain}
            src={`https://www.google.com/s2/favicons?domain=${app.domain}&sz=64`}
            alt={app.name}
            className="w-6 h-6 object-contain"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onAddTool}
        className="btn btn-primary inline-flex items-center gap-2 px-6"
        style={{ borderRadius: 6, fontWeight: 600, letterSpacing: "0.04em" }}
      >
        <Plus size={16} strokeWidth={2.5} />
        NEW TOOLS
      </button>
    </div>
  </div>
);

const ToolsPage = ({ params, isEmbedUser = false }) => {
  const resolvedParams = use(params);
  const orgId = resolvedParams?.org_id;
  const { folders, createFolder, renameFolder, deleteFolder, moveResource } = useFolders("tools", orgId, isEmbedUser);
  const { activeFolderId, setDraggedResourceId } = useFolderContext();
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams?.get("filter");

  const { functionData, integrationData, embedToken, descriptions, linksData, allBridges, agentsVersionsData } =
    useCustomSelector((state) => ({
      functionData: state?.bridgeReducer?.org?.[orgId]?.functionData || {},
      integrationData: state?.bridgeReducer?.org?.[orgId]?.integrationData || {},
      embedToken: state?.bridgeReducer?.org?.[orgId]?.embed_token,
      descriptions: state.flowDataReducer.flowData?.descriptionsData?.descriptions || {},
      linksData: state.flowDataReducer.flowData.linksData || [],
      allBridges: state?.bridgeReducer?.org?.[orgId]?.orgs || [],
      agentsVersionsData: state?.bridgeReducer?.agentsVersionsData || {},
    }));

  const getAgentInfo = useCallback(
    (agentId) => {
      const bridge = (allBridges || []).find((b) => b?._id === agentId);
      if (!bridge) return null;

      return {
        bridgeId: bridge._id,
        bridgeName: bridge.name || "Untitled bridge",
        published_version_id: bridge?.published_version_id,
        deletedAt: bridge?.deletedAt,
      };
    },
    [allBridges]
  );

  const getVersionLabel = useCallback(
    (agentId, versionId) => {
      const bridge = (allBridges || []).find((b) => b?._id === agentId);
      if (!bridge) return "Unknown Version";

      const versions = Array.isArray(bridge.versions) ? bridge.versions : [];
      const versionIndex = versions.indexOf(versionId);

      if (versionIndex === -1) return "Unknown Version";
      return `version ${versionIndex + 1}`;
    },
    [allBridges]
  );

  const [filteredTools, setFilteredTools] = useState([]);
  const [functionId, setFunctionId] = useState(null);
  const [functionDetails, setFunctionDetails] = useState({});
  const [toolData, setToolData] = useState({});
  const [functionName, setFunctionName] = useState("");
  const [selectedToolAgents, setSelectedToolAgents] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [openDropdownToolId, setOpenDropdownToolId] = useState(null);
  const [agentsDropdownPlacement, setAgentsDropdownPlacement] = useState("down");
  const [expandedAgentId, setExpandedAgentId] = useState(null);

  const { handlePortalOpen, handlePortalCloseImmediate, PortalDropdown, PortalStyles } = usePortalDropdown({
    offsetX: -100,
    offsetY: 5,
  });

  useEffect(() => {
    if (!openDropdownToolId) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest?.("[data-agents-dropdown]")) {
        setOpenDropdownToolId(null);
        setExpandedAgentId(null);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setOpenDropdownToolId(null);
        setExpandedAgentId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openDropdownToolId]);

  useEffect(() => {
    if (orgId) {
      dispatch(getAgentsVersionsDataAction(orgId));
    }
  }, [orgId, dispatch]);

  const allTools = useMemo(() => {
    return Object.values(functionData || {}).filter(Boolean);
  }, [functionData]);

  const tableData = useMemo(() => {
    return allTools.map((fn) => {
      const scriptId = fn?.script_id;
      const integration = integrationData?.[scriptId];
      const title = fn?.title || integration?.title || scriptId || "Untitled tool";
      const icons = integration?.serviceIcons || [];

      const toolAgentsVersions = agentsVersionsData[fn?._id] || {};
      const seenBridgeIds = new Set();
      const connectionsMap = new Map();

      Object.entries(toolAgentsVersions).forEach(([agentId, versionIds]) => {
        const agentInfo = getAgentInfo(agentId);
        const versionArray = Array.isArray(versionIds) ? versionIds : [];

        // Skip if agent not found
        if (!agentInfo) return;

        // Use bridgeId as the key to deduplicate - check early
        const bridgeId = agentInfo.bridgeId;
        if (seenBridgeIds.has(bridgeId)) return;

        // Skip if no versions and no published version
        if (agentInfo.deletedAt || (versionArray.length === 0 && !agentInfo?.published_version_id)) return;

        // Mark as seen before adding to map
        seenBridgeIds.add(bridgeId);

        const agentName = agentInfo?.bridgeName || "Unknown Agent";

        // If version array is empty but agent has published_version_id, use it
        if (versionArray.length === 0 && agentInfo?.published_version_id) {
          connectionsMap.set(bridgeId, {
            bridgeId,
            bridgeName: agentName,
            versions: [],
            isPublished: true,
          });
          return;
        }

        // Only add if there are versions
        if (versionArray.length > 0) {
          const versions = versionArray.map((versionId) => {
            const versionLabel = getVersionLabel(agentId, versionId);
            return {
              versionLabel,
              versionId,
            };
          });

          connectionsMap.set(bridgeId, {
            bridgeId,
            bridgeName: agentName,
            versions: versions.sort((a, b) =>
              (a.versionLabel || "").localeCompare(b.versionLabel || "", undefined, { numeric: true })
            ),
          });
        }
      });

      const connections = Array.from(connectionsMap.values());

      return {
        _id: fn?._id,
        title, // Plain string for proper custom table sorting
        icons, // Service icons passed separately
        script_id: scriptId,
        description: fn?.description || "-",
        status: fn?.status ?? integration?.status ?? "-",
        agents: connections,
        agentsCount: connections.length,
        createdAt: fn?.createdAt ? formatRelativeTime(fn.createdAt) : "-",
        updatedAt: fn?.updatedAt ? formatRelativeTime(fn.updatedAt) : "-",
        createdAtOriginal: fn?.createdAt ? formatDate(fn.createdAt) : "-",
        updatedAtOriginal: fn?.updatedAt ? formatDate(fn.updatedAt) : "-",
        createdAt_original: fn?.createdAt || null, // Chronological sorting parameter
        updatedAt_original: fn?.updatedAt || null, // Chronological sorting parameter
        originalData: fn,
      };
    });
  }, [allTools, integrationData, agentsVersionsData, getAgentInfo, getVersionLabel]);

  const displayedTools = useMemo(() => {
    return filteredTools;
    /* if (activeFolderId === null) return filteredTools;
    if (activeFolderId === "uncategorized") {
      return filteredTools.filter((item) => !item.originalData?.folder_id);
    }
    return filteredTools.filter((item) => item.originalData?.folder_id === activeFolderId); */
  }, [filteredTools, activeFolderId]);

  useEffect(() => {
    if (filterParam) {
      const filtered = tableData.filter((item) => item?._id === filterParam);
      setFilteredTools(filtered);
    } else {
      setFilteredTools(tableData);
    }
  }, [tableData, filterParam]);

  const handleAddNewTool = useCallback(() => {
    if (typeof window === "undefined" || typeof window.openViasocket !== "function") {
      toast.error("Tool builder is still loading, please try again in a moment.");
      return;
    }
    const folderId =
      activeFolderId && activeFolderId !== "uncategorized"
        ? activeFolderId
        : (typeof window !== "undefined" ? sessionStorage.getItem("gtwy_folder_id") : null) || null;
    window.openViasocket(undefined, {
      embedToken,
      meta: {
        type: "tool",
        createFrom: "Tools",
        ...(folderId ? { folder_id: folderId } : {}),
      },
    });
  }, [embedToken, activeFolderId]);

  const handleFilterDropdownClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      const dropdownContent = (
        <ul className="menu bg-base-100 rounded-box w-56 p-2 shadow text-sm">
          <li>
            <button
              data-testid="tools-filter-option-all"
              onClick={() => {
                setActiveFilter("all");
                handlePortalCloseImmediate();
              }}
              className="flex items-center gap-2"
            >
              <Layers size={14} />
              <span>All</span>
            </button>
          </li>
          <li>
            <button
              data-testid="tools-filter-option-connected"
              onClick={() => {
                setActiveFilter("connected");
                handlePortalCloseImmediate();
              }}
              className="flex items-center gap-2"
            >
              <Link2 size={14} />
              <span>Connected</span>
            </button>
          </li>
          <li>
            <button
              data-testid="tools-filter-option-recent"
              onClick={() => {
                setActiveFilter("recent");
                handlePortalCloseImmediate();
              }}
              className="flex items-center gap-2"
            >
              <Clock size={14} />
              <span>Recent</span>
            </button>
          </li>
        </ul>
      );

      handlePortalOpen(e.currentTarget, dropdownContent);
    },
    [handlePortalOpen, handlePortalCloseImmediate]
  );

  const handleOpenTool = useCallback(
    (fn) => {
      const scriptId = fn?.script_id;
      const row = tableData.find((r) => r._id === fn?._id);
      setSelectedToolAgents(row?.agents || []);
      if (typeof window !== "undefined" && typeof window.openViasocket === "function" && scriptId) {
        const folderId =
          fn?.folder_id ||
          (activeFolderId && activeFolderId !== "uncategorized" ? activeFolderId : null) ||
          (typeof window !== "undefined" ? sessionStorage.getItem("gtwy_folder_id") : null) ||
          null;
        window.openViasocket(scriptId, {
          embedToken,
          meta: {
            type: "tool",
            ...(folderId ? { folder_id: folderId } : {}),
          },
        });
        return;
      }
      setFunctionId(fn?._id);
      setFunctionDetails(fn);
      setToolData(fn);
      setFunctionName(fn?.script_id);
      openModal(MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL);
    },
    [embedToken, tableData]
  );

  const handleConfigTool = useCallback(
    (fn) => {
      const row = tableData.find((r) => r._id === fn?._id);
      setSelectedToolAgents(row?.agents || []);
      setFunctionId(fn?._id);
      setFunctionDetails(fn);
      setToolData(fn);
      setFunctionName(fn?.script_id);
      openModal(MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL);
    },
    [tableData]
  );

  const handleSaveFunctionData = useCallback(() => {
    if (!functionId) return;
    if (!isEqual(toolData, functionDetails)) {
      const { _id, ...dataToSend } = toolData || {};
      dispatch(
        updateFuntionApiAction({
          function_id: functionId,
          dataToSend,
          embedToken,
        })
      );
    }
  }, [functionId, toolData, functionDetails, dispatch, embedToken]);

  const customCellRenderers = useMemo(
    () => ({
      title: (row) => {
        const title = row.title || "Untitled tool";
        const icons = row.icons || [];
        return (
          <div className="flex gap-3 items-center">
            <div className="flex items-center shrink-0">
              {icons.length > 0 ? (
                <div className="flex items-center -space-x-2 flex-shrink-0">
                  {icons.slice(0, 5).map((icon, idx) => (
                    <img
                      key={idx}
                      src={icon}
                      alt={`${title} icon ${idx + 1}`}
                      className="w-6 h-6 rounded-full border-2 border-base-100 flex-shrink-0 object-contain bg-white p-0.5"
                      style={{ zIndex: 5 - idx }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Wrench size={16} className="text-base-content/70" />
              )}
            </div>
            <span className="truncate" title={title}>
              {title}
            </span>
          </div>
        );
      },
      description: (row) => (
        <div className="text-sm text-base-content max-w-xs min-w-0 overflow-hidden">
          {row?.description && row.description !== "-" ? (
            <InfoTooltip tooltipContent={row.description}>
              <span className="truncate block cursor-help">
                {row.description.length > 40 ? row.description.slice(0, 40) + "..." : row.description}
              </span>
            </InfoTooltip>
          ) : (
            <span className="text-gray-400 italic">No description</span>
          )}
        </div>
      ),
      status: (row) => {
        const status = row?.status;
        const normalizedStatus = status === 1 ? "Active" : status === 0 ? "Inactive" : status || "-";
        const statusTone = normalizedStatus.toString().trim().toLowerCase();
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClass(
              statusTone
            )} ${
              statusTone === "active" || statusTone === "published" || statusTone === "1"
                ? "bg-green-100 text-green-700"
                : statusTone === "paused"
                  ? "bg-red-100 text-red-700"
                  : statusTone === "drafted"
                    ? "bg-yellow-100 text-yellow-700"
                    : statusTone === "rejected"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-base-200 text-base-content/80"
            }`}
          >
            {normalizedStatus}
          </span>
        );
      },
      createdAt: (row) => (
        <div className="group cursor-help inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors">
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-base-content group-hover:hidden">{row.createdAt}</span>
            <span className="text-xs text-base-content hidden group-hover:inline">{row.createdAtOriginal}</span>
          </div>
        </div>
      ),
      updatedAt: (row) => (
        <div className="group cursor-help inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors">
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-base-content group-hover:hidden">{row.updatedAt}</span>
            <span className="text-xs text-base-content hidden group-hover:inline">{row.updatedAtOriginal}</span>
          </div>
        </div>
      ),
      agents: (row) => {
        const count = row.agents?.length || 0;
        if (count === 0) {
          return <span className="text-base-content/60 text-xs">No agents</span>;
        }

        const isOpen = openDropdownToolId === row._id;

        return (
          <div className="relative inline-block" data-agents-dropdown>
            <button
              type="button"
              data-testid={`tools-connected-agents-dropdown-btn-${row._id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isOpen && typeof window !== "undefined") {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const approxDropdownHeight = 320;
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const spaceAbove = rect.top;
                  const shouldOpenUp = spaceBelow < approxDropdownHeight && spaceAbove > spaceBelow;
                  setAgentsDropdownPlacement(shouldOpenUp ? "up" : "down");
                }
                setOpenDropdownToolId(isOpen ? null : row._id);
                setExpandedAgentId(null);
              }}
              className="inline-flex items-center justify-center gap-1 font-bold hover:opacity-80 transition-opacity"
              style={{
                minWidth: 32,
                height: 24,
                padding: "0 8px",
                borderRadius: 12,
                background: "rgb(59,130,246)",
                color: "rgb(244,244,245)",
                fontSize: 11,
                lineHeight: 1,
                letterSpacing: "0.04em",
              }}
              title={`Connected to ${count} agent${count === 1 ? "" : "s"}`}
            >
              <Bot size={12} />+{count}
            </button>

            {isOpen && (
              <div
                className={`absolute left-0 z-50 bg-base-100 border border-base-content/60 shadow-lg rounded min-w-[240px] ${
                  agentsDropdownPlacement === "up" ? "bottom-full mb-1" : "top-full mt-1"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="px-3 py-2 border-b border-base-200 text-base-content/60 uppercase tracking-wider"
                  style={{ fontSize: 10 }}
                >
                  Connected agents
                </div>
                <ul className="max-h-72 overflow-y-auto py-1">
                  {row.agents.map((agent) => {
                    const isExpanded = expandedAgentId === agent.bridgeId;
                    const hasVersions = agent.versions.length > 0;
                    return (
                      <li key={agent.bridgeId} className="border-b border-base-200 last:border-b-0">
                        <button
                          type="button"
                          data-testid={`tools-connected-agent-option-${agent.bridgeId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasVersions) {
                              setExpandedAgentId(isExpanded ? null : agent.bridgeId);
                            } else {
                              const queryParams = agent.isPublished ? "?isPublished=true" : "";
                              const url = `/org/${orgId}/agents/configure/${agent.bridgeId}${queryParams}`;
                              setOpenDropdownToolId(null);
                              if (e.metaKey || e.ctrlKey) {
                                window.open(url, "_blank");
                              } else {
                                router.push(url);
                              }
                            }
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-base-200 transition-colors text-left text-sm"
                        >
                          <Bot size={12} className="text-base-content/60 shrink-0" />
                          <span className="flex-1 min-w-0 truncate" title={agent.bridgeName}>
                            {agent.bridgeName}
                          </span>
                          {hasVersions ? (
                            <ChevronRight
                              size={12}
                              strokeWidth={2.5}
                              className={`text-base-content/40 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                          ) : (
                            <ChevronRight size={12} strokeWidth={2.5} className="text-base-content/40 shrink-0" />
                          )}
                        </button>

                        {hasVersions && isExpanded && (
                          <ul className="bg-base-200/40 py-1">
                            {agent.versions.map((version) => (
                              <li key={version.versionId}>
                                <button
                                  type="button"
                                  data-testid={`tools-connected-agent-version-option-${version.versionId}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = `/org/${orgId}/agents/configure/${agent.bridgeId}?version=${version.versionId}`;
                                    setOpenDropdownToolId(null);
                                    setExpandedAgentId(null);
                                    if (e.metaKey || e.ctrlKey) {
                                      window.open(url, "_blank");
                                    } else {
                                      router.push(url);
                                    }
                                  }}
                                  className="w-full flex items-center justify-between gap-2 pl-9 pr-3 py-1.5 hover:bg-base-300 transition-colors text-left text-xs group"
                                >
                                  <span className="truncate">{version.versionLabel}</span>
                                  <ChevronRight
                                    size={10}
                                    className="text-base-content/40 shrink-0 group-hover:translate-x-0.5 transition-transform"
                                  />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      },
    }),
    [openDropdownToolId, expandedAgentId, orgId, router]
  );

  const EndComponent = useCallback(
    ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConfigTool(row.originalData);
            }}
            className="btn btn-outline-none btn-ghost btn-sm"
            title="Configure tool"
          >
            <Settings size={14} />
          </button>
          {/* <div className="dropdown dropdown-left">
            <label tabIndex={0} className="btn btn-ghost btn-xs btn-circle text-base-content/70 hover:bg-base-300">
              <Folder size={14} />
            </label>
            <div tabIndex={0} className="dropdown-content z-[100] mt-2">
              <MoveToFolderMenu folders={folders} currentFolderId={row.originalData?.folder_id} onMove={(folderId) => moveResource(row._id, folderId)} />
            </div>
          </div> */}
        </div>
      );
    },
    [handleConfigTool, folders, moveResource]
  );

  return (
    <div className="flex w-full min-h-screen">
      <div className="w-full overflow-x-hidden flex flex-col h-screen flex-1">
        <div className="px-2 pt-4">
          <MainLayout>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <PageHeader
                title="Tools"
                docLink={linksData?.find((link) => link.title === "Tools")?.blog_link}
                description={
                  descriptions?.["Tools"] ||
                  "All custom tools available in this organization. Create new tools or click an existing tool to configure it."
                }
              />
            </div>
          </MainLayout>
        </div>

        {allTools.length > 0 && (
          <div className="px-4 pb-3 flex flex-row gap-4 items-center flex-wrap">
            {(allTools?.length > 5 || filterParam) && (
              <SearchItems
                data={tableData}
                setFilterItems={setFilteredTools}
                item="Tool"
                containerClass="max-w-xs"
                inputContainerClass="relative"
              />
            )}
            <button
              data-testid="tools-filter-dropdown-btn"
              className="btn btn-outline btn-ghost text-sm btn-sm border border-base-300 gap-1"
              onClick={handleFilterDropdownClick}
            >
              <Funnel size={14} />
              <span>Filter</span>
              <span className="text-xs text-gray-500">
                {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
              </span>
            </button>
            <button type="button" onClick={handleAddNewTool} className="btn btn-primary btn-sm">
              <Plus size={16} strokeWidth={2.5} />
              Create New Tool
            </button>
          </div>
        )}

        {/* {!isEmbedUser && allTools.length > 0 && (
          <FolderTabs
            folders={folders}
            resourceType="tools"
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onMoveResource={moveResource}
          />
        )} */}

        <div className="px-4 pb-8 flex-1 overflow-y-auto">
          {allTools.length === 0 ? (
            <EmptyState onAddTool={handleAddNewTool} />
          ) : (
            <CustomTable
              data={displayedTools}
              /* draggableRows={true}
              onDragStart={(row) => setDraggedResourceId(row._id)}
              onDragEnd={() => setDraggedResourceId(null)} */
              columnsToShow={["title", "description", "status", "agents", "createdAt", "updatedAt"]}
              sorting
              sortingColumns={["title", "createdAt", "updatedAt"]}
              customGetColumnLabel={getColumnLabel}
              customCellRenderers={customCellRenderers}
              endComponent={EndComponent}
              handleRowClick={(row) => {
                handleOpenTool(row.originalData);
              }}
              keysToExtractOnRowClick={["_id", "originalData"]}
              filterFunction={(item) => {
                const RECENT_DAYS = 7;
                const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
                if (activeFilter === "connected") {
                  return (item.agentsCount || 0) > 0;
                }
                if (activeFilter === "recent") {
                  const ts = item.originalData?.updatedAt || item.originalData?.createdAt;
                  return ts && new Date(ts).getTime() >= cutoff;
                }
                return true;
              }}
            />
          )}

          {allTools.length > 0 && filteredTools.length === 0 && (
            <div className="text-center py-12">
              <p className="text-base-content/60 text-sm">No tools match your search.</p>
            </div>
          )}
        </div>

        <FunctionParameterModal
          isPublished={false}
          name="Tool"
          functionId={functionId}
          Model_Name={MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL}
          embedToken={embedToken}
          handleSave={handleSaveFunctionData}
          toolData={toolData}
          setToolData={setToolData}
          function_details={functionDetails}
          variables_path={{}}
          functionName={functionName}
          setVariablesPath={() => {}}
          variablesPath={{}}
          disableValuePath={true}
          connectedAgents={selectedToolAgents}
        />

        <PortalDropdown />
        <PortalStyles />
      </div>
    </div>
  );
};

const WrappedToolsPage = (props) => (
  <ResourcePage>
    <ToolsPage {...props} />
  </ResourcePage>
);
export default Protected(WrappedToolsPage);
