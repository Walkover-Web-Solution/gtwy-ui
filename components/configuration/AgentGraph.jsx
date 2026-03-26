"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getConnectedAgentFlowAction } from "@/store/action/orchestralFlowAction";

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
// HELPER FUNCTIONS
// ============================================================================

function computeLayout(agents) {
  // Classify agents into tiers based on parents/children
  var roots = [];
  var intermediates = [];
  var leaves = [];

  agents.forEach(function (agent) {
    var hasParents = agent.parents && agent.parents.length > 0;
    var hasChildren = agent.children && agent.children.length > 0;

    if (!hasParents && hasChildren) {
      roots.push(agent);
    } else if (hasParents && hasChildren) {
      intermediates.push(agent);
    } else if (hasParents && !hasChildren) {
      leaves.push(agent);
    } else {
      // No parents and no children - treat as root
      roots.push(agent);
    }
  });

  var positions = {};
  var viewBoxWidth = 800;
  var nodeRadius = 24;
  var minGap = 100;

  // Y positions for each tier
  var rootY = 60;
  var intermediateY = 160;
  var leafY = 260;

  // Calculate x positions for each tier
  function spreadNodes(nodeList, yPos) {
    var count = nodeList.length;
    if (count === 0) return;

    var totalWidth = viewBoxWidth - 2 * nodeRadius;
    var spacing = Math.max(minGap, totalWidth / (count + 1));
    var startX = (viewBoxWidth - (count - 1) * spacing) / 2;

    nodeList.forEach(function (node, index) {
      positions[node.id] = {
        x: startX + index * spacing,
        y: yPos,
      };
    });
  }

  spreadNodes(roots, rootY);
  spreadNodes(intermediates, intermediateY);
  spreadNodes(leaves, leafY);

  return positions;
}

function getBezierPath(x1, y1, x2, y2) {
  // Create a curved Bézier path from (x1, y1) to (x2, y2)
  var controlOffset = Math.abs(y2 - y1) * 0.4;

  // Use string concatenation for ES5 compatibility in SVG
  return (
    "M " +
    x1 +
    " " +
    y1 +
    " C " +
    x1 +
    " " +
    (y1 + controlOffset) +
    ", " +
    x2 +
    " " +
    (y2 - controlOffset) +
    ", " +
    x2 +
    " " +
    y2
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// GraphSVG - The main SVG visualization
function GraphSVG({ agents, positions, selectedId, youAreHereId, onNodeClick }) {
  // Build edges data
  var edges = [];
  agents.forEach(function (agent) {
    var childIds = agent.children || [];
    childIds.forEach(function (childId) {
      var childAgent = agents.find(function (a) {
        return a.id === childId;
      });
      if (childAgent && positions[agent.id] && positions[childId]) {
        edges.push({
          fromId: agent.id,
          toId: childId,
          fromPos: positions[agent.id],
          toPos: positions[childId],
          fromColor: agent.color,
        });
      }
    });
  });

  var selectedAgent = selectedId
    ? agents.find(function (a) {
        return a.id === selectedId;
      })
    : null;
  var selectedParentIds = selectedAgent && selectedAgent.parents ? selectedAgent.parents : [];
  var selectedChildIds = selectedAgent && selectedAgent.children ? selectedAgent.children : [];
  var isSelectedShared = selectedParentIds.length > 1;

  // Build SVG content using ES5 string concatenation
  var svgContent = "";

  // Dot grid pattern
  svgContent += "<defs>";
  svgContent += '<pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">';
  svgContent += '<circle cx="2" cy="2" r="1" fill="#e5e7eb" />';
  svgContent += "</pattern>";
  // Arrow marker
  svgContent += '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">';
  svgContent += '<polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />';
  svgContent += "</marker>";
  svgContent += "</defs>";

  // Background
  svgContent += '<rect width="800" height="300" fill="white" />';
  svgContent += '<rect width="800" height="300" fill="url(#dotGrid)" />';

  // Draw edges
  edges.forEach(function (edge, idx) {
    var fromPos = edge.fromPos;
    var toPos = edge.toPos;
    var pathD = getBezierPath(fromPos.x, fromPos.y + 24, toPos.x, toPos.y - 24);

    var _isActive = false;
    var strokeColor = "#d1d5db";
    var strokeWidth = 1.3;
    var strokeOpacity = 0.35;
    var strokeDasharray = "4,4";

    // Check if this edge touches the selected node
    if (selectedId) {
      if (edge.fromId === selectedId || edge.toId === selectedId) {
        _isActive = true;
        // For shared child selection, use the parent's color
        if (isSelectedShared && edge.toId === selectedId) {
          var parentAgent = agents.find(function (a) {
            return a.id === edge.fromId;
          });
          strokeColor = parentAgent ? parentAgent.color : edge.fromColor;
        } else {
          strokeColor = selectedAgent ? selectedAgent.color : edge.fromColor;
        }
        strokeWidth = 2.5;
        strokeOpacity = 1;
        strokeDasharray = "none";
      }
    }

    svgContent +=
      '<path d="' +
      pathD +
      '" fill="none" stroke="' +
      strokeColor +
      '" stroke-width="' +
      strokeWidth +
      '" stroke-opacity="' +
      strokeOpacity +
      '" stroke-dasharray="' +
      strokeDasharray +
      '" marker-end="url(#arrowhead)" />';
  });

  // Draw nodes
  agents.forEach(function (agent) {
    var pos = positions[agent.id];
    if (!pos) return;

    var isYouAreHere = agent.id === youAreHereId;
    var isSelected = agent.id === selectedId;
    var isParent = selectedId && selectedParentIds.indexOf(agent.id) !== -1;
    var isChild = selectedId && selectedChildIds.indexOf(agent.id) !== -1;
    var isShared = agent.parents && agent.parents.length > 1;
    var isUnconnected =
      (!agent.parents || agent.parents.length === 0) && (!agent.children || agent.children.length === 0);

    // Determine styling
    var fillColor, strokeColor, strokeWidth, showGlow, labelText, labelBg, labelColor;

    if (isSelected && isYouAreHere) {
      // YOU ARE HERE - selected
      fillColor = agent.color;
      strokeColor = agent.color;
      strokeWidth = 2.5;
      showGlow = true;
      labelText = "● YOU ARE HERE";
      labelBg = agent.color;
      labelColor = "white";
    } else if (isYouAreHere && !isSelected) {
      // YOU ARE HERE - not selected
      fillColor = agent.color;
      strokeColor = agent.color;
      strokeWidth = 2.5;
      showGlow = true;
      labelText = "● YOU ARE HERE";
      labelBg = agent.color;
      labelColor = "white";
    } else if (isParent) {
      fillColor = "#fef9c3";
      strokeColor = "#f59e0b";
      strokeWidth = 2;
      showGlow = false;
      labelText = "▲ PARENT";
      labelBg = "#f59e0b";
      labelColor = "white";
    } else if (isChild) {
      fillColor = agent.light;
      strokeColor = agent.color;
      strokeWidth = 1.8;
      showGlow = false;
      labelText = "CHILD";
      labelBg = agent.color;
      labelColor = "white";
    } else if (isShared) {
      // Shared child - always show indicator
      fillColor = "#fffbeb";
      strokeColor = "#f59e0b";
      strokeWidth = 2;
      showGlow = false;
      labelText = "SHARED";
      labelBg = "#f59e0b";
      labelColor = "white";
    } else if (isUnconnected || !isSelected) {
      fillColor = "#f8fafc";
      strokeColor = "#e2e8f0";
      strokeWidth = 1.2;
      showGlow = false;
      labelText = null;
      labelBg = null;
      labelColor = null;
    } else {
      fillColor = "#f8fafc";
      strokeColor = "#e2e8f0";
      strokeWidth = 1.2;
      showGlow = false;
      labelText = null;
      labelBg = null;
      labelColor = null;
    }

    // Glow rings for YOU ARE HERE
    if (showGlow) {
      svgContent +=
        '<circle cx="' +
        pos.x +
        '" cy="' +
        pos.y +
        '" r="36" fill="none" stroke="' +
        agent.color +
        '" stroke-width="1" stroke-opacity="0.2" />';
      svgContent +=
        '<circle cx="' +
        pos.x +
        '" cy="' +
        pos.y +
        '" r="30" fill="none" stroke="' +
        agent.color +
        '" stroke-width="1.5" stroke-opacity="0.4" />';
    }

    // Dashed outer ring for parent
    if (isParent) {
      svgContent +=
        '<circle cx="' +
        pos.x +
        '" cy="' +
        pos.y +
        '" r="30" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,3" />';
    }

    // Yellow dashed ring for shared
    if (isShared && !isSelected) {
      svgContent +=
        '<circle cx="' +
        pos.x +
        '" cy="' +
        pos.y +
        '" r="30" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,3" />';
    }

    // Main node circle
    svgContent +=
      '<circle cx="' +
      pos.x +
      '" cy="' +
      pos.y +
      '" r="24" fill="' +
      fillColor +
      '" stroke="' +
      strokeColor +
      '" stroke-width="' +
      strokeWidth +
      '" style="cursor:pointer" data-agent-id="' +
      agent.id +
      '" />';

    // Abbreviation text
    var textColor = isYouAreHere || (isSelected && isYouAreHere) ? "white" : "#374151";
    svgContent +=
      '<text x="' +
      pos.x +
      '" y="' +
      (pos.y + 4) +
      '" text-anchor="middle" fill="' +
      textColor +
      '" font-size="12" font-weight="600" style="pointer-events:none">' +
      agent.abbr +
      "</text>";

    // Label above node
    if (labelText) {
      var labelY = pos.y - 34;
      // Approximate text width
      var textWidth = labelText.length * 5 + 12;
      var labelX = pos.x - textWidth / 2;

      svgContent +=
        '<rect x="' +
        labelX +
        '" y="' +
        (labelY - 8) +
        '" width="' +
        textWidth +
        '" height="16" rx="4" fill="' +
        labelBg +
        '" />';
      svgContent +=
        '<text x="' +
        pos.x +
        '" y="' +
        (labelY + 3) +
        '" text-anchor="middle" fill="' +
        labelColor +
        '" font-size="9" font-weight="600" style="pointer-events:none">' +
        labelText +
        "</text>";
    }
  });

  return (
    <svg
      viewBox="0 0 800 300"
      style={{ width: "100%", height: "auto", maxHeight: "300px" }}
      onClick={function (e) {
        var target = e.target;
        if (target.tagName === "circle" && target.getAttribute("data-agent-id")) {
          onNodeClick(target.getAttribute("data-agent-id"));
        }
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

// ============================================================================
// HELPER: Transform API data to graph format
// ============================================================================

function transformApiDataToGraphFormat(apiData, allBridges, currentAgentId) {
  if (!apiData || typeof apiData !== "object") {
    return [];
  }

  var agents = [];
  var colorIndex = 0;

  Object.entries(apiData).forEach(function (entry) {
    var id = entry[0];
    var agentData = entry[1];

    // Find corresponding bridge data
    var bridgeInfo = allBridges.find(function (bridge) {
      return bridge._id === id;
    });

    // If not found by _id, try versions array
    if (!bridgeInfo) {
      bridgeInfo = allBridges.find(function (bridge) {
        return bridge.versions && bridge.versions.includes(id);
      });
    }

    // Get color for this agent
    var colorSet = AGENT_COLORS[colorIndex % AGENT_COLORS.length];
    colorIndex++;

    // Get name - try multiple sources
    var name =
      agentData.agent_name ||
      (bridgeInfo && bridgeInfo.name) ||
      (bridgeInfo && bridgeInfo.slugName) ||
      "Agent " + id.slice(0, 6);

    // Create abbreviation from name
    var abbr = name
      .split(" ")
      .map(function (word) {
        return word[0];
      })
      .join("")
      .toUpperCase()
      .slice(0, 2);

    // Get parent and child IDs
    var parentAgents = agentData.parentAgents || [];
    var childAgents = agentData.childAgents || [];

    // Normalize to just IDs if they're objects
    var parents = parentAgents.map(function (p) {
      return typeof p === "string" ? p : p.id;
    });
    var children = childAgents.map(function (c) {
      return typeof c === "string" ? c : c.id;
    });

    agents.push({
      id: id,
      label: name,
      abbr: abbr,
      model: (bridgeInfo && bridgeInfo.service) || "Unknown",
      color: colorSet.color,
      light: colorSet.light,
      children: children,
      parents: parents,
      tokens: 0,
      status: bridgeInfo && bridgeInfo.status !== 0 ? "active" : "inactive",
      desc: agentData.description || (bridgeInfo && bridgeInfo.description) || "",
    });
  });

  return agents;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AgentGraph({ agentId, orgId, versionId }) {
  var dispatch = useDispatch();

  // State
  var stateArray = useState([]);
  var agents = stateArray[0];
  var setAgents = stateArray[1];

  var loadingState = useState(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  var errorState = useState(null);
  var error = errorState[0];
  var setError = errorState[1];

  var selectedState = useState(agentId || null);
  var selectedId = selectedState[0];
  var setSelectedId = selectedState[1];

  var trailState = useState(agentId ? [agentId] : []);
  var breadcrumbTrail = trailState[0];
  var setBreadcrumbTrail = trailState[1];

  // Get data from Redux
  var reduxData = useCustomSelector(function (state) {
    var connectedFlow =
      state.orchestralFlowReducer &&
      state.orchestralFlowReducer.connectedAgentFlowByBridge &&
      state.orchestralFlowReducer.connectedAgentFlowByBridge[orgId] &&
      state.orchestralFlowReducer.connectedAgentFlowByBridge[orgId][agentId] &&
      state.orchestralFlowReducer.connectedAgentFlowByBridge[orgId][agentId][versionId];

    var allBridges =
      (state.bridgeReducer &&
        state.bridgeReducer.org &&
        state.bridgeReducer.org[orgId] &&
        state.bridgeReducer.org[orgId].orgs) ||
      [];

    var isLoading = state.orchestralFlowReducer && state.orchestralFlowReducer.connectedAgentFlowLoading;

    return {
      connectedAgentFlow: connectedFlow || null,
      allBridges: allBridges,
      isLoading: isLoading,
    };
  });

  var connectedAgentFlow = reduxData.connectedAgentFlow;
  var allBridges = reduxData.allBridges;
  var isReduxLoading = reduxData.isLoading;

  // Fetch connected agents on mount
  useEffect(
    function () {
      if (!versionId || !orgId || !agentId) {
        setLoading(false);
        return;
      }

      // Dispatch the action to fetch connected agent flow
      dispatch(
        getConnectedAgentFlowAction({
          orgId: orgId,
          bridgeId: agentId,
          versionId: versionId,
        })
      );
    },
    [dispatch, agentId, orgId, versionId]
  );

  // Transform API data when it arrives
  useEffect(
    function () {
      if (isReduxLoading) {
        setLoading(true);
        return;
      }

      if (connectedAgentFlow) {
        var transformedAgents = transformApiDataToGraphFormat(connectedAgentFlow, allBridges, agentId);

        if (transformedAgents.length > 0) {
          setAgents(transformedAgents);
          setLoading(false);

          // Pre-select the current agent
          var matchingAgent = transformedAgents.find(function (a) {
            return a.id === agentId;
          });

          if (matchingAgent) {
            setSelectedId(matchingAgent.id);
            setBreadcrumbTrail([matchingAgent.id]);
          } else if (transformedAgents.length > 0) {
            // Default to first agent
            setSelectedId(transformedAgents[0].id);
            setBreadcrumbTrail([transformedAgents[0].id]);
          }
        } else {
          // No connected agents - show empty state with just current agent
          var currentBridge = allBridges.find(function (b) {
            return b._id === agentId;
          });

          if (currentBridge) {
            var singleAgent = {
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
        // No data yet - might be initial load or no connections
        setLoading(false);
      }
    },
    [connectedAgentFlow, allBridges, agentId, isReduxLoading]
  );

  // Compute layout positions
  var positions = useMemo(
    function () {
      return computeLayout(agents);
    },
    [agents]
  );

  // Handle node click
  var handleNodeClick = useCallback(function (nodeId) {
    setSelectedId(nodeId);

    // Update breadcrumb trail
    setBreadcrumbTrail(function (prevTrail) {
      var existingIndex = prevTrail.indexOf(nodeId);
      if (existingIndex !== -1) {
        // Node already in trail - trim trail back to this point
        return prevTrail.slice(0, existingIndex + 1);
      } else {
        // Add to trail
        return prevTrail.concat([nodeId]);
      }
    });
  }, []);

  // Handle breadcrumb click
  var handleBreadcrumbClick = useCallback(function (nodeId, index) {
    setSelectedId(nodeId);
    setBreadcrumbTrail(function (prevTrail) {
      return prevTrail.slice(0, index + 1);
    });
  }, []);

  // Retry fetch
  var handleRetry = useCallback(
    function () {
      setLoading(true);
      setError(null);
      // Re-trigger fetch via Redux action
      if (versionId && orgId && agentId) {
        dispatch(
          getConnectedAgentFlowAction({
            orgId: orgId,
            bridgeId: agentId,
            versionId: versionId,
          })
        );
      }
    },
    [dispatch, agentId, orgId, versionId]
  );

  // Determine "YOU ARE HERE" agent (the agentId prop or first selected)
  var youAreHereId = agentId || (agents.length > 0 ? agents[0].id : null);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "400px",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #e2e8f0",
              borderTopColor: "#9333ea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 12px auto",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: "#64748b", fontSize: "14px" }}>Loading agent graph...</div>
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
          height: "400px",
          backgroundColor: "#fef2f2",
          borderRadius: "8px",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#dc2626", fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
            Failed to load agent graph
          </div>
          <div style={{ color: "#991b1b", fontSize: "14px", marginBottom: "16px" }}>{error}</div>
          <button
            onClick={handleRetry}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              backgroundColor: "#9333ea",
              color: "white",
              fontSize: "14px",
              fontWeight: "500",
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
      }}
    >
      {/* Breadcrumb */}
      {breadcrumbTrail.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "8px 16px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "12px",
            flexWrap: "wrap",
          }}
        >
          {breadcrumbTrail.map(function (nodeId, index) {
            var agent = agents.find(function (a) {
              return a.id === nodeId;
            });
            var isLast = index === breadcrumbTrail.length - 1;

            return (
              <React.Fragment key={nodeId}>
                <span
                  onClick={function () {
                    handleBreadcrumbClick(nodeId, index);
                  }}
                  style={{
                    cursor: "pointer",
                    color: isLast ? "#1f2937" : "#6b7280",
                    fontWeight: isLast ? "600" : "400",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    backgroundColor: isLast ? "#e5e7eb" : "transparent",
                  }}
                  onMouseEnter={function (e) {
                    if (!isLast) e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={function (e) {
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

      {/* Graph area - now full width */}
      <div
        style={{
          width: "100%",
          padding: "16px",
          backgroundColor: "#ffffff",
          minHeight: "320px",
        }}
      >
        <GraphSVG
          agents={agents}
          positions={positions}
          selectedId={selectedId}
          youAreHereId={youAreHereId}
          onNodeClick={handleNodeClick}
        />

        {/* Legend */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#9333ea",
                border: "2px solid #9333ea",
              }}
            />
            <span style={{ fontSize: "11px", color: "#6b7280" }}>You Are Here</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#fef9c3",
                border: "2px solid #f59e0b",
              }}
            />
            <span style={{ fontSize: "11px", color: "#6b7280" }}>Parent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#dbeafe",
                border: "2px solid #3b82f6",
              }}
            />
            <span style={{ fontSize: "11px", color: "#6b7280" }}>Child</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#fffbeb",
                border: "2px dashed #f59e0b",
              }}
            />
            <span style={{ fontSize: "11px", color: "#6b7280" }}>Shared</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#f8fafc",
                border: "2px solid #e2e8f0",
              }}
            />
            <span style={{ fontSize: "11px", color: "#6b7280" }}>Unconnected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentGraph;
