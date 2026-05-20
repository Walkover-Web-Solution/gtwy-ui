"use client";
import React, { useEffect, useMemo, useState, use, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Wrench, Bot, Settings } from "lucide-react";
import { toast } from "react-toastify";
import PageHeader from "@/components/Pageheader";
import MainLayout from "@/components/layoutComponents/MainLayout";
import SearchItems from "@/components/UI/SearchItems";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getAllFunctions, updateFuntionApiAction } from "@/store/action/bridgeAction";
import { isEqual } from "lodash";
import FunctionParameterModal from "@/components/configuration/configurationComponent/FunctionParameterModal";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, formatRelativeTime, formatDate } from "@/utils/utility";

export const runtime = "edge";

const FEATURED_APPS = [
  { domain: "gmail.com", name: "Gmail" },
  { domain: "notion.so", name: "Notion" },
  { domain: "slack.com", name: "Slack" },
  { domain: "drive.google.com", name: "Google Drive" },
];

const ToolCard = React.memo(
  ({ fn, integrationData, idLookup, onOpen, onConfig, onConnectionsToggle, isConnectionsOpen, orgId, router }) => {
    const scriptId = fn?.script_id;
    const integration = integrationData?.[scriptId];
    const title = fn?.title || integration?.title || scriptId || "Untitled tool";
    const icons = integration?.serviceIcons || [];

    const rawConnectionIds = [
      ...(Array.isArray(fn?.bridge_ids) ? fn.bridge_ids : []),
      ...(Array.isArray(fn?.version_ids) ? fn.version_ids : []),
    ];

    const connectionsMap = new Map();
    rawConnectionIds.forEach((id) => {
      const info = idLookup[id];
      if (!info) return;
      const existing = connectionsMap.get(info.bridgeId);
      if (existing) {
        if (info.versionLabel && !existing.versions.some((v) => v.versionId === info.versionId)) {
          existing.versions.push({ versionLabel: info.versionLabel, versionId: info.versionId });
        }
      } else {
        connectionsMap.set(info.bridgeId, {
          bridgeId: info.bridgeId,
          bridgeName: info.bridgeName,
          versions: info.versionLabel ? [{ versionLabel: info.versionLabel, versionId: info.versionId }] : [],
        });
      }
    });

    const connections = Array.from(connectionsMap.values()).map((c) => ({
      ...c,
      versions: c.versions
        .slice()
        .sort((a, b) => (a.versionLabel || "").localeCompare(b.versionLabel || "", undefined, { numeric: true })),
    }));

    const toolKey = fn?._id || scriptId;

    return (
      <div
        key={fn?._id || scriptId}
        className="relative group/card rounded bg-base-200 border border-base-300 shadow-sm hover:shadow-md transition-shadow flex flex-col"
        style={{ borderRadius: 4 }}
      >
        <div className="w-full flex items-center gap-2.5 px-3 py-3 relative" data-connections-dropdown>
          <button
            type="button"
            onClick={() => onOpen(fn)}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer border-0 text-left bg-transparent hover:opacity-80 transition-opacity"
            aria-label={`Open ${title} tool`}
          >
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
            <div className="flex-1 min-w-0">
              <p
                className="truncate m-0 text-base-content"
                style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em" }}
                title={title}
              >
                {title}
              </p>
              {connections.length > 0 && (
                <p className="text-xs text-base-content/60 m-0">
                  Connected to {connections.length} agent{connections.length === 1 ? "" : "s"}
                </p>
              )}
              <div className="m-0 mt-2 space-y-1.5">
                {fn?.createdAt && (
                  <div className="group cursor-help inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-medium text-base-content/40">Created at</span>
                      <span className="text-[10px] font-medium text-base-content/50 group-hover:hidden">
                        {formatRelativeTime(fn.createdAt)}
                      </span>
                      <span className="text-[10px] font-medium text-base-content/50 hidden group-hover:inline">
                        {formatDate(fn.createdAt)}
                      </span>
                    </div>
                  </div>
                )}
                {fn?.updatedAt && (
                  <div className="group cursor-help inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-medium text-base-content/40">Updated at</span>
                      <span className="text-[10px] font-medium text-base-content/50 group-hover:hidden">
                        {formatRelativeTime(fn.updatedAt)}
                      </span>
                      <span className="text-[10px] font-medium text-base-content/50 hidden group-hover:inline">
                        {formatDate(fn.updatedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {connections.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectionsToggle(toolKey);
                }}
                className="inline-flex items-center justify-center gap-1 font-bold hover:opacity-80 transition-opacity"
                style={{
                  minWidth: 22,
                  height: 22,
                  padding: "0 7px",
                  borderRadius: 11,
                  background: "rgb(59,130,246)",
                  color: "rgb(244,244,245)",
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 11,
                  lineHeight: 1,
                  letterSpacing: "0.04em",
                }}
                title={`Connected to ${connections.length} agent${connections.length === 1 ? "" : "s"}`}
                aria-label={`Show connections for ${title}`}
              >
                <Bot size={10} />+{connections.length}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConfig(fn);
              }}
              className="p-1 rounded hover:bg-base-200 transition-colors text-base-content/60 hover:text-base-content"
              title="Configure tool"
              aria-label={`Configure ${title} tool`}
            >
              <Settings size={14} />
            </button>

            <ChevronRight
              size={11}
              strokeWidth={2.5}
              className="text-base-content/40 group-hover/card:text-base-content/70 transition-all"
            />
          </div>

          {isConnectionsOpen && connections.length > 0 && (
            <div
              className="absolute left-3 right-3 top-full mt-1 z-30 bg-base-100 border border-base-300 shadow-lg rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="px-3 py-2 border-b border-base-200 text-base-content/60 uppercase tracking-wider"
                style={{ fontSize: 10 }}
              >
                Connected agents
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {connections.map((conn) => {
                  const defaultVersion = conn.versions[0];
                  return (
                    <li key={conn.bridgeId}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = defaultVersion?.versionId
                            ? `/org/${orgId}/agents/configure/${conn.bridgeId}?version=${defaultVersion.versionId}`
                            : `/org/${orgId}/agents/configure/${conn.bridgeId}`;

                          if (e.metaKey || e.ctrlKey) {
                            window.open(url, "_blank");
                          } else {
                            onConnectionsToggle(null);
                            router.push(url);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-base-200 transition-colors text-left"
                        style={{ fontSize: 12 }}
                      >
                        <Bot size={12} className="text-base-content/60 shrink-0" />
                        <span className="flex-1 min-w-0 truncate text-base-content" title={conn.bridgeName}>
                          {conn.bridgeName}
                        </span>
                        <ChevronRight size={11} strokeWidth={2.5} className="text-base-content/40 shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ToolCard.displayName = "ToolCard";

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

const ToolsPage = ({ params }) => {
  const resolvedParams = use(params);
  const orgId = resolvedParams?.org_id;
  const dispatch = useDispatch();
  const router = useRouter();

  const { functionData, integrationData, embedToken, descriptions, linksData, allBridges } = useCustomSelector(
    (state) => ({
      functionData: state?.bridgeReducer?.org?.[orgId]?.functionData || {},
      integrationData: state?.bridgeReducer?.org?.[orgId]?.integrationData || {},
      embedToken: state?.bridgeReducer?.org?.[orgId]?.embed_token,
      descriptions: state.flowDataReducer.flowData?.descriptionsData?.descriptions || {},
      linksData: state.flowDataReducer.flowData.linksData || [],
      allBridges: state?.bridgeReducer?.org?.[orgId]?.orgs || [],
    })
  );

  const idLookup = useMemo(() => {
    const map = {};
    (allBridges || []).forEach((bridge) => {
      if (!bridge?._id) return;
      map[bridge._id] = { bridgeId: bridge._id, bridgeName: bridge.name || "Untitled bridge", versionLabel: null };
      const versions = Array.isArray(bridge.versions) ? bridge.versions : [];
      versions.forEach((versionId, idx) => {
        if (!versionId) return;
        map[versionId] = {
          bridgeId: bridge._id,
          bridgeName: bridge.name || "Untitled bridge",
          versionLabel: `v${idx + 1}`,
          versionId,
        };
      });
    });
    return map;
  }, [allBridges]);

  const [filteredTools, setFilteredTools] = useState([]);
  const [functionId, setFunctionId] = useState(null);
  const [functionDetails, setFunctionDetails] = useState({});
  const [toolData, setToolData] = useState({});
  const [functionName, setFunctionName] = useState("");
  const [openConnectionsFor, setOpenConnectionsFor] = useState(null);
  const [sortBy] = useState("name");

  const allTools = useMemo(() => {
    return Object.values(functionData || {}).filter(Boolean);
  }, [functionData]);

  const sortedAndFilteredTools = useMemo(() => {
    let tools = [...allTools];
    if (sortBy === "name") {
      tools.sort((a, b) => {
        const aTitle = a?.title || a?.script_id || "Untitled";
        const bTitle = b?.title || b?.script_id || "Untitled";
        return aTitle.localeCompare(bTitle);
      });
    } else if (sortBy === "connections") {
      tools.sort((a, b) => {
        const aConnections = (a?.bridge_ids?.length || 0) + (a?.version_ids?.length || 0);
        const bConnections = (b?.bridge_ids?.length || 0) + (b?.version_ids?.length || 0);
        return bConnections - aConnections;
      });
    }
    return tools;
  }, [allTools, sortBy]);

  useEffect(() => {
    setFilteredTools(sortedAndFilteredTools);
  }, [sortedAndFilteredTools]);

  useEffect(() => {
    dispatch(getAllFunctions());
  }, [dispatch]);

  useEffect(() => {
    if (!openConnectionsFor) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest?.("[data-connections-dropdown]")) {
        setOpenConnectionsFor(null);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpenConnectionsFor(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openConnectionsFor]);

  const handleAddNewTool = useCallback(() => {
    if (typeof window === "undefined" || typeof window.openViasocket !== "function") {
      toast.error("Tool builder is still loading, please try again in a moment.");
      return;
    }
    window.openViasocket(undefined, {
      embedToken,
      meta: {
        type: "tool",
        createFrom: "Tools",
      },
    });
  }, [embedToken]);

  const handleOpenTool = useCallback(
    (fn) => {
      const scriptId = fn?.script_id;
      if (typeof window !== "undefined" && typeof window.openViasocket === "function" && scriptId) {
        window.openViasocket(scriptId, {
          embedToken,
          meta: {
            type: "tool",
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
    [embedToken]
  );

  const handleConfigTool = useCallback((fn) => {
    setFunctionId(fn?._id);
    setFunctionDetails(fn);
    setToolData(fn);
    setFunctionName(fn?.script_id);
    openModal(MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL);
  }, []);

  const handleConnectionsToggle = useCallback((toolKey) => {
    setOpenConnectionsFor((prev) => (prev === toolKey ? null : toolKey));
  }, []);

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

  return (
    <div className="w-full h-screen flex flex-col">
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

      <div className="px-4 pb-3 flex flex-row gap-4 items-center">
        {allTools?.length > 5 && <SearchItems data={allTools} setFilterItems={setFilteredTools} item="Tool" />}
        <button type="button" onClick={handleAddNewTool} className="btn btn-primary btn-sm">
          <Plus size={16} strokeWidth={2.5} />
          Create New Tool
        </button>
      </div>

      <div className="px-4 pb-8 flex-1 overflow-y-auto">
        {allTools.length === 0 ? (
          <EmptyState onAddTool={handleAddNewTool} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredTools.map((fn) => (
              <ToolCard
                key={fn?._id || fn?.script_id}
                fn={fn}
                integrationData={integrationData}
                idLookup={idLookup}
                onOpen={handleOpenTool}
                onConfig={handleConfigTool}
                onConnectionsToggle={handleConnectionsToggle}
                isConnectionsOpen={openConnectionsFor === (fn?._id || fn?.script_id)}
                orgId={orgId}
                router={router}
              />
            ))}
          </div>
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
      />
    </div>
  );
};

export default ToolsPage;
