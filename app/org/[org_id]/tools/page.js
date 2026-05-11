"use client";
import React, { useEffect, useMemo, useState, use } from "react";
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
import { openModal } from "@/utils/utility";

export const runtime = "edge";

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
  // Build a single lookup that, given any id (either a bridge id or a
  // version id), returns { bridgeId, bridgeName, versionLabel }.
  // The backend currently stores version-ids inside `bridge_ids` on a tool,
  // so we resolve through both maps.
  const idLookup = useMemo(() => {
    const map = {};
    (allBridges || []).forEach((bridge) => {
      if (!bridge?._id) return;
      // bridge id itself
      map[bridge._id] = { bridgeId: bridge._id, bridgeName: bridge.name || "Untitled bridge", versionLabel: null };
      // each version id
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
  // Local state for filtering and modal
  const [filteredTools, setFilteredTools] = useState([]);
  const [functionId, setFunctionId] = useState(null);
  const [functionDetails, setFunctionDetails] = useState({});
  const [toolData, setToolData] = useState({});
  const [functionName, setFunctionName] = useState("");
  const [openConnectionsFor, setOpenConnectionsFor] = useState(null);

  // Build tools list from redux map
  const allTools = useMemo(() => {
    return Object.values(functionData || {}).filter(Boolean);
  }, [functionData]);

  useEffect(() => {
    setFilteredTools(allTools);
  }, [allTools]);

  // Refresh tools list on mount
  useEffect(() => {
    dispatch(getAllFunctions());
  }, [dispatch]);

  // Close the connections dropdown on outside click / escape
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

  const handleAddNewTool = () => {
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
  };

  const handleOpenTool = (fn) => {
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
    // Fallback: open the parameter / details modal
    setFunctionId(fn?._id);
    setFunctionDetails(fn);
    setToolData(fn);
    setFunctionName(fn?.script_id);
    openModal(MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL);
  };

  const handleConfigTool = (fn) => {
    setFunctionId(fn?._id);
    setFunctionDetails(fn);
    setToolData(fn);
    setFunctionName(fn?.script_id);
    openModal(MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL);
  };

  const handleSaveFunctionData = () => {
    // Persist field/required_params edits the same way EmbedList does:
    // compare current toolData against the original function record and
    // call updateFuntionApiAction when they differ.
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
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="px-2 pt-4">
        <MainLayout>
          <div className="flex flex-col sm:flex-row">
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

      <div className="px-4 pb-3 flex items-center gap-2">
        {allTools?.length > 5 && <SearchItems data={allTools} setFilterItems={setFilteredTools} item="Tool" />}
      </div>

      <div className="px-4 pb-8">
        {allTools.length === 0 ? (
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
                <img
                  src="https://www.google.com/s2/favicons?domain=gmail.com&sz=64"
                  alt="Gmail"
                  className="w-6 h-6 object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <img
                  src="https://www.google.com/s2/favicons?domain=notion.so&sz=64"
                  alt="Notion"
                  className="w-6 h-6 object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <img
                  src="https://www.google.com/s2/favicons?domain=slack.com&sz=64"
                  alt="Slack"
                  className="w-6 h-6 object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <img
                  src="https://www.google.com/s2/favicons?domain=drive.google.com&sz=64"
                  alt="Google Drive"
                  className="w-6 h-6 object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
              <button
                type="button"
                onClick={handleAddNewTool}
                className="btn btn-primary inline-flex items-center gap-2 px-6"
                style={{ borderRadius: 6, fontWeight: 600, letterSpacing: "0.04em" }}
              >
                <Plus size={16} strokeWidth={2.5} />
                NEW TOOLS
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {/* Add new tool card */}
            <button
              type="button"
              onClick={handleAddNewTool}
              className="relative overflow-hidden group/add cursor-pointer border-0 text-left rounded transition-colors hover:border-base-content/40"
              style={{
                background: "var(--fallback-b1,oklch(var(--b1)/1))",
                border: "2px dashed var(--fallback-bc,oklch(var(--bc)/0.25))",
                borderRadius: 4,
              }}
            >
              <div className="flex items-center gap-2.5 px-3 py-3">
                <div
                  className="w-8 h-8 flex items-center justify-center shrink-0 rounded-full"
                  style={{
                    background: "var(--fallback-b3,oklch(var(--b3)/1))",
                    border: "1.5px solid var(--fallback-bc,oklch(var(--bc)/0.3))",
                  }}
                >
                  <Plus size={16} className="text-base-content/70 group-hover/add:text-base-content" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate m-0 text-base-content"
                    style={{ fontWeight: 500, fontSize: 13, letterSpacing: "-0.01em" }}
                  >
                    Add new tool
                  </p>
                </div>
              </div>
            </button>

            {/* Existing tool cards */}
            {filteredTools.map((fn) => {
              const scriptId = fn?.script_id;
              const integration = integrationData?.[scriptId];
              const title = fn?.title || integration?.title || scriptId || "Untitled tool";
              const icons = integration?.serviceIcons || [];
              // Resolve connections from bridge_ids + version_ids (de-duplicated by bridge+version)
              const rawConnectionIds = [
                ...(Array.isArray(fn?.bridge_ids) ? fn.bridge_ids : []),
                ...(Array.isArray(fn?.version_ids) ? fn.version_ids : []),
              ];
              // Group by bridgeId so each agent appears once with all its
              // connected versions collected together.
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
              // Sort each agent's versions naturally (v1, v2, ...)
              const connections = Array.from(connectionsMap.values()).map((c) => ({
                ...c,
                versions: c.versions
                  .slice()
                  .sort((a, b) =>
                    (a.versionLabel || "").localeCompare(b.versionLabel || "", undefined, { numeric: true })
                  ),
              }));
              const toolKey = fn?._id || scriptId;
              const isConnectionsOpen = openConnectionsFor === toolKey;

              return (
                <div
                  key={fn?._id || scriptId}
                  className="relative group/card rounded bg-base-200 border border-base-300 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  style={{ borderRadius: 4 }}
                >
                  <div className="w-full flex items-center gap-2.5 px-3 py-3 relative" data-connections-dropdown>
                    <button
                      type="button"
                      onClick={() => handleOpenTool(fn)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer border-0 text-left bg-transparent"
                    >
                      <div
                        className="w-8 h-8 flex items-center justify-center shrink-0 bg-base-100 border border-base-300 rounded-sm"
                        style={{ boxShadow: "rgba(0,0,0,0.04) 0px 1px 3px" }}
                      >
                        {icons.length > 0 ? (
                          <img
                            src={icons[0]}
                            alt={title}
                            className="w-[22px] h-[22px] object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
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
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {connections.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenConnectionsFor((prev) => (prev === toolKey ? null : toolKey));
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
                        >
                          <Bot size={10} />+{connections.length}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfigTool(fn);
                        }}
                        className="p-1 rounded hover:bg-base-200 transition-colors text-base-content/60 hover:text-base-content"
                        title="Configure tool"
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
                                    setOpenConnectionsFor(null);
                                    router.push(url);
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
            })}
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
