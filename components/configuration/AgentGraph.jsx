"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useCustomSelector } from "@/customHooks/customSelector";

// ============================================================================
// MOCK DATA FOR DEVELOPMENT/DEMO
// ============================================================================
const MOCK_AGENTS = [
  {
    id: "si-001",
    label: "Sales Intelligence",
    abbr: "SI",
    model: "GPT-4",
    color: "#9333ea",
    light: "#f3e8ff",
    children: ["am-002", "dc-003", "cr-004", "gd-005"],
    parents: [],
    tokens: 15420,
    status: "active",
    desc: "Main sales intelligence agent that orchestrates customer analysis",
  },
  {
    id: "am-002",
    label: "Account Manager",
    abbr: "AM",
    model: "GPT-4",
    color: "#3b82f6",
    light: "#dbeafe",
    children: [],
    parents: ["si-001"],
    tokens: 8230,
    status: "active",
    desc: "Manages account relationships and customer data",
  },
  {
    id: "dc-003",
    label: "Data Collector",
    abbr: "DC",
    model: "Claude-3",
    color: "#f97316",
    light: "#ffedd5",
    children: [],
    parents: ["si-001", "pa-006"],
    tokens: 12150,
    status: "active",
    desc: "Collects and processes data from multiple sources",
  },
  {
    id: "cr-004",
    label: "CRM Reporter",
    abbr: "CR",
    model: "GPT-3.5",
    color: "#eab308",
    light: "#fef9c3",
    children: [],
    parents: ["si-001"],
    tokens: 5670,
    status: "active",
    desc: "Generates CRM reports and analytics",
  },
  {
    id: "gd-005",
    label: "Growth Driver",
    abbr: "GD",
    model: "GPT-4",
    color: "#ec4899",
    light: "#fce7f3",
    children: [],
    parents: ["si-001"],
    tokens: 9840,
    status: "active",
    desc: "Identifies growth opportunities and strategies",
  },
  {
    id: "pa-006",
    label: "Pipeline Analyst",
    abbr: "PA",
    model: "GPT-4",
    color: "#64748b",
    light: "#f1f5f9",
    children: ["dc-003"],
    parents: [],
    tokens: 7320,
    status: "inactive",
    desc: "Analyzes sales pipeline and forecasts",
  },
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
  var viewBoxWidth = 620;
  var nodeRadius = 24;
  var minGap = 80;

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

// RelCard - Relationship card for parent/child agents
function RelCard({ agent, type, isShared, onClick, selectedColor }) {
  var bgColor = type === "parent" ? "#fef9c3" : agent ? agent.light : "#f8fafc";
  var borderColor = type === "parent" ? "#f59e0b" : agent ? agent.color : "#e2e8f0";
  var tagBg = type === "parent" ? "#f59e0b" : isShared ? "#f59e0b" : agent ? agent.color : "#64748b";
  var tagText = type === "parent" ? "PARENT" : isShared ? "SHARED" : "CHILD";

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: "8px",
        backgroundColor: bgColor,
        border: "1px solid " + borderColor,
        cursor: "pointer",
        marginBottom: "8px",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={function (e) {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={function (e) {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: agent ? agent.color : "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "10px",
              fontWeight: "600",
            }}
          >
            {agent ? agent.abbr : "??"}
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#1f2937" }}>
              {agent ? agent.label : "Unknown"}
            </div>
            <div style={{ fontSize: "10px", color: "#6b7280" }}>{agent ? agent.model : ""}</div>
          </div>
        </div>
        <span
          style={{
            padding: "2px 6px",
            borderRadius: "4px",
            backgroundColor: tagBg,
            color: "white",
            fontSize: "9px",
            fontWeight: "600",
            letterSpacing: "0.5px",
          }}
        >
          {tagText}
        </span>
      </div>
    </div>
  );
}

// DetailPanel - Right column showing selected agent details
function DetailPanel({ selectedAgent, agents, onAgentClick }) {
  if (!selectedAgent) {
    return (
      <div
        style={{
          width: "216px",
          flexShrink: 0,
          padding: "16px",
          backgroundColor: "#f8fafc",
          borderLeft: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: "14px", fontWeight: "500" }}>Select an agent</div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>Click on any node to view details</div>
        </div>
      </div>
    );
  }

  var parentAgents = (selectedAgent.parents || [])
    .map(function (pid) {
      return agents.find(function (a) {
        return a.id === pid;
      });
    })
    .filter(Boolean);

  var childAgents = (selectedAgent.children || [])
    .map(function (cid) {
      return agents.find(function (a) {
        return a.id === cid;
      });
    })
    .filter(Boolean);

  var isSharedAgent = selectedAgent.parents && selectedAgent.parents.length > 1;

  // Build gradient background style
  var gradientStyle = "linear-gradient(135deg, " + selectedAgent.light + " 0%, white 100%)";

  return (
    <div
      style={{
        width: "216px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        borderLeft: "1px solid #e2e8f0",
        overflow: "hidden",
      }}
    >
      {/* Header with gradient background */}
      <div
        style={{
          padding: "16px",
          background: gradientStyle,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {/* Avatar and name */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: selectedAgent.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "14px",
              fontWeight: "700",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            {selectedAgent.abbr}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>{selectedAgent.label}</div>
            <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: "#e5e7eb",
                  color: "#374151",
                  fontSize: "9px",
                  fontWeight: "500",
                }}
              >
                {selectedAgent.model}
              </span>
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: selectedAgent.status === "active" ? "#dcfce7" : "#fef3c7",
                  color: selectedAgent.status === "active" ? "#166534" : "#92400e",
                  fontSize: "9px",
                  fontWeight: "500",
                }}
              >
                {selectedAgent.status === "active" ? "● Active" : "○ Inactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Shared badge if applicable */}
        {isSharedAgent && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "6px",
              backgroundColor: "#fffbeb",
              border: "1px solid #f59e0b",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "10px", fontWeight: "600", color: "#92400e" }}>
              SHARED · {selectedAgent.parents.length} parents
            </span>
          </div>
        )}

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            borderTop: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: isSharedAgent ? "#f59e0b" : "#1f2937" }}>
              {parentAgents.length}
            </div>
            <div style={{ fontSize: "10px", color: "#6b7280" }}>Parents</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>{childAgents.length}</div>
            <div style={{ fontSize: "10px", color: "#6b7280" }}>Children</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
              {(selectedAgent.tokens / 1000).toFixed(1)}k
            </div>
            <div style={{ fontSize: "10px", color: "#6b7280" }}>Tokens</div>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {/* Used By (Parents) */}
        {parentAgents.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#6b7280",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "12px" }}>↑</span> Used By
            </div>
            {parentAgents.map(function (parent) {
              return (
                <RelCard
                  key={parent.id}
                  agent={parent}
                  type="parent"
                  isShared={false}
                  onClick={function () {
                    onAgentClick(parent.id);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Calls (Children) */}
        {childAgents.length > 0 && (
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#6b7280",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "12px" }}>↓</span> Calls
            </div>
            {childAgents.map(function (child) {
              var childIsShared = child.parents && child.parents.length > 1;
              return (
                <RelCard
                  key={child.id}
                  agent={child}
                  type="child"
                  isShared={childIsShared}
                  onClick={function () {
                    onAgentClick(child.id);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Description */}
        {selectedAgent.desc && (
          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#6b7280",
                marginBottom: "4px",
              }}
            >
              Description
            </div>
            <p style={{ fontSize: "12px", color: "#4b5563", lineHeight: "1.5", margin: 0 }}>{selectedAgent.desc}</p>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          gap: "8px",
        }}
      >
        <button
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "6px",
            backgroundColor: selectedAgent.color,
            color: "white",
            fontSize: "12px",
            fontWeight: "500",
            border: "none",
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={function (e) {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={function (e) {
            e.currentTarget.style.opacity = "1";
          }}
        >
          Open Agent
        </button>
        <button
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            backgroundColor: "#f3f4f6",
            color: "#374151",
            fontSize: "12px",
            fontWeight: "500",
            border: "1px solid #e5e7eb",
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={function (e) {
            e.currentTarget.style.backgroundColor = "#e5e7eb";
          }}
          onMouseLeave={function (e) {
            e.currentTarget.style.backgroundColor = "#f3f4f6";
          }}
        >
          + Connect
        </button>
      </div>
    </div>
  );
}

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
  svgContent += '<rect width="620" height="300" fill="white" />';
  svgContent += '<rect width="620" height="300" fill="url(#dotGrid)" />';

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
      viewBox="0 0 620 300"
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
// MAIN COMPONENT
// ============================================================================

function AgentGraph({ agentId }) {
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

  // Get bridges from Redux (will be used when real API is implemented)
  var _allBridgesMap = useCustomSelector(function (state) {
    return state.bridgeReducer.allBridgesMap || {};
  });

  // Fetch connected agents on mount
  useEffect(
    function () {
      // For now, use mock data
      // In production, replace with actual API call
      var timer = setTimeout(function () {
        setAgents(MOCK_AGENTS);
        setLoading(false);

        // If agentId provided, pre-select it
        if (agentId) {
          // Try to find matching agent
          var matchingAgent = MOCK_AGENTS.find(function (a) {
            return a.id === agentId;
          });
          if (matchingAgent) {
            setSelectedId(matchingAgent.id);
            setBreadcrumbTrail([matchingAgent.id]);
          } else {
            // Default to first agent
            setSelectedId(MOCK_AGENTS[0].id);
            setBreadcrumbTrail([MOCK_AGENTS[0].id]);
          }
        }
      }, 500);

      return function () {
        clearTimeout(timer);
      };
    },
    [agentId]
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
  var handleRetry = useCallback(function () {
    setLoading(true);
    setError(null);
    // Re-trigger fetch
    setTimeout(function () {
      setAgents(MOCK_AGENTS);
      setLoading(false);
    }, 500);
  }, []);

  // Get selected agent
  var selectedAgent = selectedId
    ? agents.find(function (a) {
        return a.id === selectedId;
      })
    : null;

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
      {/* Agent Header Bar */}
      {selectedAgent && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "#fafafa",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: selectedAgent.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {selectedAgent.abbr}
            </div>
            <div>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>{selectedAgent.label}</span>
            </div>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                backgroundColor: selectedAgent.status === "active" ? "#dcfce7" : "#fef3c7",
                color: selectedAgent.status === "active" ? "#166534" : "#92400e",
                fontSize: "10px",
                fontWeight: "500",
              }}
            >
              {selectedAgent.status === "active" ? "● Active" : "○ Inactive"}
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
                fontSize: "10px",
                fontWeight: "500",
              }}
            >
              V1
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                fontSize: "12px",
                fontWeight: "500",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
              }}
            >
              Test Cases
            </button>
            <button
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                fontSize: "12px",
                fontWeight: "500",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
              }}
            >
              History
            </button>
            <button
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: selectedAgent.color,
                color: "white",
                fontSize: "12px",
                fontWeight: "500",
                border: "none",
                cursor: "pointer",
              }}
            >
              Publish
            </button>
          </div>
        </div>
      )}

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

      {/* Main content area */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Graph area */}
        <div
          style={{
            flex: 1,
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

        {/* Detail Panel */}
        <DetailPanel selectedAgent={selectedAgent} agents={agents} onAgentClick={handleNodeClick} />
      </div>
    </div>
  );
}

export default AgentGraph;
