"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getConnectedAgentFlowAction } from "@/store/action/orchestralFlowAction";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2, Minimize2 } from "lucide-react";

// ============================================================================
// COLOR PALETTE FOR AGENTS
// ============================================================================
const AGENT_COLORS = [
  { color: "#9333ea", light: "#f3e8ff" }, // Purple
  { color: "#3b82f6", light: "#dbeafe" }, // Blue
  { color: "#f97316", light: "#ffedd5" }, // Orange
  { color: "#eab308", light: "#fef9c3" }, // Yellow
  { color: "#ec4899", light: "#fce7f3" }, // Pink
  { color: "#64748b", light: "#f1f5f9" }, // Slate
  { color: "#10b981", light: "#d1fae5" }, // Emerald
  { color: "#ef4444", light: "#fee2e2" }, // Red
  { color: "#06b6d4", light: "#cffafe" }, // Cyan
  { color: "#8b5cf6", light: "#ede9fe" }, // Violet
];

// ============================================================================
// CUSTOM NODE COMPONENT
// ============================================================================

function AgentNode({ data }) {
  const { abbr, color, light, isYouAreHere, isParent, isChild, isShared, isCurrentSelection } = data;

  // Determine styling based on state
  let fillColor = "#f8fafc";
  let strokeColor = "#e2e8f0";
  let strokeWidth = 1.2;
  let showGlow = false;
  let labelText = null;
  let labelBg = null;
  let labelColor = null;
  let textColor = "#374151";

  if (isYouAreHere) {
    fillColor = color;
    strokeColor = color;
    strokeWidth = 2.5;
    showGlow = true;
    labelText = "● YOU ARE HERE";
    labelBg = color;
    labelColor = "white";
    textColor = "white";
  } else if (isParent) {
    fillColor = "#fef9c3";
    strokeColor = "#f59e0b";
    strokeWidth = 2;
    labelText = "▲ PARENT";
    labelBg = "#f59e0b";
    labelColor = "white";
  } else if (isChild) {
    fillColor = light;
    strokeColor = color;
    strokeWidth = 1.8;
    labelText = "CHILD";
    labelBg = color;
    labelColor = "white";
  } else if (isShared) {
    fillColor = "#fffbeb";
    strokeColor = "#f59e0b";
    strokeWidth = 2;
    labelText = "SHARED";
    labelBg = "#f59e0b";
    labelColor = "white";
  }

  const nodeSize = 48;

  return (
    <div
      style={{
        position: "relative",
        width: nodeSize,
        height: nodeSize,
        cursor: "pointer",
      }}
    >
      {/* Handle for incoming edges (top) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "transparent",
          border: "none",
          width: 1,
          height: 1,
        }}
      />

      {/* Glow rings for YOU ARE HERE */}
      {showGlow && (
        <>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: `1px solid ${color}`,
              opacity: 0.2,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 60,
              height: 60,
              borderRadius: "50%",
              border: `1.5px solid ${color}`,
              opacity: 0.4,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* Dashed outer ring for parent */}
      {isParent && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 60,
            height: 60,
            borderRadius: "50%",
            border: "1.5px dashed #f59e0b",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Yellow dashed ring for shared */}
      {isShared && !isCurrentSelection && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 60,
            height: 60,
            borderRadius: "50%",
            border: "1.5px dashed #f59e0b",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Label above node */}
      {labelText && (
        <div
          style={{
            position: "absolute",
            top: -28,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: labelBg,
            color: labelColor,
            fontSize: 9,
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {labelText}
        </div>
      )}

      {/* Main node circle */}
      <div
        style={{
          width: nodeSize,
          height: nodeSize,
          borderRadius: "50%",
          backgroundColor: fillColor,
          border: `${strokeWidth}px solid ${strokeColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          transition: "all 0.15s ease",
        }}
      >
        <span
          style={{
            color: textColor,
            fontSize: 12,
            fontWeight: 600,
            userSelect: "none",
          }}
        >
          {abbr}
        </span>
      </div>

      {/* Handle for outgoing edges (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "transparent",
          border: "none",
          width: 1,
          height: 1,
        }}
      />
    </div>
  );
}

// Register custom node types
const nodeTypes = {
  agentNode: AgentNode,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function computeFlowNodesAndEdges(agents, selectedId, youAreHereId) {
  // Classify agents into tiers based on parents/children
  const roots = [];
  const intermediates = [];
  const leaves = [];

  agents.forEach((agent) => {
    const hasParents = agent.parents && agent.parents.length > 0;
    const hasChildren = agent.children && agent.children.length > 0;

    if (!hasParents && hasChildren) {
      roots.push(agent);
    } else if (hasParents && hasChildren) {
      intermediates.push(agent);
    } else if (hasParents && !hasChildren) {
      leaves.push(agent);
    } else {
      roots.push(agent);
    }
  });

  const viewBoxWidth = 800;
  const nodeRadius = 24;
  const minGap = 100;
  const rootY = 60;
  const intermediateY = 160;
  const leafY = 260;

  const positions = {};

  function spreadNodes(nodeList, yPos) {
    const count = nodeList.length;
    if (count === 0) return;

    const totalWidth = viewBoxWidth - 2 * nodeRadius;
    const spacing = Math.max(minGap, totalWidth / (count + 1));
    const startX = (viewBoxWidth - (count - 1) * spacing) / 2;

    nodeList.forEach((node, index) => {
      positions[node.id] = {
        x: startX + index * spacing,
        y: yPos,
      };
    });
  }

  spreadNodes(roots, rootY);
  spreadNodes(intermediates, intermediateY);
  spreadNodes(leaves, leafY);

  // Get selected agent info
  const selectedAgent = selectedId ? agents.find((a) => a.id === selectedId) : null;
  const selectedParentIds = selectedAgent?.parents || [];
  const selectedChildIds = selectedAgent?.children || [];

  // Create React Flow nodes
  const nodes = agents.map((agent) => {
    const pos = positions[agent.id] || { x: 400, y: 160 };
    const isYouAreHere = agent.id === youAreHereId;
    const isCurrentSelection = agent.id === selectedId;
    const isParent = selectedId && selectedParentIds.includes(agent.id);
    const isChild = selectedId && selectedChildIds.includes(agent.id);
    const isShared = agent.parents && agent.parents.length > 1;
    const isUnconnected =
      (!agent.parents || agent.parents.length === 0) && (!agent.children || agent.children.length === 0);

    return {
      id: agent.id,
      type: "agentNode",
      position: { x: pos.x - 24, y: pos.y - 24 }, // Center the node
      data: {
        abbr: agent.abbr,
        label: agent.label,
        color: agent.color,
        light: agent.light,
        isYouAreHere,
        isParent,
        isChild,
        isShared,
        isUnconnected,
        isCurrentSelection,
      },
    };
  });

  // Create React Flow edges
  const edges = [];
  agents.forEach((agent) => {
    const childIds = agent.children || [];
    childIds.forEach((childId) => {
      const childAgent = agents.find((a) => a.id === childId);
      if (childAgent && positions[agent.id] && positions[childId]) {
        const isActive = selectedId && (agent.id === selectedId || childId === selectedId);

        let strokeColor = "#d1d5db";
        let strokeWidth = 1.3;
        let animated = false;

        if (isActive) {
          // Determine edge color based on selection
          const isSelectedShared = selectedParentIds.length > 1;
          if (isSelectedShared && childId === selectedId) {
            const parentAgent = agents.find((a) => a.id === agent.id);
            strokeColor = parentAgent?.color || agent.color;
          } else {
            strokeColor = selectedAgent?.color || agent.color;
          }
          strokeWidth = 2.5;
          animated = true;
        }

        edges.push({
          id: `${agent.id}-${childId}`,
          source: agent.id,
          target: childId,
          type: "smoothstep",
          animated,
          style: {
            stroke: strokeColor,
            strokeWidth,
            opacity: isActive ? 1 : 0.35,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 15,
            height: 15,
          },
        });
      }
    });
  });

  return { nodes, edges };
}

// ============================================================================
// HELPER: Transform API data to graph format
// ============================================================================

function transformApiDataToGraphFormat(apiData, allBridges, currentAgentId) {
  if (!apiData || typeof apiData !== "object") {
    return [];
  }

  const agents = [];
  let colorIndex = 0;

  Object.entries(apiData).forEach(([id, agentData]) => {
    let bridgeInfo = allBridges.find((bridge) => bridge._id === id);

    if (!bridgeInfo) {
      bridgeInfo = allBridges.find((bridge) => bridge.versions && bridge.versions.includes(id));
    }

    const colorSet = AGENT_COLORS[colorIndex % AGENT_COLORS.length];
    colorIndex++;

    const name = agentData.agent_name || bridgeInfo?.name || bridgeInfo?.slugName || `Agent ${id.slice(0, 6)}`;

    const abbr = name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const parentAgents = agentData.parentAgents || [];
    const childAgents = agentData.childAgents || [];

    const parents = parentAgents.map((p) => (typeof p === "string" ? p : p.id));
    const children = childAgents.map((c) => (typeof c === "string" ? c : c.id));

    agents.push({
      id,
      label: name,
      abbr,
      model: bridgeInfo?.service || "Unknown",
      color: colorSet.color,
      light: colorSet.light,
      children,
      parents,
      tokens: 0,
      status: bridgeInfo?.status !== 0 ? "active" : "inactive",
      desc: agentData.description || bridgeInfo?.description || "",
    });
  });

  return agents;
}

// ============================================================================
// FULLSCREEN TOGGLE BUTTON (with Lucide icons)
// ============================================================================

function FullscreenButton({ isFullscreen, onClick }) {
  return (
    <button
      onClick={onClick}
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        cursor: "pointer",
        color: "#64748b",
        transition: "all 0.15s ease",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#f1f5f9";
        e.currentTarget.style.color = "#475569";
        e.currentTarget.style.borderColor = "#cbd5e1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
        e.currentTarget.style.color = "#64748b";
        e.currentTarget.style.borderColor = "#e2e8f0";
      }}
    >
      {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
  );
}

// ============================================================================
// FULLSCREEN OVERLAY
// ============================================================================

function FullscreenOverlay({ children, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          backgroundColor: "#ffffff",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// LEGEND COMPONENT
// ============================================================================

function Legend({ isFullscreen }) {
  const items = [
    {
      label: "You Are Here",
      fill: "#9333ea",
      stroke: "#9333ea",
      dashed: false,
    },
    {
      label: "Parent",
      fill: "#fef9c3",
      stroke: "#f59e0b",
      dashed: false,
    },
    {
      label: "Child",
      fill: "#dbeafe",
      stroke: "#3b82f6",
      dashed: false,
    },
    {
      label: "Shared",
      fill: "#fffbeb",
      stroke: "#f59e0b",
      dashed: true,
    },
    {
      label: "Unconnected",
      fill: "#f8fafc",
      stroke: "#e2e8f0",
      dashed: false,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: isFullscreen ? 32 : 24,
        padding: "12px 16px",
        borderTop: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
        flexWrap: "wrap",
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: isFullscreen ? 14 : 12,
              height: isFullscreen ? 14 : 12,
              borderRadius: "50%",
              backgroundColor: item.fill,
              border: `2px ${item.dashed ? "dashed" : "solid"} ${item.stroke}`,
            }}
          />
          <span
            style={{
              fontSize: isFullscreen ? 13 : 11,
              color: "#6b7280",
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AgentGraph({ agentId, orgId, versionId }) {
  const dispatch = useDispatch();

  // State
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(agentId || null);
  const [breadcrumbTrail, setBreadcrumbTrail] = useState(agentId ? [agentId] : []);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Get data from Redux
  const {
    connectedAgentFlow,
    allBridges,
    isLoading: isReduxLoading,
  } = useCustomSelector((state) => {
    const connectedFlow = state.orchestralFlowReducer?.connectedAgentFlowByBridge?.[orgId]?.[agentId]?.[versionId];

    const bridges = state.bridgeReducer?.org?.[orgId]?.orgs || [];

    const isLoading = state.orchestralFlowReducer?.connectedAgentFlowLoading;

    return {
      connectedAgentFlow: connectedFlow || null,
      allBridges: bridges,
      isLoading,
    };
  });

  // Determine "YOU ARE HERE" agent
  const youAreHereId = agentId || (agents.length > 0 ? agents[0].id : null);

  // Fetch connected agents on mount
  useEffect(() => {
    if (!versionId || !orgId || !agentId) {
      setLoading(false);
      return;
    }

    dispatch(
      getConnectedAgentFlowAction({
        orgId,
        bridgeId: agentId,
        versionId,
      })
    );
  }, [dispatch, agentId, orgId, versionId]);

  // Transform API data when it arrives
  useEffect(() => {
    if (isReduxLoading) {
      setLoading(true);
      return;
    }

    if (connectedAgentFlow) {
      const transformedAgents = transformApiDataToGraphFormat(connectedAgentFlow, allBridges, agentId);

      if (transformedAgents.length > 0) {
        setAgents(transformedAgents);
        setLoading(false);

        const matchingAgent = transformedAgents.find((a) => a.id === agentId);

        if (matchingAgent) {
          setSelectedId(matchingAgent.id);
          setBreadcrumbTrail([matchingAgent.id]);
        } else if (transformedAgents.length > 0) {
          setSelectedId(transformedAgents[0].id);
          setBreadcrumbTrail([transformedAgents[0].id]);
        }
      } else {
        const currentBridge = allBridges.find((b) => b._id === agentId);

        if (currentBridge) {
          const singleAgent = {
            id: agentId,
            label: currentBridge.name || currentBridge.slugName || "Current Agent",
            abbr: (currentBridge.name || "CA").slice(0, 2).toUpperCase(),
            model: currentBridge.service || "Unknown",
            color: AGENT_COLORS[0].color,
            light: AGENT_COLORS[0].light,
            children: [],
            parents: [],
            tokens: 0,
            status: "active",
            desc: currentBridge.description || "",
          };
          setAgents([singleAgent]);
          setSelectedId(agentId);
          setBreadcrumbTrail([agentId]);
        }
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [connectedAgentFlow, allBridges, agentId, isReduxLoading]);

  // Update React Flow nodes and edges when agents or selection changes
  useEffect(() => {
    if (agents.length > 0) {
      const { nodes: newNodes, edges: newEdges } = computeFlowNodesAndEdges(agents, selectedId, youAreHereId);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [agents, selectedId, youAreHereId, setNodes, setEdges]);

  // Handle node click
  const handleNodeClick = useCallback((event, node) => {
    const nodeId = node.id;
    setSelectedId(nodeId);

    setBreadcrumbTrail((prevTrail) => {
      const existingIndex = prevTrail.indexOf(nodeId);
      if (existingIndex !== -1) {
        return prevTrail.slice(0, existingIndex + 1);
      } else {
        return [...prevTrail, nodeId];
      }
    });
  }, []);

  // Handle breadcrumb click
  const handleBreadcrumbClick = useCallback((nodeId, index) => {
    setSelectedId(nodeId);
    setBreadcrumbTrail((prevTrail) => prevTrail.slice(0, index + 1));
  }, []);

  // Retry fetch
  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    if (versionId && orgId && agentId) {
      dispatch(
        getConnectedAgentFlowAction({
          orgId,
          bridgeId: agentId,
          versionId,
        })
      );
    }
  }, [dispatch, agentId, orgId, versionId]);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 400,
          backgroundColor: "#f8fafc",
          borderRadius: 8,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #e2e8f0",
              borderTopColor: "#9333ea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 12px auto",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: "#64748b", fontSize: 14 }}>Loading agent graph...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 400,
          backgroundColor: "#fef2f2",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              color: "#dc2626",
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Failed to load agent graph
          </div>
          <div style={{ color: "#991b1b", fontSize: 14, marginBottom: 16 }}>{error}</div>
          <button
            onClick={handleRetry}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              backgroundColor: "#9333ea",
              color: "white",
              fontSize: 14,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render graph content
  const renderGraphContent = (inFullscreen) => (
    <>
      {/* Breadcrumb */}
      {breadcrumbTrail.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: inFullscreen ? "12px 24px" : "8px 16px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            fontSize: inFullscreen ? 14 : 12,
            flexWrap: "wrap",
          }}
        >
          {breadcrumbTrail.map((nodeId, index) => {
            const agent = agents.find((a) => a.id === nodeId);
            const isLast = index === breadcrumbTrail.length - 1;

            return (
              <React.Fragment key={nodeId}>
                <span
                  onClick={() => handleBreadcrumbClick(nodeId, index)}
                  style={{
                    cursor: "pointer",
                    color: isLast ? "#1f2937" : "#6b7280",
                    fontWeight: isLast ? 600 : 400,
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: isLast ? "#e5e7eb" : "transparent",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLast) e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    if (!isLast) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {agent ? agent.label : nodeId}
                </span>
                {!isLast && <span style={{ color: "#d1d5db" }}>›</span>}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* React Flow Graph */}
      <div
        style={{
          flex: 1,
          position: "relative",
          minHeight: inFullscreen ? 0 : 320,
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e5e7eb" gap={20} size={1} />
          <Controls
            showInteractive={false}
            style={{
              display: "flex",
              flexDirection: "row",
              bottom: 12,
              left: 12,
              top: "auto",
              right: "auto",
            }}
          />
          {inFullscreen && (
            <MiniMap
              nodeColor={(node) => {
                if (node.data?.isYouAreHere) return node.data.color;
                if (node.data?.isParent) return "#f59e0b";
                if (node.data?.isChild) return node.data.color;
                return "#e2e8f0";
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
              style={{
                bottom: 12,
                right: 56,
              }}
            />
          )}
        </ReactFlow>

        {/* Fullscreen toggle button */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10,
          }}
        >
          <FullscreenButton isFullscreen={inFullscreen} onClick={toggleFullscreen} />
        </div>
      </div>

      {/* Legend */}
      <Legend isFullscreen={inFullscreen} />
    </>
  );

  return (
    <>
      {/* Normal view */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          height: 420,
        }}
      >
        {renderGraphContent(false)}
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && <FullscreenOverlay onClose={toggleFullscreen}>{renderGraphContent(true)}</FullscreenOverlay>}
    </>
  );
}

export default AgentGraph;
