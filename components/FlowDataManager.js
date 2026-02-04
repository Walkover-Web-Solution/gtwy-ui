import {
  TestTube,
  Bot,
  PlusIcon,
  Zap,
  MessageSquare,
  Globe,
  CircleArrowOutUpRight,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import AgentDescriptionModal from "./modals/AgentDescriptionModal";
import { closeModal, openModal, transformAgentVariableToToolCallFormat } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import Chat from "./configuration/Chat";
/* Global stack to make only the topmost handle ESC/overlay */
const SlideStack = {
  stack: [],
  push(id) {
    this.stack = [...this.stack.filter((x) => x !== id), id];
  },
  remove(id) {
    this.stack = this.stack.filter((x) => x !== id);
  },
  top() {
    return this.stack[this.stack.length - 1];
  },
};

function useStableId(provided) {
  const ref = useRef(provided || `slideover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  return ref.current;
}

function SlideOver({
  isOpen,
  onClose,
  widthClass = "w-[360px] max-w-[85vw]",
  children,
  header,
  className = "",
  bodyClassName = "",
  overlayZ = "z-[99998]",
  panelZ = "z-[99999]",
  backDropBlur = true,
  instanceId: instanceIdProp,
  destroyOnClose = true,
  animationMs = 300,
}) {
  const instanceId = useStableId(instanceIdProp);
  const overlayId = `${instanceId}-overlay`;
  const panelId = `${instanceId}-panel`;

  // Local mount state so we can keep it in DOM during closing animation
  const [mounted, setMounted] = useState(isOpen);
  const closeTimer = useRef(null);

  // Handle mount/unmount lifecycle
  useEffect(() => {
    if (isOpen) {
      // opening: ensure mounted, register on stack
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setMounted(true);
      SlideStack.push(instanceId);
    } else {
      // closing: remove from stack, then unmount after animation
      SlideStack.remove(instanceId);
      if (destroyOnClose) {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => {
          setMounted(false);
          closeTimer.current = null;
        }, animationMs);
      }
    }
    return () => {}; // nothing here
  }, [isOpen, instanceId, destroyOnClose, animationMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      SlideStack.remove(instanceId);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [instanceId]);

  // ESC only for topmost
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose && onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, instanceId]);

  const handleOverlayClick = () => {
    if (SlideStack.top() === instanceId) onClose && onClose();
  };

  // If we’re closed AND destroyOnClose, unmount entirely
  if (!mounted && destroyOnClose) return null;

  return (
    <>
      {/* Overlay */}
      <div
        id={overlayId}
        onClick={handleOverlayClick}
        className={`fixed inset-0 ${overlayZ} ${backDropBlur ? "backdrop-blur-sm bg-black/40" : ""} transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Panel */}
      <aside
        id={panelId}
        data-state={isOpen ? "open" : "closed"}
        className={`fixed top-0 right-0 h-full ${widthClass} bg-base-100 border border-base-content/50 ${panelZ}
          transform-gpu transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"} ${className}`}
        style={{ transition: `transform ${animationMs}ms ease-in-out` }}
        role="dialog"
        aria-modal="true"
      >
        {header}
        <div className={`h-full overflow-y-auto ${bodyClassName}`}>{children}</div>
      </aside>
    </>
  );
}

export { SlideOver };

/* -------------------------------------------------------
   Serialization: React Flow -> Agent Structure
-------------------------------------------------------- */
export function serializeAgentFlow(nodes, edges, metadata = {}) {
  try {
    const agentNodes = nodes.filter((node) => node.type === "agentNode" && node.data?.selectedAgent);
    if (nodes.length === 0) throw new Error("No agent nodes found in the flow");
    if (nodes.length == 1) {
      return {
        agents: {},
        master_agent: {},
        status: metadata.status || "draft",
        flow_name: metadata.name || "Untitled Flow",
        flow_description: metadata.description || "",
        bridge_type: metadata.bridge_type || null,
        data: metadata.autoSaveData,
      };
    }
    const childrenMap = new Map();
    const parentsMap = new Map();
    agentNodes.forEach((node) => {
      childrenMap.set(node.id, []);
      parentsMap.set(node.id, []);
    });

    edges.forEach((edge) => {
      const sourceNode = agentNodes.find((n) => n.id === edge.source);
      const targetNode = agentNodes.find((n) => n.id === edge.target);
      if (sourceNode && targetNode) {
        childrenMap.get(edge.source).push(edge.target);
        parentsMap.get(edge.target).push(edge.source);
      }
    });

    const masterNode =
      agentNodes.find((node) => node.data?.isFirstAgent) ||
      agentNodes.find((node) => (parentsMap.get(node.id) || []).length === 0) ||
      agentNodes[0];

    if (!masterNode) throw new Error("Could not determine master agent");

    const agents = {};
    agentNodes.forEach((node) => {
      const sel = node.data.selectedAgent;
      const nodeId = node.id;

      const parentAgents = (parentsMap.get(nodeId) || [])
        .map((pid) => {
          const p = agentNodes.find((n) => n.id === pid);
          const s = p?.data?.selectedAgent;
          return s?._id || s?.id || s?.bridge_id || s?.name;
        })
        .filter(Boolean);

      const childAgents = (childrenMap.get(nodeId) || [])
        .map((cid) => {
          const c = agentNodes.find((n) => n.id === cid);
          const s = c?.data?.selectedAgent;
          return s?._id || s?.id || s?.bridge_id || s?.name;
        })
        .filter(Boolean);

      const agentKey = sel._id || sel.id || sel.bridge_id || sel.name || `agent_${Date.now()}`;
      agents[agentKey] = {
        name: sel.name,
        description: sel.description || `Agent: ${sel.name}`,
        parentAgents,
        childAgents,
        thread_id: sel.thread_id ? sel.thread_id : false,
        variables_path: sel.variables_path ? sel.variables_path : {},
        variables: sel.variables
          ? sel.variables
          : sel.agent_variables
            ? transformAgentVariableToToolCallFormat(sel.agent_variables)
            : {},
        agent_variables: sel.agent_variables ? sel.agent_variables : {},
      };
    });

    const result = {
      agents,
      master_agent:
        masterNode?.id || masterNode?.data?.selectedAgent?.id || masterNode?.data?.selectedAgent?.bridge_id || "",
      status: metadata.status || "draft",
      flow_name: metadata.name || "Untitled Flow",
      flow_description: metadata.description || "",
      bridge_type: metadata.bridge_type || null,
      data: metadata.autoSaveData,
    };

    return result;
  } catch (error) {
    console.error("Error serializing agent flow:", error);
    throw new Error(`Serialization failed: ${error.message}`);
  }
}

/* -------------------------------------------------------
   Agent Structure -> React Flow {nodes, edges}
-------------------------------------------------------- */
export function createNodesFromAgentDoc(doc, allBridges = []) {
  if (!doc || typeof doc !== "object") {
    throw new Error("No agents found in data");
  }

  const nodes = [];
  const edges = [];

  const HORIZONTAL_SPACING = 280;
  const VERTICAL_SPACING = 200;
  const BASE_Y = 400;

  // Handle new data structure where doc is the agents object directly
  const agents = doc;

  // Find master agent (one with no parentAgents or the first one)
  const masterAgentKey =
    Object.keys(agents).find((id) => !agents[id].parentAgents || agents[id].parentAgents.length === 0) ||
    Object.keys(agents)[0];

  // Add bridge node
  nodes.push({
    id: "bridge-node-root",
    type: "bridgeNode",
    position: { x: 80, y: BASE_Y },
    data: {
      bridgeType: "api", // Default bridge type
      hasMasterAgent: !!masterAgentKey,
    },
  });

  // Build graph from new structure with bridge data
  const graph = new Map();
  Object.entries(agents).forEach(([id, agent]) => {
    // Get bridge data for this agent - try multiple approaches
    let bridgeInfo = allBridges?.find((bridge) => bridge._id === id) || agent.bridgeData;

    // If not found by _id, try to find by versions array (for version IDs)
    if (!bridgeInfo) {
      bridgeInfo = allBridges?.find((bridge) => bridge.versions && bridge.versions.includes(id));
    }

    graph.set(id, {
      name: agent.agent_name || bridgeInfo?.name || bridgeInfo?.slugName || `Agent_${id}`,
      description: agent.description || bridgeInfo?.description || "",
      children: Array.isArray(agent.childAgents)
        ? agent.childAgents.map((child) => (typeof child === "string" ? child : child.id))
        : [],
      variables: agent.variables || bridgeInfo?.variables || [],
      thread_id: agent.thread_id || false,
      bridgeData: bridgeInfo, // Include bridge data in the graph node
    });
  });

  const levels = new Map();
  const q = [[masterAgentKey, 0]];
  levels.set(masterAgentKey, 0);

  while (q.length) {
    const [current, level] = q.shift();
    const node = graph.get(current);
    if (!node) continue;
    for (const child of node.children) {
      if (!levels.has(child)) {
        levels.set(child, level + 1);
        q.push([child, level + 1]);
      }
    }
  }

  const levelCounts = {};
  for (const lvl of levels.values()) levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;

  const levelPositions = {};
  Object.entries(levelCounts).forEach(([lvlStr, count]) => {
    const lvl = parseInt(lvlStr, 10);
    levelPositions[lvl] = [];
    if (count === 1) {
      levelPositions[lvl].push(BASE_Y);
    } else {
      const total = (count - 1) * VERTICAL_SPACING;
      const startY = BASE_Y - total / 2;
      for (let i = 0; i < count; i++) levelPositions[lvl].push(startY + i * VERTICAL_SPACING);
    }
  });

  const levelCounters = {};

  Object.entries(agents).forEach(([id, a]) => {
    const level = levels.get(id) ?? 0;
    const idx = levelCounters[level] || 0;
    levelCounters[level] = idx + 1;
    const y = (levelPositions[level] && levelPositions[level][idx]) ?? BASE_Y;

    // Get the graph node which has enriched bridge data
    const graphNode = graph.get(id);
    const bridgeInfo = graphNode?.bridgeData;

    nodes.push({
      id,
      type: "agentNode",
      position: { x: 80 + level * HORIZONTAL_SPACING, y },
      data: {
        selectedAgent: {
          _id: id,
          name: bridgeInfo?.name || bridgeInfo?.slugName || graphNode?.name || a.agent_name || `Agent_${id}`,
          description: bridgeInfo?.description || graphNode?.description || a.description || "",
          variables_path: a.variables_path || bridgeInfo?.variables_path || {},
          variables: graphNode?.variables || a.variables || bridgeInfo?.variables || {},
          bridgeData: bridgeInfo, // Include bridge data
        },
        isFirstAgent: id === masterAgentKey,
        isLast: (graphNode?.children || []).length === 0,
        thread_id: graphNode?.thread_id || a.thread_id || false,
        bridgeInfo: bridgeInfo, // Additional bridge info at node level
      },
    });
  });

  if (masterAgentKey) {
    edges.push({
      id: `edge-root-${masterAgentKey}`,
      source: "bridge-node-root",
      target: masterAgentKey,
      type: "smoothstep",
      style: { animated: true },
    });
  }

  Object.entries(agents).forEach(([id, a]) => {
    (a.childAgents || []).forEach((child) => {
      // Handle both string IDs and enhanced child objects
      const childId = typeof child === "string" ? child : child.id;
      edges.push({
        id: `edge-${id}-${childId}`,
        source: id,
        target: childId,
        type: "smoothstep",
        style: { animated: true },
      });
    });
  });

  return { nodes, edges };
}

/* -------------------------------------------------------
   Bridge type configs
-------------------------------------------------------- */
export const BRIDGE_TYPES = {
  api: {
    name: "API",
    icon: Globe,
    color: "from-blue-500 to-blue-600",
    description: "Connect via API endpoints",
  },
  chatbot: {
    name: "Chatbot",
    icon: MessageSquare,
    color: "from-green-500 to-green-600",
    description: "Interactive chat interface",
  },
  trigger: {
    name: "Trigger",
    icon: Zap,
    color: "from-purple-500 to-purple-600",
    description: "Event-based triggers",
  },
};

/* -------------------------------------------------------
   Misc utilities
-------------------------------------------------------- */
export function useAgentLookup(agentsObj) {
  return useMemo(() => {
    const byId = new Map();
    const byName = new Map();
    for (const [key, a] of Object.entries(agentsObj || {})) {
      const idKey = a?.bridge_id ?? key;
      if (idKey) byId.set(String(idKey), a);
      if (a?.name) {
        const k = String(a.name).toLowerCase();
        if (!byName.has(k)) byName.set(k, a);
      }
    }
    const resolve = (ref) => {
      if (!ref) return null;
      if (typeof ref === "object") return byId.get(String(ref.bridge_id)) || ref;
      const str = String(ref);
      return byId.get(str) || byName.get(str.toLowerCase()) || null;
    };
    return { byId, byName, resolve };
  }, [agentsObj]);
}

export function normalizeConnectedRefs(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value);
  return [value];
}

export function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a),
    kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

/* -------------------------------------------------------
   Agent Picker Sidebar (uses SlideOver)
-------------------------------------------------------- */
export function AgentSidebar({ isOpen, title, agents, onClose, nodes, onChoose, params }) {
  const [q, setQ] = useState("");
  const [description, setDescription] = useState("");
  const [selectAgent, setSelectAgent] = useState({ nameToCreate: "", org_id: params?.org_id });
  const [openAgentConfigSidebar, setOpenAgentConfigSidebar] = useState(false);

  useEffect(() => {
    if (isOpen) setQ("");
  }, [isOpen]);

  const [creationType, setCreationType] = useState("name"); // 'name' or 'purpose'
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);

  const handleCreateAgent = () => {
    setIsCreating(true);
    window.GtwyEmbed.sendDataToGtwy({
      parent_id: "gtwyParentId",
    });
    setOpenAgentConfigSidebar(true);
    setInputValue("");
    onClose();
    setTimeout(() => {
      window.openGtwy({ [creationType === "name" ? "agent_name" : "agent_purpose"]: inputValue });
    }, 3000);
    setIsCreating(false);
  };

  const handleTypeChange = (type) => {
    setCreationType(type);
    setInputValue("");
  };

  useEffect(() => {
    setTimeout(() => {
      if (window.GtwyEmbed) {
        window.GtwyEmbed.sendDataToGtwy({
          parentId: "gtwyParentId",
          agent_id: selectAgent?._id,
        });
      }
    }, 100);
  }, [openAgentConfigSidebar]);

  const usedAgentIds = useMemo(() => {
    return new Set(
      (nodes || [])
        .filter((n) => n.type === "agentNode" && n.data?.selectedAgent)
        .map((n) => n.data.selectedAgent.bridge_id || n.data.selectedAgent.name)
    );
  }, [nodes]);

  const list = useMemo(() => {
    return Object.entries(agents || {})
      .map(([origKey, a]) => ({ ...a, __key: origKey }))
      .filter((a) => {
        const key = a.bridge_id || a.name;
        const matchesSearch = (a?.name || "").toLowerCase().includes(q.toLowerCase());
        const notUsed = !usedAgentIds.has(key);
        const isNotDeleted = !a.deletedAt;
        return matchesSearch && notUsed && isNotDeleted;
      });
  }, [agents, q, usedAgentIds, agents, nodes]);

  const handleSelectAgent = (agent) => {
    setSelectAgent(agent);
    openModal(MODAL_TYPE?.AGENT_DESCRIPTION_MODAL);
    window.closeGtwy();
  };

  const handleAddAgent = () => {
    selectAgent.description = description;
    onChoose?.(selectAgent);
    closeModal(MODAL_TYPE?.AGENT_DESCRIPTION_MODAL);
    setDescription("");
    setSelectAgent({ nameToCreate: "", org_id: params?.org_id });
  };

  const handleEventListener = useCallback(
    (event) => {
      const { type, status, data } = event.data;
      if (type === "gtwy" && status === "published") {
        let bridge = agents.find((a) => a._id === data.agent_id);
        let node = nodes.find((n) => n?.id === data.agent_id);
        if (node) {
          return;
        }
        if (bridge) {
          onChoose(bridge);
          setOpenAgentConfigSidebar(false);
        } else {
          const fallbackBridge = {
            _id: data.agent_id,
            name: data.name || data.agent_name || "Published Agent",
            description: data.description || data.agent_description || "",
            published_version_id: data.agent_version_id,
          };
          onChoose(fallbackBridge);
          setOpenAgentConfigSidebar(false);
        }
      }
    },
    [agents, onChoose]
  );

  useEffect(() => {
    window.addEventListener("message", handleEventListener);
    return () => {
      window.removeEventListener("message", handleEventListener);
    };
  }, [handleEventListener]);

  useEffect(() => {
    return () => {
      setOpenAgentConfigSidebar(false);
      onClose();
      setSelectAgent({ nameToCreate: "", org_id: params?.org_id });
      if (window.closeGtwy) window.closeGtwy();
    };
  }, []);

  const handleOpenAgentConfigSidebar = (agent) => {
    setOpenAgentConfigSidebar(true);
    onClose();
    window.GtwyEmbed.sendDataToGtwy({
      agent_id: agent?._id,
    });
    setTimeout(() => {
      window.openGtwy({
        agent_id: agent?._id,
      });
    }, 500);
  };

  return (
    <>
      <SlideOver
        isOpen={isOpen}
        onClose={onClose}
        widthClass="w-full sm:w-[460px] md:w-[620px] w-[720px] rounded-lg"
        header={
          <div className="p-4 border-b border-base-300 bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="badge badge-primary badge-sm font-medium mb-2">SELECT AGENT</div>
                <h2 className="text-xl font-bold text-base-content">{title}</h2>
              </div>
              <button
                id="agent-sidebar-close-button"
                onClick={onClose}
                className="btn btn-circle btn-ghost hover:btn-error"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        }
        bodyClassName=""
        instanceId="agent-sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Search Section - Fixed at top */}
          <div className="p-4 flex-shrink-0">
            <div className="form-control">
              <div className="input-group flex items-center gap-2">
                <input
                  id="agent-sidebar-search-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search agents..."
                  className="input input-sm input-bordered input-primary flex-1 focus:outline-offset-0 w-full"
                />
              </div>
            </div>
          </div>

          {/* Divider - Fixed */}
          <div className="px-4 flex-shrink-0">
            <div className="divider">
              <span className="text-base-content/60 font-medium">Available Agents</span>
            </div>
          </div>

          {/* Scrollable Agent List - Takes remaining space */}
          <div className="flex-1 h-full px-4 overflow-y-auto min-h-0">
            {list.length === 0 ? (
              <div className="card bg-base-100 shadow-md">
                <div className="card-body flex flex-row text-center py-12">
                  <div className="avatar placeholder mb-4">
                    <div className="bg-base-300 text-base-content rounded-full w-16">
                      <span className="text-2xl">🤖</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-base-content/60 mb-2">
                      {q ? `No agents found for "${q}"` : "No agents available"}
                    </h3>
                    <p className="text-sm text-base-content/50">
                      {q ? "Try adjusting your search terms" : "Create your first agent to get started"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {list.map((agent, idx) => {
                  const hasPublishedVersion = agent.published_version_id;
                  const doesNotHavePausedStatus = agent.bridge_status !== 0;
                  const doesNotHaveArchivedStatus = agent.status !== 0;
                  const isDisabled = !(hasPublishedVersion && doesNotHavePausedStatus && doesNotHaveArchivedStatus);

                  const getStatusLabel = () => {
                    if (!hasPublishedVersion) return "Not Published";
                    if (agent.bridge_status === 0) return "Paused";
                    if (agent.status === 0) return "Archived";
                    return "Active";
                  };

                  const getStatusBadge = () => {
                    const status = getStatusLabel();
                    switch (status) {
                      case "Active":
                        return "badge-success";
                      case "Paused":
                        return "badge-warning";
                      case "Archived":
                        return "badge-error";
                      default:
                        return "badge-neutral";
                    }
                  };

                  const statusLabel = getStatusLabel();

                  return (
                    <div
                      key={(agent.bridge_id || agent.__key || `${agent.name}-${idx}`).toString()}
                      className={`card bg-base-100 shadow-md hover:shadow-lg group hover:bg-base-200/30 transition-all duration-200 ${
                        isDisabled ? "opacity-60" : "hover:scale-[1.02]"
                      }`}
                    >
                      <div className="card-body p-2">
                        <div className="flex items-center justify-between">
                          <button
                            id={`agent-sidebar-select-${agent._id || agent.__key}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAgent(agent);
                            }}
                            disabled={isDisabled}
                            className={`flex items-center gap-3 flex-1 text-left ${
                              isDisabled ? "cursor-not-allowed" : "cursor-pointer group"
                            }`}
                          >
                            <div className="avatar placeholder">
                              <div
                                className={`rounded-full w-12 h-12 ${
                                  isDisabled
                                    ? "bg-base-300 text-base-content/50"
                                    : "bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-content"
                                } transition-all duration-200`}
                              >
                                <Bot className="w-6 h-6" />
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3
                                  className={`text-sm ${
                                    isDisabled ? "text-base-content/50" : "text-base-content group-hover:text-primary"
                                  } transition-colors duration-200`}
                                >
                                  {agent.name || agent.__key}
                                </h3>
                                <div className={`badge ${getStatusBadge()} badge-sm font-medium`}>{statusLabel}</div>
                              </div>
                              {agent.description && (
                                <p className="text-sm text-base-content/60 truncate">{agent.description}</p>
                              )}
                            </div>
                          </button>

                          <div className="card-actions">
                            <div className="tooltip tooltip-left" data-tip="Configure Agent">
                              <button
                                id={`agent-sidebar-config-${agent._id || agent.__key}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAgentConfigSidebar(agent);
                                }}
                                className="btn btn-circle btn-primary btn-outline btn-sm opacity-0 group-hover:opacity-100 transition-all duration-200"
                              >
                                <CircleArrowOutUpRight size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fixed Create Button at Bottom */}
          <div className="border-t border-base-300 mb-24 p-4 bg-base-100 flex-shrink-0">
            <div className="dropdown dropdown-top w-full">
              <div
                id="agent-sidebar-create-toggle"
                tabIndex={0}
                role="button"
                className="btn btn-primary btn-sm w-full shadow-lg hover:shadow-xl transition-all duration-200"
                onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
              >
                <div className="avatar placeholder mr-2">
                  <div className="bg-primary-content text-primary rounded-full w-6 h-6 flex items-center justify-center">
                    <span className="text-sm">
                      <PlusIcon size={18} />
                    </span>
                  </div>
                </div>
                Create New Agent
                {isCreateDropdownOpen ? (
                  <ChevronUp className="w-4 h-4 ml-auto transition-transform duration-200" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-auto transition-transform duration-200" />
                )}
              </div>

              {isCreateDropdownOpen && (
                <div className="dropdown-content z-[1] card card-compact w-full bg-base-100 shadow-xl border border-primary/20 mb-2">
                  <div className="card-body space-y-4">
                    {/* Creation Type Selector */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium text-sm">Creation Method</span>
                      </label>
                      <div className="join w-full">
                        <button
                          id="agent-sidebar-create-type-name"
                          onClick={() => handleTypeChange("name")}
                          className={`btn btn-sm join-item flex-1 ${
                            creationType === "name" ? "btn-primary" : "btn-outline btn-primary"
                          }`}
                        >
                          📝 Name
                        </button>
                        <button
                          id="agent-sidebar-create-type-purpose"
                          onClick={() => handleTypeChange("purpose")}
                          className={`btn btn-sm join-item flex-1 ${
                            creationType === "purpose" ? "btn-primary" : "btn-outline btn-primary"
                          }`}
                        >
                          🎯 Purpose
                        </button>
                      </div>
                    </div>

                    {/* Input Field */}
                    <div className="form-control">
                      {creationType === "name" ? (
                        <input
                          id="agent-sidebar-create-name-input"
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="Enter agent name..."
                          className="input input-bordered input-primary w-full"
                        />
                      ) : (
                        <textarea
                          id="agent-sidebar-create-purpose-textarea"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="Describe what the agent should do..."
                          rows={2}
                          className="textarea bg-white dark:bg-black/15 textarea-bordered textarea-primary w-full resize-none"
                        />
                      )}
                    </div>

                    {/* Create Button */}
                    <button
                      id="agent-sidebar-create-submit-button"
                      onClick={handleCreateAgent}
                      disabled={!inputValue.trim() || isCreating}
                      className={`btn btn-sm w-full ${
                        !inputValue.trim() || isCreating ? "btn-disabled" : "btn-primary"
                      }`}
                    >
                      {isCreating ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Creating...
                        </>
                      ) : (
                        <>🚀 Create Agent</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <AgentDescriptionModal
          setDescription={setDescription}
          handleSaveAgent={handleAddAgent}
          description={description}
          isAgentToAgentConnect={false}
        />
      </SlideOver>
      <AgentConfigSidebar
        isOpen={openAgentConfigSidebar}
        onClose={() => setOpenAgentConfigSidebar(false)}
        agent={selectAgent}
        instanceId="agent-config-sidebar"
      />
    </>
  );
}

/* -------------------------------------------------------
   Flow Control Panel (uses SlideOver for Chat)
-------------------------------------------------------- */
export function FlowControlPanel({
  onSaveAgent,
  onDiscard, // ← optional: pass a handler to discard changes
  bridgeType = "default",
  name,
  description,
  createdFlow,
  setIsLoading,
  params,
  searchParams,
  isEmbedUser,
  mode = "orchestral", // 'orchestral' or 'connected'
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const handleQuickTestKeyDown = (e) => {
    if (e.key === "Enter") {
      const val = e.currentTarget.value.trim();
      setUserMessage(val);
      if (!val) return;
      setIsChatOpen(true);
      e.currentTarget.value = "";
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setIsChatOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative z-[9990]">
      {/* Quick Test Input with highlight ring */}
      {!isChatOpen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
          <div className="relative">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full ring-2 ring-primary animate-pulse"></div>

            {/* Main content */}
            <div className="relative flex items-center gap-2 bg-base-100/95 backdrop-blur-md border border-base-200 rounded-full px-4 py-3 shadow-lg">
              <TestTube className="h-5 w-5 text-primary" />
              <input
                id="flow-control-test-input"
                type="text"
                placeholder="Test the model..."
                className="bg-transparent outline-none text-sm w-64 focus:w-80 transition-all"
                onKeyDown={handleQuickTestKeyDown}
              />
              <div className="text-xs text-base-content/60 border-l pl-3">Press Enter</div>
            </div>
          </div>
        </div>
      )}

      {/* Chat SlideOver */}
      <SlideOver
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        widthClass="w-full sm:w-[660px] md:w-[620px] w-[720px] mt-6 rounded-lg h-[calc(100vh-120px)]"
        overlayZ="z-[9968]"
        panelZ="z-[9969]"
        backDropBlur={false}
        header={
          <div className="px-5 py-1 border-b border-base-content/30 flex items-center justify-between rounded-t-lg">
            <div className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-primary" />
              <h4 className="text-base font-semibold">Test Your Model</h4>
            </div>
            <button
              id="flow-control-chat-close-button"
              onClick={() => setIsChatOpen(false)}
              className="btn btn-ghost btn-circle btn-sm"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        }
        bodyClassName="min-h-0"
      >
        <div className="flex-1 rounded-b-lg">
          <Chat params={params} searchParams={searchParams} userMessage={userMessage} isOrchestralModel={true} />
        </div>
      </SlideOver>
    </div>
  );
}

/* -------------------------------------------------------
   Agent Config Sidebar (uses SlideOver)
-------------------------------------------------------- */
export function AgentConfigSidebar({ isOpen, onClose, agent, instanceId, onAgentUpdate }) {
  useEffect(() => {
    setTimeout(() => {
      if (window.GtwyEmbed) {
        window.GtwyEmbed.sendDataToGtwy({
          parentId: "gtwyParentId",
          agent_id: agent?._id,
        });
      }
    }, 100);
  }, [agent]);

  // Listen for agent updates from the embedded configuration
  useEffect(() => {
    const handleAgentUpdate = (event) => {
      if (event.data?.type === "agent_updated" && event.data?.agent) {
        const updatedAgent = event.data.agent;
        onAgentUpdate?.(agent?._id, updatedAgent);
      }
    };

    if (isOpen) {
      window.addEventListener("message", handleAgentUpdate);
    }

    return () => {
      window.removeEventListener("message", handleAgentUpdate);
    };
  }, [isOpen, agent?._id, onAgentUpdate]);
  useEffect(() => {
    return () => {
      if (window.closeGtwy) window.closeGtwy();
    };
  }, [isOpen]);
  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      widthClass="w-[80vw] max-w-[80vw]"
      header={
        <div className="flex items-center justify-between px-6 py-4 border border-base-200">
          <h2 className="text-xl font-semibold">Agent Configuration</h2>
          <button
            id="agent-config-sidebar-close-button"
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      }
      bodyClassName="p-6 space-y-4 pb-20"
      instanceId={instanceId}
    >
      <div id="gtwyParentId" className="h-full border-none w-full mx-auto flex items-center justify-center">
        <span className="animate-pulse">Loading...</span>
      </div>
    </SlideOver>
  );
}
