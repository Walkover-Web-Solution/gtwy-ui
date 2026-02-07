"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, PlusIcon, Settings, Bot, X, CircleArrowOutUpRight } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { usePathname } from "next/navigation";
import {
  BRIDGE_TYPES,
  useAgentLookup,
  normalizeConnectedRefs,
  shallowEqual,
  AgentSidebar,
  FlowControlPanel,
  AgentConfigSidebar,
} from "@/components/FlowDataManager";
import { closeModal, getFromCookies, openModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import CreateBridgeCards from "./CreateBridgeCards";
import { useDispatch } from "react-redux";
import FunctionParameterModal from "./configuration/configurationComponent/FunctionParameterModal";
import { flushSync } from "react-dom";
import DeleteModal from "./UI/DeleteModal";
import Protected from "./Protected";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { updateBridgeAction, updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { toast } from "react-toastify";
import { isEqual } from "lodash";

/* ========================= Helpers ========================= */
function hydrateNodes(rawNodes, ctx) {
  const {
    handleFlowChange,
    openSidebar,
    selectAgentForNode,
    handleBridgeTypeSelect,
    selectedBridgeType,
    hasMasterAgent,
    agents,
    onOpenConfigSidebar,
    openAgentVariableModal,
    requestDelete,
  } = ctx;

  return (rawNodes || [])?.map((node) => {
    const common = {
      onFlowChange: handleFlowChange,
      openSidebar,
      onSelectAgent: selectAgentForNode,
      agents,
      onOpenConfigSidebar,
      openAgentVariableModal,
      onRequestDelete: requestDelete,
    };
    const extra =
      node.type === "bridgeNode"
        ? {
            onBridgeTypeSelect: handleBridgeTypeSelect,
            bridgeType: node?.data?.bridgeType ?? selectedBridgeType,
            hasMasterAgent,
          }
        : {};
    return { ...node, data: { ...(node.data || {}), ...common, ...extra } };
  });
}

/* ========================= Nodes ========================= */
function BridgeNode({ data }) {
  const handleBridgeClick = () => {
    const hasAgentNodes = (data?.nodes || []).some((n) => n.type === "agentNode");
    if (!data?.bridgeType || !hasAgentNodes || !data?.hasMasterAgent) {
      data.openSidebar?.({
        mode: "add",
        sourceNodeId: "bridge-node-root",
        isFirstAgent: true,
        title: "Select Master Agent",
        bridgeType: data?.bridgeType || "",
      });
      return;
    }

    // Otherwise behave as before
    const hasMaster = data.hasMasterAgent;
    if (!hasMaster) {
      data.openSidebar?.({
        mode: "add",
        sourceNodeId: "bridge-node-root",
        isFirstAgent: true,
        title: "Select Master Agent",
        bridgeType: data.bridgeType,
      });
    } else {
      openModal(MODAL_TYPE.BRIDGE_TYPE_MODAL);
    }
  };

  const bridgeConfig = BRIDGE_TYPES[data?.bridgeType];
  const Icon = bridgeConfig?.icon || Plus;

  return (
    <div className="flex flex-col items-center">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-transparent !border-0 !w-4 !h-4"
        style={{ top: "50%", transform: "translateY(-50%)" }}
      />

      <button
        id="bridge-node-button"
        onClick={handleBridgeClick}
        className={`text-white rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform nodrag relative overflow-hidden ${
          bridgeConfig
            ? `bg-gradient-to-r ${bridgeConfig.color} hover:opacity-90`
            : "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700"
        }`}
        title={
          bridgeConfig
            ? `${bridgeConfig.name} Bridge - Click to ${data?.hasMasterAgent ? "change" : "add agent"}`
            : "Select Bridge Type"
        }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
        <Icon className="w-8 h-8 relative z-10 mb-1" />
        {bridgeConfig && <span className="text-xs font-medium relative z-10">{bridgeConfig.name}</span>}
        {!data?.hasMasterAgent && !bridgeConfig && <span className="text-xs font-medium relative z-10">Start</span>}
      </button>

      <span className="mt-3 text-sm font-medium text-base-content">
        {bridgeConfig ? `${bridgeConfig.name} Bridge` : "Select Bridge Type"}
      </span>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-transparent !border-0 !w-4 !h-4"
        style={{ top: "40%", transform: "translateY(-50%)" }}
      />
    </div>
  );
}

function AgentNode({ id, data }) {
  const pathname = usePathname();
  const orgId = useMemo(() => pathname.split("?")[0].split("/")[2], [pathname]);

  const { allFunction, allAgent } = useCustomSelector((state) => ({
    allFunction: state.bridgeReducer.org?.[orgId]?.functionData || {},
    allAgent: state.bridgeReducer.org?.[orgId]?.orgs || {},
  }));

  const handleAdd = () => data.openSidebar({ mode: "add", sourceNodeId: id, title: "Add next agent" });
  const handleOpenConfig = () => data.onOpenConfigSidebar(id);

  const handleUpdateVariable = () => {
    data.openAgentVariableModal({
      selectedAgent: {
        ...data.selectedAgent,
        variables: { ...(data.selectedAgent?.variables || data.variables) },
        isMasterAgent: data.isFirstAgent,
      },
    });
  };

  const handleDeleteData = useCallback(
    (e) => {
      e?.preventDefault();
      e?.stopPropagation();
      const selectedAgent = data.selectedAgent || { name: "Unknown Agent" };

      if (!data.onRequestDelete) {
        console.error("onRequestDelete function not available");
        return;
      }

      // Call the delete request function
      data.onRequestDelete(id, selectedAgent);
    },
    [id, data.selectedAgent, data.onRequestDelete]
  );

  const functions = useMemo(() => {
    const selected = allAgent?.find((a) => a._id === data.selectedAgent?._id);
    if (!selected?.function_ids || !allFunction) return [];
    return selected.function_ids.map((fid) => allFunction[fid]).filter(Boolean);
  }, [allAgent, data.selectedAgent, allFunction]);

  const isMasterAgent = data.isFirstAgent;

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className="relative flex flex-col items-center group">
        <div className="relative flex items-center justify-center">
          {/* Enhanced Delete Button - Only show for non-master agents */}
          {!isMasterAgent && (
            <button
              id={`agent-delete-button-${id}`}
              onClick={handleDeleteData}
              className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white shadow-xl hover:shadow-2xl hover:shadow-red-500/50 opacity-0 group-hover:opacity-100 transition-all duration-300 z-40 flex items-center justify-center border-2 border-white/20 hover:border-white/40 backdrop-blur-sm overflow-hidden"
              title="Delete Agent"
            >
              <X
                className="w-4 h-4 relative z-10 drop-shadow-sm transition-transform duration-200 hover:rotate-90"
                strokeWidth={2.5}
              />
            </button>
          )}

          <div
            className={`relative border-2 rounded-full shadow-xl hover:shadow-2xl p-6 z-20 transition-all duration-300 group-hover:shadow-blue-100 cursor-pointer ${
              isMasterAgent
                ? "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-400 hover:border-amber-500"
                : "bg-gradient-to-br from-white to-slate-50 border-slate-300 hover:border-blue-400"
            }`}
            onClick={handleUpdateVariable}
          >
            <Handle
              type="target"
              position={Position.Left}
              className="!w-4 !h-8 !bg-white !border-2 !border-gray-400 !z-[-1] -ml-5"
              style={{ top: "50%", transform: "translateY(-50%)", borderRadius: "9999px 0 0 9999px" }}
            />

            <div className="flex items-center justify-center">
              <div
                className={`text-base-primary rounded-full p-4 shadow-inner relative ${
                  isMasterAgent
                    ? "bg-gradient-to-br from-amber-100 to-amber-200"
                    : "bg-gradient-to-br from-primary/50 to-primary/70"
                }`}
              >
                <div className="flex items-center justify-center">
                  <span
                    className={`text-base-100 text-xs font-bold group-hover:hidden ${isMasterAgent ? "uppercase" : ""}`}
                  >
                    {data?.selectedAgent?.name?.substring(0, 2)?.toUpperCase() || (
                      <Bot className="w-8 h-8 text-base-100" />
                    )}
                  </span>
                  <Settings className="w-6 h-6 text-base-100 hidden group-hover:block transition-all duration-200" />
                </div>
              </div>
            </div>

            {/* Add Next Step Button */}
            <button
              id={`agent-add-next-button-${id}`}
              onClick={(e) => {
                e.stopPropagation();
                handleAdd();
              }}
              className="hidden absolute top-1/2 -translate-y-1/2 -right-5 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl hover:shadow-2xl hover:from-emerald-600 hover:to-emerald-700 place-items-center hover:transition-transform group-hover:block group-hover:rotate-90 group-hover:transition-transform group-hover:duration-200 group-hover:delay-100"
              title="Add next step"
            >
              <PlusIcon className="w-4 h-4" />
            </button>

            <Handle
              type="source"
              position={Position.Right}
              className="!w-4 !h-8 !bg-white !border-2 !border-gray-400 !z-[-1] -mr-5"
              style={{ top: "50%", transform: "translateY(-50%)", borderRadius: "0 9999px 9999px 0" }}
            />
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div
              className={`px-4 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold cursor-pointer transition-all duration-300 rounded-xl shadow-sm hover:shadow-md border ${
                isMasterAgent
                  ? "text-amber-800 hover:text-amber-900 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 hover:border-amber-300"
                  : "text-base-content hover:text-base-content "
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenConfig();
              }}
            >
              {isMasterAgent && <span className="text-xs font-bold text-amber-600 mr-1">[MASTER]</span>}
              <div className="tooltip tooltip-bottom" data-tip={data.selectedAgent?.name ?? "Click to select"}>
                {data.selectedAgent?.name?.substring(0, 15) ?? "Click to select"}
                {data.selectedAgent?.name?.length > 20 && <span className="ml-1 text-xs font-light">...</span>}
              </div>
              <div className="tooltip tooltip-right" data-tip="Configure Agent">
                <CircleArrowOutUpRight className="text-base-content" size={16} />
              </div>
            </div>
          </div>

          {functions.length > 0 && (
            <div className="inline-flex items-center mt-2 px-2 py-1 text-xs font-medium bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 rounded-full border border-orange-300 shadow-sm">
              <Settings className="w-3 h-3 mr-1" />
              {functions.length} function{functions.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { bridgeNode: BridgeNode, agentNode: AgentNode };

/* ========================= Edges ========================= */
function MakeStyleEdge(props) {
  const { sourceX, sourceY, targetX, targetY, selected, style = {} } = props;

  const xDistance = Math.abs(sourceX - targetX);
  const controlPointX1 = sourceX + xDistance * 0.5;
  const controlPointX2 = targetX - xDistance * 0.5;

  const edgePath = `M${sourceX},${sourceY} C ${controlPointX1},${sourceY} ${controlPointX2},${targetY} ${targetX},${targetY}`;
  const isActive = style.animated || selected;

  return (
    <g>
      <path
        d={edgePath}
        fill="none"
        stroke="#10b981"
        strokeWidth="3"
        strokeDasharray="8 6"
        strokeLinecap="round"
        opacity={isActive ? 0.9 : 0.7}
        className="transition-opacity duration-300"
      >
        <animate attributeName="stroke-dashoffset" values="0;-14;0" dur="2s" repeatCount="indefinite" />
      </path>

      <circle cx={sourceX} cy={sourceY} r="4" fill="#10b981" opacity="0.3" className="animate-pulse" />
      <circle
        cx={targetX}
        cy={targetY}
        r="4"
        fill="#10b981"
        opacity="0.3"
        className="animate-pulse"
        style={{ animationDelay: "1s" }}
      />
    </g>
  );
}

const edgeTypes = { default: MakeStyleEdge, smoothstep: MakeStyleEdge, step: MakeStyleEdge, fancy: MakeStyleEdge };
const defaultEdgeOptions = { type: "default", style: { animated: true } };

/* ========================= Flow ======================== */
function Flow({
  params,
  orchestralData,
  name,
  description,
  createdFlow,
  setIsLoading,
  searchParams,
  isDrafted,
  isEmbedUser,
  mode = "orchestral",
  onConnectedFlowSave,
}) {
  const isConnectedMode = mode === "connected";
  const dispatch = useDispatch();
  const initialEdges = useMemo(() => orchestralData?.edges ?? [], [orchestralData]);
  const initialNodes = useMemo(() => {
    const seed = orchestralData?.nodes ?? (Array.isArray(orchestralData) ? orchestralData : []) ?? [];
    return seed.map((node) => ({ ...node, data: { ...(node.data || {}), onFlowChange: null, openSidebar: null } }));
  }, [orchestralData]);

  const [edges, setEdges] = useState(initialEdges);
  const [nodes, setNodes] = useState(initialNodes);

  // Keep stable refs for debounced save
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => void (nodesRef.current = nodes), [nodes]);
  useEffect(() => void (edgesRef.current = edges), [edges]);
  const [shouldLayout, setShouldLayout] = useState(false);
  const [masterAgent, setMasterAgent] = useState(null);
  const [isVariableModified, setIsVariableModified] = useState(false);
  const [isFlowReady, setIsFlowReady] = useState(false);
  const { agents } = useCustomSelector((state) => ({ agents: state.bridgeReducer.org[params.org_id]?.orgs || [] }));
  const [configSidebar, setConfigSidebar] = useState({ isOpen: false, nodeId: null, agent: null });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [toolData, setToolData] = useState(null);
  const [variablesPath, setVariablesPath] = useState({});
  const [currentVariable, setCurrentVariable] = useState({});
  const [selectedBridgeType, setSelectedBridgeType] = useState(() => {
    const bridgeNode =
      (orchestralData?.nodes || []).find?.((n) => n.type === "bridgeNode") ||
      (Array.isArray(orchestralData) ? orchestralData.find((n) => n.type === "bridgeNode") : null);
    return bridgeNode?.data?.bridgeType || "";
  });

  const [pendingDelete, setPendingDelete] = useState(null);
  const { isDeleting, executeDelete } = useDeleteOperation();

  const openConfigSidebar = useCallback(
    (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      const agent = agents.find((a) => a._id === (node?.data?.selectedAgent?.bridgeData?._id || nodeId));
      setConfigSidebar({ isOpen: true, nodeId, agent });
      setTimeout(() => {
        window.openGtwy({ agent_id: agent?._id });
      }, 1000);
    },
    [nodes, agents, selectedAgent]
  );

  const requestDelete = useCallback(
    (nodeId, selectedAgent) => {
      // Check if this is a master agent (first agent in the flow)
      const nodeToDelete = nodes.find((n) => n.id === nodeId);
      const isMasterAgent = nodeToDelete?.data?.isFirstAgent;

      if (isMasterAgent) {
        // Prevent deletion of master agent - show error message instead
        console.warn("Cannot delete master agent");
        // You could show a toast notification here if available
        alert("Cannot remove the master agent. The master agent is required for the orchestral flow to function.");
        return;
      }

      // Only allow deletion of non-master agents
      setPendingDelete({ id: nodeId, selectedAgent });

      // Small delay to ensure state is set before opening modal
      setTimeout(() => {
        openModal(MODAL_TYPE.ORCHESTRAL_DELETE_MODAL);
      }, 0);
    },
    [nodes]
  );
  const createFanoutSubgraphRef = useRef();

  // Simple function to update bridge data in state only
  const updateBridgeDataInState = useCallback(
    (nodeId, nodeData, freshNodes = null, freshEdges = null) => {
      if (!isConnectedMode || !nodeData?.selectedAgent) return;

      const agent = nodeData.selectedAgent;
      const bridgeId = agent._id || agent.bridge_id;

      if (!bridgeId) {
        console.warn(`[updateBridgeDataInState] No bridge ID found for node ${nodeId}:`, agent);
        return;
      }
      // Use fresh data if provided, otherwise fall back to current state
      const currentNodes = freshNodes || nodes;
      const currentEdges = freshEdges || edges;

      // Prepare connected agents data
      const connectedAgentsData = {};

      // Find child agents for this node
      const childEdges = currentEdges.filter((edge) => edge.source === nodeId);
      if (childEdges.length > 0) {
        childEdges.forEach((edge, index) => {
          const childNode = currentNodes.find((n) => n.id === edge.target);
          if (childNode?.data?.selectedAgent) {
            const childAgent = childNode.data.selectedAgent;
            const childName = childAgent.name || childAgent.agent_name || "Unknown Agent";
            connectedAgentsData[childName] = {
              bridge_id: childAgent._id || childAgent.bridge_id,
              thread_id: childAgent.thread_id || false,
            };
          }
        });
      }

      // Just update the local state - no API calls
      // You can add state update logic here if needed
    },
    [isConnectedMode, nodes, edges]
  );

  // Function to update bridge with source and agent data (handles both addition and deletion)
  const updateBridgeWithSourceData = useCallback(
    async (sourceNodeId, agentData, sourceData, isDeleting = false) => {
      if (!isConnectedMode) return;

      try {
        // Get the source agent details
        const sourceAgent = sourceData?.selectedAgent;
        if (!sourceAgent) {
          console.warn(`[updateBridgeWithSourceData] No source agent found for node ${sourceNodeId}`);
          return;
        }

        const sourceBridgeId = sourceAgent._id || sourceAgent.bridge_id;
        if (!sourceBridgeId) {
          console.warn(`[updateBridgeWithSourceData] No bridge ID found for source agent:`, sourceAgent);
          return;
        }

        // Prepare the connected agents data with enhanced processing
        const connectedAgentsData = {};
        const agentName = agentData.name || agentData.agent_name || "Unknown Agent";

        // Process main agent data
        // Check if this agent is being connected to the master agent (bridge-node-root or master agent)
        const isConnectingToMaster = sourceNodeId === "bridge-node-root" || sourceData?.isFirstAgent;

        connectedAgentsData[agentName] = {
          bridge_id: agentData._id || agentData.bridge_id,
          thread_id: agentData.thread_id || false,
          version_id:
            agentData?.bridgeData?.published_version_id || agentData.published_version_id || agentData?.versions?.[0],
        };

        // Process nested connected agents if they exist
        if (agentData.connected_agents && agentData.connected_agents.length > 0) {
          agentData.connected_agents.forEach((connectedAgent) => {
            const connectedAgentName =
              connectedAgent.name || connectedAgent.agent_name || `Agent_${connectedAgent._id}`;
            connectedAgentsData[connectedAgentName] = {
              bridge_id: connectedAgent._id || connectedAgent.bridge_id,
              thread_id: connectedAgent.thread_id || false,
              version_id: connectedAgent.published_version_id || connectedAgent?.versions?.[0],
            };

            // Process deeply nested connections recursively
            if (connectedAgent.connected_agents && connectedAgent.connected_agents.length > 0) {
              const processNestedAgents = (nestedAgents, depth = 0) => {
                if (depth > 3) return; // Prevent infinite recursion
                nestedAgents.forEach((nestedAgent) => {
                  const nestedAgentName = nestedAgent.name || nestedAgent.agent_name || `Agent_${nestedAgent._id}`;
                  connectedAgentsData[nestedAgentName] = {
                    bridge_id: nestedAgent._id || nestedAgent.bridge_id,
                    thread_id: nestedAgent.thread_id || false,
                    version_id: nestedAgent.published_version_id || nestedAgent?.versions?.[0],
                  };
                  if (nestedAgent.connected_agents) {
                    processNestedAgents(nestedAgent.connected_agents, depth + 1);
                  }
                });
              };
              processNestedAgents(connectedAgent.connected_agents);
            }
          });
        }

        // Prepare the update payload
        const updatePayload = {
          agents: {
            connected_agents: connectedAgentsData,
          },
        };

        // Only add agent_status when adding, not when removing
        if (!isDeleting) {
          updatePayload.agents.agent_status = "1";
        }

        // Use the actual version ID if available, otherwise use bridge ID
        const versionId = isConnectingToMaster
          ? searchParams?.version
          : sourceAgent?.bridgeData?.published_version_id ||
            sourceAgent?.bridgeData?.versions?.[0] ||
            sourceAgent?.bridgeData?.version_id ||
            sourceBridgeId;

        await dispatch(
          updateBridgeVersionAction({
            versionId,
            dataToSend: updatePayload,
          })
        );
      } catch (error) {
        console.error(
          `[updateBridgeWithSourceData] Error ${isDeleting ? "removing connection from" : "updating"} bridge for source node ${sourceNodeId}:`,
          error
        );
      }
    },
    [isConnectedMode, dispatch]
  );

  const openAgentVariableModal = useCallback(
    (payload) => {
      const sel = payload?.selectedAgent?.bridgeData;
      if (!sel?._id) return;
      const agent = agents.find((a) => a._id === sel._id);
      const base = {
        name: sel?.name || "",
        description: agent?.connected_agent_details?.description || "",
        fields: agent?.connected_agent_details?.agent_variables?.fields || {},
        required_params: agent?.connected_agent_details?.agent_variables?.required_params || [],
      };

      setNodes((currentNodes) => {
        setEdges((currentEdges) => {
          const currentNode = currentNodes.find((node) => node.data?.selectedAgent?._id === sel._id);
          const incomingEdge = currentNode ? currentEdges.find((edge) => edge.target === currentNode.id) : null;
          const parentNode = incomingEdge ? currentNodes.find((node) => node.id === incomingEdge.source) : null;

          const parentVariablesPath = parentNode?.data?.selectedAgent?.variables_path || {};
          flushSync(() => {
            setCurrentVariable(base);
            setSelectedAgent(sel);
            setToolData({
              ...base,
              thread_id: sel?.variables?.thread_id || !!sel?.thread_id,
              version_id: sel?.published_version_id || !!sel?.version_id,
            });
            setVariablesPath({ ...(parentVariablesPath[sel._id] || parentVariablesPath || {}) });
          });
          openModal(MODAL_TYPE.ORCHESTRAL_AGENT_PARAMETER_MODAL);
          return currentEdges;
        });
        return currentNodes;
      });
    },
    [agents, toolData, selectedAgent, variablesPath, currentVariable]
  );

  const closeConfigSidebar = useCallback(() => setConfigSidebar({ isOpen: false, nodeId: null, agent: null }), []);

  const handleSaveAgentParameters = useCallback(() => {
    const nodeToUpdate = nodes.find(
      (node) =>
        (node.type === "agentNode" && node.data?.selectedAgent?._id === selectedAgent?._id) ||
        node?.data?.selectedAgent?._id === selectedAgent?.published_version_id
    );
    if (!nodeToUpdate) return;

    const incomingEdge = edges.find((edge) => edge.target === nodeToUpdate.id);
    const parentNode = incomingEdge ? nodes.find((node) => node.id === incomingEdge.source) : null;

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id === nodeToUpdate.id) {
          return {
            ...node,
            data: {
              ...node.data,
              selectedAgent: {
                ...node.data.selectedAgent,
                description: toolData?.description,
                variables: toolData,
                thread_id: toolData?.thread_id ? toolData?.thread_id : false,
                variables_path: variablesPath || {},
              },
            },
          };
        }

        if (parentNode && node.id === parentNode.id && selectedAgent?._id) {
          const currentVariablesPath = node.data?.selectedAgent?.variables_path || {};
          return {
            ...node,
            data: {
              ...node.data,
              selectedAgent: {
                ...node.data.selectedAgent,
                variables_path: {
                  ...currentVariablesPath,
                  [selectedAgent._id]: variablesPath || {},
                },
              },
            },
          };
        }

        return node;
      })
    );
    try {
      const dataToSend = {
        agents: {
          connected_agents: {
            [selectedAgent?.name]: {
              bridge_id: selectedAgent?._id || selectedAgent?.bridge_id,
              thread_id: toolData?.thread_id ? toolData?.thread_id : false,
            },
          },
          agent_status: "1",
        },
      };
      if (toolData?.version_id) {
        dataToSend.agents.connected_agents[selectedAgent?.name].version_id = toolData?.version_id;
      }
      // on Save the bridge and thread id in version only
      // Use the source agent's (parent node's) published_version_id instead of selected agent's
      const sourceAgentVersionId =
        parentNode?.data?.selectedAgent?.bridgeData?.published_version_id ||
        searchParams?.version ||
        parentNode?.data?.selectedAgent?.bridgeData?.versions?.[0];
      dispatch(
        updateBridgeVersionAction({
          bridgeId: selectedAgent?._id || selectedAgent?.bridge_id,
          versionId: sourceAgentVersionId,
          dataToSend,
        })
      );
      dispatch(
        updateBridgeAction({
          bridgeId: selectedAgent?._id || selectedAgent?.bridge_id,
          dataToSend: {
            connected_agent_details: {
              agent_variables: {
                fields: toolData?.fields,
                required_params: toolData?.required_params,
              },
              description: toolData?.description
                ? toolData?.description
                : selectedAgent?.connected_agent_details?.description,
            },
          },
        })
      );
      if (!isEqual(variablesPath, variablesPath[selectedAgent?._id || selectedAgent?.bridge_id])) {
        dispatch(
          updateBridgeVersionAction({
            bridgeId: params.id,
            versionId:
              selectedAgent?.published_version_id ||
              selectedAgent?.version_id ||
              selectedAgent?._id ||
              selectedAgent?.bridge_id,
            dataToSend: { variables_path: { [selectedAgent?._id || selectedAgent?.bridge_id]: variablesPath } },
          })
        );
      }
      closeModal(MODAL_TYPE?.ORCHESTRAL_AGENT_PARAMETER_MODAL);
      setCurrentVariable(null);
      setSelectedAgent(null);
      setToolData([]);
      setVariablesPath([]);
      setCurrentVariable([]);
    } catch (error) {
      toast?.error("Failed to save agent");
      console.error(error);
    }
    setIsVariableModified(true);

    // Always set status to 'draft' when flow is modified (nodes/edges change)
    if (orchestralData) {
      orchestralData.status = "draft";
    }
  }, [nodes, edges, selectedAgent, variablesPath, toolData]);

  const [sidebar, setSidebar] = useState({
    isOpen: false,
    mode: null,
    title: "",
    sourceNodeId: null,
    isFirstAgent: false,
    nodeId: null,
    bridgeType: null,
  });
  const [lastSidebarContext, setLastSidebarContext] = useState(null);

  const openSidebar = useCallback((ctx) => {
    const newSidebarState = { ...ctx, isOpen: true };
    setSidebar((s) => ({ ...s, ...newSidebarState }));
    setLastSidebarContext(newSidebarState);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebar({
      isOpen: false,
      mode: null,
      title: "",
      sourceNodeId: null,
      isFirstAgent: false,
      nodeId: null,
      bridgeType: null,
    });
  }, []);

  const { resolve: resolveAgent } = useAgentLookup(agents);

  // Centralized validation function for bridge connections
  const validateBridgeConnection = useCallback((sourceId, targetId, currentEdges) => {
    const bridgeNodeId = "bridge-node-root";

    // Check if trying to connect to/from bridge node
    if (sourceId === bridgeNodeId || targetId === bridgeNodeId) {
      // Check if bridge node already has connections
      const existingConnections = currentEdges.filter(
        (edge) => edge.source === bridgeNodeId || edge.target === bridgeNodeId
      );
      if (existingConnections.length > 0) {
        alert("Cannot connect more than one agent to the bridge node");
        return false;
      }
    }
    return true;
  }, []);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback(
    (params) => {
      // Validate bridge connection before allowing
      if (!validateBridgeConnection(params.source, params.target, edges)) {
        return;
      }

      // Allow the connection if validation passes
      setEdges((eds) => addEdge({ ...params, type: "smoothstep", data: {} }, eds));
    },
    [edges, validateBridgeConnection]
  );

  /* Initial hydration (once) */
  useEffect(() => {
    setNodes((current) =>
      hydrateNodes(current, {
        handleFlowChange,
        openSidebar,
        selectAgentForNode,
        handleBridgeTypeSelect,
        selectedBridgeType,
        hasMasterAgent: current.some((n) => n.type === "agentNode" && n.data?.isFirstAgent),
        agents,
        onOpenConfigSidebar: openConfigSidebar,
        openAgentVariableModal,
        requestDelete,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load/replace flow runtime */
  useEffect(() => {
    const dataSource = orchestralData?.data || orchestralData;
    const nodesToLoad = dataSource?.nodes || [];
    const edgesToLoad = dataSource?.edges || [];

    if (nodesToLoad.length > 0 || edgesToLoad.length > 0) {
      setNodes(() =>
        hydrateNodes(nodesToLoad, {
          handleFlowChange,
          openSidebar,
          selectAgentForNode,
          handleBridgeTypeSelect,
          selectedBridgeType,
          hasMasterAgent: nodesToLoad.some((n) => n.type === "agentNode" && n.data?.isFirstAgent),
          agents,
          onOpenConfigSidebar: openConfigSidebar,
          openAgentVariableModal,
          requestDelete,
        })
      );
      // Filter edges to ensure only one bridge connection is loaded
      const bridgeNodeId = "bridge-node-root";
      const bridgeEdges = edgesToLoad.filter((edge) => edge.source === bridgeNodeId || edge.target === bridgeNodeId);
      const otherEdges = edgesToLoad.filter((edge) => edge.source !== bridgeNodeId && edge.target !== bridgeNodeId);

      // Only keep the first bridge connection if multiple exist
      const validEdges = bridgeEdges.length > 1 ? [bridgeEdges[0], ...otherEdges] : edgesToLoad;

      if (bridgeEdges.length > 1) {
        console.warn(`Found ${bridgeEdges.length} bridge connections in saved data. Only keeping the first one.`);
      }

      setEdges(validEdges);
      setShouldLayout(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchestralData]);

  const selectAgentForNode = useCallback((nodeId, agent) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          // Preserve existing agent data when changing agent
          const existingAgentData = n.data?.selectedAgent || {};
          const updatedAgent = {
            ...agent,
            // Preserve important existing data
            variables: existingAgentData.variables || agent.variables || {},
            variables_path: existingAgentData.variables_path || {},
            thread_id: existingAgentData.thread_id || agent.thread_id || false,
            description: existingAgentData.description || agent.description || "",
          };

          return {
            ...n,
            data: {
              ...n.data,
              selectedAgent: updatedAgent,
            },
          };
        }
        return n;
      })
    );

    // No auto-save needed
  }, []);

  const handleBridgeTypeSelect = useCallback(
    (bridgeType) => {
      setSelectedBridgeType(bridgeType);
      setNodes((nds) => nds.map((n) => (n.type === "bridgeNode" ? { ...n, data: { ...n.data, bridgeType } } : n)));
      closeModal(MODAL_TYPE.BRIDGE_TYPE_MODAL);

      const hasMaster = nodes.some((n) => n.type === "agentNode" && n.data?.isFirstAgent);
      if (!hasMaster) {
        const bridgeNode = nodes.find((n) => n.type === "bridgeNode");
        const bridgeNodeId = bridgeNode ? bridgeNode.id : "bridge-node-root";
        openSidebar({
          mode: "add",
          sourceNodeId: bridgeNodeId,
          isFirstAgent: true,
          title: "Select Master Agent",
          bridgeType,
        });
      }
    },
    [nodes, openSidebar]
  );

  /* Ensure one bridge node baseline */
  useEffect(() => {
    if (nodes.length === 0 && Object.keys(agents).length > 0) {
      setNodes([
        {
          id: "bridge-node-root",
          type: "bridgeNode",
          position: { x: 100, y: 300 },
          data: {
            onFlowChange: handleFlowChange,
            agents,
            openSidebar,
            onBridgeTypeSelect: handleBridgeTypeSelect,
            bridgeType: selectedBridgeType,
            hasMasterAgent: false,
          },
        },
      ]);
      // Trigger layout after adding the initial node
      setTimeout(() => {
        setShouldLayout(true);
        setIsFlowReady(true);
      }, 100);
    }
  }, [agents, selectedBridgeType]);

  /* Set flow ready when nodes are loaded */
  useEffect(() => {
    if (nodes.length > 0 && !isFlowReady) {
      setTimeout(() => setIsFlowReady(true), 200);
    }
  }, [nodes.length, isFlowReady]);

  /* Keep node data fresh */
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const common = { agents, openSidebar };
        const extra =
          node.type === "bridgeNode"
            ? { onBridgeTypeSelect: handleBridgeTypeSelect, bridgeType: selectedBridgeType, masterAgent }
            : {};
        const nextData = { ...node.data, ...common, ...extra };
        if (shallowEqual(node.data, nextData)) return node;
        return { ...node, data: nextData };
      })
    );
  }, [agents, selectedBridgeType, masterAgent]);

  /* Mark last nodes by edges */
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type !== "agentNode") return n;
        const hasOutgoing = edges.some((e) => e.source === n.id);
        const isLast = !hasOutgoing;
        if (n.data?.isLast === isLast) return n;
        return { ...n, data: { ...n.data, isLast } };
      })
    );
  }, [edges]);

  /* Auto layout */
  const applyAutoLayout = useCallback(() => {
    const HORIZONTAL_SPACING = 280;
    const VERTICAL_SPACING = 200;
    const BASE_Y = 400;

    const bridgeNode = nodes.find((n) => n.type === "bridgeNode");
    if (!bridgeNode || nodes.length <= 1) return;

    const getLayoutedNodes = (nodesToLayout, edgesToLayout) => {
      const graph = new Map(nodesToLayout.map((n) => [n.id, []]));
      edgesToLayout.forEach((e) => {
        if (graph.has(e.source)) graph.get(e.source).push(e.target);
      });

      const nodeLevels = new Map();
      const nodeOrder = new Map();
      const queue = [[bridgeNode.id, 0]];
      const visited = new Set([bridgeNode.id]);
      nodeLevels.set(bridgeNode.id, 0);
      nodeOrder.set(bridgeNode.id, 0);

      const levelCounts = new Map([[0, 1]]);

      while (queue.length > 0) {
        const [currId, level] = queue.shift();
        const children = graph.get(currId) || [];
        children.forEach((childId) => {
          if (!visited.has(childId)) {
            visited.add(childId);
            const childLevel = level + 1;
            const currentLevelCount = levelCounts.get(childLevel) || 0;
            nodeLevels.set(childId, childLevel);
            nodeOrder.set(childId, currentLevelCount);
            levelCounts.set(childLevel, currentLevelCount + 1);
            queue.push([childId, childLevel]);
          }
        });
      }

      const newNodes = [];
      nodesToLayout.forEach((node) => {
        const level = nodeLevels.get(node.id);
        const order = nodeOrder.get(node.id);
        const levelNodeCount = levelCounts.get(level) || 1;

        if (level !== undefined && order !== undefined) {
          const x = level * HORIZONTAL_SPACING + 80;
          let y;
          if (levelNodeCount === 1) {
            y = BASE_Y;
          } else {
            const total = (levelNodeCount - 1) * VERTICAL_SPACING;
            const startY = BASE_Y - total / 2;
            y = startY + order * VERTICAL_SPACING;
          }
          newNodes.push({ ...node, position: { x, y }, style: { ...node.style } });
        }
      });
      return newNodes;
    };

    setNodes(getLayoutedNodes(nodes, edges));
  }, [nodes, edges]);

  useEffect(() => {
    if (shouldLayout && nodes.length > 1) {
      const t = setTimeout(() => {
        applyAutoLayout();
        setShouldLayout(false);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [shouldLayout, applyAutoLayout, nodes.length]);

  const handleFlowChange = useCallback(
    (change) => {
      const { action, payload } = change;

      if (action === "ADD_NODE") {
        const { sourceNodeId, agent, isFirstAgent } = payload;

        // Enhanced connected agent processing with published version IDs
        const processConnectedAgents = (connectedAgents) => {
          return normalizeConnectedRefs(connectedAgents).map((ref) => {
            const connectedAgent = agents.find((a) => a._id === ref || a.name === ref);
            if (connectedAgent) {
              return {
                ...ref,
                _id: connectedAgent._id,
                name: connectedAgent.name,
                published_version_id: connectedAgent.published_version_id || connectedAgent.versions?.[0],
                bridge_id: connectedAgent._id,
                // Include nested connected agents if they exist
                connected_agents: connectedAgent.connected_agents
                  ? processConnectedAgents(connectedAgent.connected_agents)
                  : [],
              };
            }
            return ref;
          });
        };

        const enhancedAgent = {
          ...agent,
          connected_agents: agent.connected_agents ? processConnectedAgents(agent.connected_agents) : [],
        };

        const childrenRefs = normalizeConnectedRefs(enhancedAgent.connected_agents);
        const nodeId = agent._id || agent.id || agent.bridge_id || agent.name;

        // Call the update bridge function with enhanced agent data
        if (isConnectedMode) {
          const sourceNode = nodes.find((n) => n.id === sourceNodeId);
          if (sourceNode?.data) {
            updateBridgeWithSourceData(sourceNodeId, enhancedAgent, sourceNode.data);
          }
        }

        if (childrenRefs.length > 0) {
          // Process and add all connected agents with their internal connections
          createFanoutSubgraphRef.current?.(sourceNodeId, enhancedAgent, childrenRefs, isFirstAgent, new Set());

          // Update internal connections for nested connected agents
          setTimeout(() => {
            childrenRefs.forEach((childRef) => {
              const childAgent = agents.find((a) => a._id === childRef || a.name === childRef);
              if (childAgent?.connected_agents && childAgent.connected_agents.length > 0) {
                const childNodeId = childAgent._id || childAgent.name;
                const childNode = nodes.find((n) => n.id === childNodeId);
                if (childNode?.data && isConnectedMode) {
                  const processedChildAgent = {
                    ...childAgent,
                    connected_agents: processConnectedAgents(childAgent.connected_agents),
                  };
                  updateBridgeWithSourceData(childNodeId, processedChildAgent, childNode.data);
                }
              }
            });
          }, 200);
        } else {
          const newNodeId = nodeId;
          if (isFirstAgent) {
            setMasterAgent(agent);
          }
          let updatedNodes = null;
          let updatedEdges = null;

          setNodes((currentNodes) => {
            const sourceNode = currentNodes.find((n) => n.id === sourceNodeId);
            if (!sourceNode) {
              return currentNodes;
            }

            const sourcePosition = sourceNode.position;
            const newPosition = isFirstAgent
              ? { x: sourcePosition.x + 280, y: sourcePosition.y }
              : { x: sourcePosition.x + 250, y: sourcePosition.y };
            const newNode = {
              id: newNodeId,
              type: "agentNode",
              position: newPosition,
              data: {
                onFlowChange: handleFlowChange,
                onSelectAgent: selectAgentForNode,
                selectedAgent: agent,
                isFirstAgent: !!isFirstAgent,
                openSidebar,
                isLast: true,
                onOpenConfigSidebar: openConfigSidebar,
                openAgentVariableModal,
                onRequestDelete: requestDelete,
              },
              style: {},
            };

            updatedNodes = [...currentNodes, newNode];
            return updatedNodes;
          });

          setEdges((currentEdges) => {
            if (!validateBridgeConnection(sourceNodeId, newNodeId, currentEdges)) {
              return currentEdges;
            }

            const newEdge = {
              id: `e-${sourceNodeId}-${newNodeId}`,
              source: sourceNodeId,
              target: newNodeId,
              type: "smoothstep",
              data: {},
            };
            updatedEdges = addEdge(newEdge, currentEdges);
            return updatedEdges;
          });

          // Just update state for connected mode
          if (isConnectedMode && updatedNodes && updatedEdges) {
            const sourceNodeData = updatedNodes.find((n) => n.id === sourceNodeId);
            if (sourceNodeData?.data?.selectedAgent) {
              updateBridgeDataInState(sourceNodeId, sourceNodeData.data, updatedNodes, updatedEdges);
            }
          }
          setTimeout(() => setShouldLayout(true), 100);
        }
      }

      if (action === "UPDATE_NODE") {
        const { nodeId, updatedAgent } = payload;
        let freshNodes = null;
        setNodes((currentNodes) => {
          const updatedNodes = currentNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    selectedAgent: { ...node.data.selectedAgent, ...updatedAgent },
                  },
                }
              : node
          );

          freshNodes = updatedNodes;
          return updatedNodes;
        });

        // For connected mode, just update state
        if (isConnectedMode && freshNodes) {
          // Get the updated node from fresh data
          const updatedNode = freshNodes.find((n) => n.id === nodeId);
          if (updatedNode?.data?.selectedAgent) {
            updateBridgeDataInState(nodeId, updatedNode.data, freshNodes, edges);
          } else {
            console.warn(`[UPDATE_NODE] Updated node ${nodeId} not found or has no selected agent`);
          }
        }
      }

      if (action === "DELETE_NODE") {
        const { nodeId } = payload;
        const nodeToDelete = nodes.find((n) => n.id === nodeId);

        if (nodeToDelete?.data?.isFirstAgent) {
          setMasterAgent(null);
        }
        const parentNodes = edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);
        const nodesToDelete = new Set([nodeId]);
        const findChildNodes = (parentId) => {
          edges.forEach((edge) => {
            if (edge.source === parentId && !nodesToDelete.has(edge.target)) {
              nodesToDelete.add(edge.target);
              findChildNodes(edge.target);
            }
          });
        };
        findChildNodes(nodeId);
        let freshNodes = null;
        let freshEdges = null;

        setNodes((nds) => {
          freshNodes = nds.filter((n) => !nodesToDelete.has(n.id));
          return freshNodes;
        });

        setEdges((eds) => {
          freshEdges = eds.filter((e) => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target));
          return freshEdges;
        });

        // Update parent nodes' bridges by removing the deleted agent connection
        if (isConnectedMode && parentNodes.length > 0) {
          parentNodes.forEach((parentNodeId) => {
            // Get parent node data from original nodes (before deletion) since freshNodes won't have it
            const parentNodeData = nodes.find((n) => n.id === parentNodeId);
            if (parentNodeData?.data?.selectedAgent) {
              // Use the same function but with isDeleting=true to remove the connection
              const deletedAgent = nodeToDelete?.data?.selectedAgent;
              if (deletedAgent) {
                updateBridgeWithSourceData(parentNodeId, deletedAgent, parentNodeData.data, true);
              }
            } else {
              console.warn(`[DELETE_NODE] Parent node ${parentNodeId} not found or has no selected agent`);
            }
          });
        }

        setTimeout(() => setShouldLayout(true), 100);
      }
    },
    [nodes, edges, openConfigSidebar, updateBridgeDataInState, updateBridgeWithSourceData, requestDelete]
  );

  const createFanoutSubgraph = useCallback(
    (sourceNodeId, rootAgent, childRefs, isFirstAgent = false, visitedAgents = new Set()) => {
      const rootAgentKey = rootAgent?._id || rootAgent?.bridge_id || rootAgent?.name;
      if (!rootAgentKey || visitedAgents.has(rootAgentKey)) return;

      const newVisitedAgents = new Set(visitedAgents);
      newVisitedAgents.add(rootAgentKey);

      const rootNodeId = rootAgentKey;
      if (isFirstAgent) setMasterAgent(rootAgent);

      let rootPos = isFirstAgent ? { x: 360, y: 400 } : { x: 530, y: 400 };

      setNodes((current) => {
        const sourceNode = current.find((n) => n.id === sourceNodeId);
        if (sourceNode && !isFirstAgent) {
          rootPos = { x: sourceNode.position.x + 250, y: sourceNode.position.y };
        }

        const newRoot = {
          id: rootNodeId,
          type: "agentNode",
          position: rootPos,
          data: {
            onFlowChange: handleFlowChange,
            onSelectAgent: selectAgentForNode,
            agents,
            selectedAgent: {
              ...agents.find?.((bridge) => bridge._id === rootAgentKey),
              description: rootAgent.description,
              thread_id: rootAgent.thread_id,
              variables: rootAgent.variables,
              // Include enhanced connected agent data
              connected_agents: rootAgent.connected_agents || [],
              published_version_id: rootAgent.published_version_id || rootAgent?.versions?.[0],
              bridgeData: agents.find?.((bridge) => bridge._id === rootAgentKey),
            },
            isFirstAgent: !!isFirstAgent,
            openSidebar,
            isLast: true,
            onOpenConfigSidebar: openConfigSidebar,
            openAgentVariableModal,
            onRequestDelete: requestDelete,
          },
          style: {},
        };
        return [...current, newRoot];
      });

      // Validate bridge connection before adding edge
      setEdges((currentEdges) => {
        if (!validateBridgeConnection(sourceNodeId, rootNodeId, currentEdges)) {
          return currentEdges; // Don't add edge if validation fails
        }
        return addEdge(
          {
            id: `e-${sourceNodeId}-${rootNodeId}`,
            source: sourceNodeId,
            target: rootNodeId,
            type: "smoothstep",
            data: {},
          },
          currentEdges
        );
      });

      const unique = new Set();
      const immediateChildren = normalizeConnectedRefs(childRefs)
        .map((ref) => resolveAgent(ref))
        .filter((a) => {
          if (!a) return false;
          const key = a.bridge_id || a.name;
          if (newVisitedAgents.has(key) || unique.has(key)) return false;
          unique.add(key);
          return true;
        });

      if (immediateChildren.length > 0) {
        setNodes((nds) => nds.map((n) => (n.id === rootNodeId ? { ...n, data: { ...n.data, isLast: false } } : n)));

        immediateChildren.forEach((child, i) => {
          const childBridge = {
            ...agents.find?.((bridge) => bridge._id === child.bridge_id),
            description: child.description,
            // Include enhanced connected agent data for child
            connected_agents: child.connected_agents || [],
            published_version_id: child.published_version_id || child?.versions?.[0],
            thread_id: child.thread_id || false,
            variables: child.variables || {},
          };
          const childConnectedRefs = normalizeConnectedRefs(childBridge?.connected_agents || []);

          setTimeout(() => {
            createFanoutSubgraph(rootNodeId, childBridge, childConnectedRefs, false, newVisitedAgents);

            // Update child agent's internal connections if they exist
            if (isConnectedMode && childBridge.connected_agents && childBridge.connected_agents.length > 0) {
              setTimeout(() => {
                const childNodeId = childBridge._id || childBridge.name;
                const childNode = nodes.find((n) => n.id === childNodeId);
                if (childNode?.data) {
                  updateBridgeWithSourceData(childNodeId, childBridge, childNode.data);
                }
              }, 150);
            }
          }, 100 * i);
        });
      }

      setTimeout(() => setShouldLayout(true), 200);
    },
    [agents, openSidebar, resolveAgent, validateBridgeConnection, requestDelete]
  );
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete?.id) {
      console.warn("No pending delete found");
      return;
    }

    await executeDelete(async () => {
      // Delete the node
      handleFlowChange({ action: "DELETE_NODE", payload: { nodeId: pendingDelete.id } });

      // Clear pending delete
      setPendingDelete(null);
    });
  }, [pendingDelete, handleFlowChange, executeDelete, setPendingDelete]);

  const cancelDelete = useCallback(() => {
    setPendingDelete(null);
    closeModal(MODAL_TYPE.DELETE_MODAL);
  }, []);

  useEffect(() => {
    createFanoutSubgraphRef.current = createFanoutSubgraph;
  }, [createFanoutSubgraph]);
  const fitViewOptions = useMemo(
    () => ({
      padding: 0.3,
      duration: 1000,
      includeHiddenNodes: false,
      minZoom: 0.1,
      maxZoom: 1.5,
    }),
    []
  );

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 relative overflow-hidden">
      <FlowControlPanel
        bridgeType={selectedBridgeType}
        mode={mode}
        name={name}
        description={description}
        createdFlow={createdFlow}
        isModified={isDrafted}
        setIsLoading={setIsLoading}
        params={params}
        searchParams={searchParams}
        isVariableModified={isVariableModified}
        isEmbedUser={isEmbedUser}
      />

      <div className="w-full h-full">
        {!isFlowReady && nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
              <p className="text-base-content/60">Loading orchestral flow...</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            key={`flow-${nodes.length}-${edges.length}`}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={true}
            nodesConnectable={false}
            fitView
            fitViewOptions={fitViewOptions}
            colorMode={getFromCookies("theme")}
            className="[&_.react-flow__node]:!transition-none [&_.react-flow__node]:hover:!transition-none [&_.react-flow__node.dragging]:!transition-none [&_.react-flow__node.dragging_*]:!transition-none"
            style={{ width: "100%", height: "100%" }}
          >
            <Controls
              showInteractive={true}
              showZoom={true}
              showFitView={true}
              showLock={false}
              position="bottom-left"
              style={{
                paddingBottom: "120px",
              }}
            />
            <Background variant={BackgroundVariant.Dots} gap={32} size={1.5} color="#e2e8f0" className="opacity-60" />
          </ReactFlow>
        )}
      </div>

      <CreateBridgeCards
        handleBridgeTypeSelection={handleBridgeTypeSelect}
        selectedBridgeTypeCard={selectedBridgeType}
        isModal
      />

      <AgentSidebar
        isOpen={sidebar.isOpen}
        title={sidebar.title}
        agents={agents}
        onClose={closeSidebar}
        onChoose={(agent) => {
          const contextToUse = sidebar.mode ? sidebar : lastSidebarContext;
          if (contextToUse?.mode === "add") {
            handleFlowChange({
              action: "ADD_NODE",
              payload: { sourceNodeId: contextToUse.sourceNodeId, agent, isFirstAgent: contextToUse.isFirstAgent },
            });
          } else if (contextToUse?.mode === "select") {
            selectAgentForNode(contextToUse.nodeId, agent);
          }
          closeSidebar();
        }}
        nodes={nodes}
        params={params}
      />

      <AgentConfigSidebar
        isOpen={configSidebar.isOpen}
        onClose={closeConfigSidebar}
        agent={configSidebar.agent}
        instanceId="agent-configuration-sidebar"
        onAgentUpdate={(agentId, updatedAgent) => {
          handleFlowChange({
            action: "UPDATE_NODE",
            payload: { nodeId: agentId, updatedAgent },
          });
        }}
      />

      <DeleteModal
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        item={pendingDelete?.selectedAgent}
        title="Remove Agent"
        description={`Are you sure you want to remove "${pendingDelete?.selectedAgent?.name || "this agent"}"? It will also remove its child agents. This action cannot be undone.`}
        key={pendingDelete?.selectedAgent?._id || "no-agent"}
        loading={isDeleting}
        isAsync={true}
        modalType={MODAL_TYPE.ORCHESTRAL_DELETE_MODAL}
      />

      <FunctionParameterModal
        key={selectedAgent?._id}
        name="Orchestral Agent"
        Model_Name={MODAL_TYPE.ORCHESTRAL_AGENT_PARAMETER_MODAL}
        function_details={currentVariable || {}}
        functionName={selectedAgent?.name || ""}
        functionId={selectedAgent?._id || ""}
        toolData={toolData || {}}
        setToolData={setToolData || (() => {})}
        variablesPath={variablesPath || []}
        setVariablesPath={setVariablesPath || (() => {})}
        variables_path={{ [selectedAgent?.name || ""]: variablesPath || [] }}
        handleSave={handleSaveAgentParameters || (() => {})}
        isMasterAgent={selectedAgent?.isMasterAgent}
        tool_name={selectedAgent?.name || ""}
      />
    </div>
  );
}

/* ========================= Wrapper ========================= */
const AgentToAgentConnection = ({
  params,
  searchParams,
  orchestralData = [],
  name,
  description,
  createdFlow = false,
  setIsLoading,
  discardedData,
  isEmbedUser,
  mode = "orchestral",
  onConnectedFlowSave,
}) => {
  const orchestralFlowStatus = useCustomSelector((state) => {
    if (mode !== "orchestral" || !params?.org_id || !params?.orchestralId) return null;
    const orgFlows = state?.orchestralFlowReducer?.orchetralFlowData?.[params.org_id] || [];
    return orgFlows.find((item) => item._id === params.orchestralId)?.status || null;
  });

  const [isDrafted, setIsDrafted] = useState(false);

  useEffect(() => {
    if (mode === "orchestral") {
      setIsDrafted(orchestralFlowStatus === "draft");
    } else {
      setIsDrafted(false);
    }
  }, [mode, orchestralFlowStatus]);

  return (
    <ReactFlowProvider>
      <Flow
        params={params}
        orchestralData={orchestralData}
        name={name}
        description={description}
        createdFlow={createdFlow}
        setIsLoading={setIsLoading}
        isDrafted={isDrafted}
        discardedData={discardedData}
        isEmbedUser={isEmbedUser}
        mode={mode}
        searchParams={searchParams}
        onConnectedFlowSave={onConnectedFlowSave}
      />
    </ReactFlowProvider>
  );
};
export default Protected(AgentToAgentConnection);
