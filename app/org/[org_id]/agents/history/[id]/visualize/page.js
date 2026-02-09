"use client";

import React, { useCallback, useEffect, useMemo, useState, use } from "react";
import { ReactFlow, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { getRecursiveHistoryAction } from "@/store/action/historyAction";
import { X, ArrowLeft } from "lucide-react";
import { formatRelativeTime, toggleSidebar } from "@/utils/utility";

import { UserPromptUI } from "@/components/historyUi/UserPromptUi.js";
import { MainAgentUI } from "@/components/historyUi/MainAgentUi.js";
import { BatchUI } from "@/components/historyUi/BatchUi.js";
import GenericNode from "@/components/historyUi/GenericNode.js";
import { ToolFullSlider } from "@/components/historyUi/ToolFullSlider.js";
import { ResponseFullSlider } from "@/components/historyUi/ResponseFullSlider.js";

const nodeTypes = {
  generic: GenericNode,
};

export default function Page({ params, searchParams }) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const dispatch = useDispatch();
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const orgId = resolvedParams?.org_id;
  const bridgeId = resolvedParams?.id;
  const { recursiveHistory, recursiveHistoryLoading, embedToken, mainAgentName } = useCustomSelector((state) => {
    const recursiveHistory = state?.historyReducer?.recursiveHistory;
    const recursiveHistoryLoading = state?.historyReducer?.recursiveHistoryLoading;

    const embedToken = state?.bridgeReducer?.org?.[orgId]?.embed_token;

    const orgAgents = state?.bridgeReducer?.org?.[orgId]?.orgs || [];
    const agent = orgAgents.find((item) => item?._id === bridgeId || item?.id === bridgeId);

    const mainAgentName = agent?.name || agent?.agent_name || agent?.bridge_name || "main_agent";

    return {
      recursiveHistory,
      recursiveHistoryLoading,
      embedToken,
      mainAgentName,
    };
  });

  const messageId = resolvedSearchParams?.message_id;
  const threadId = resolvedSearchParams?.thread_id;
  const subThreadId = resolvedSearchParams?.subThread_id;
  const versionId = resolvedSearchParams?.version;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!bridgeId) return;
    if (!messageId || !threadId || !subThreadId) {
      const storedRaw = window.localStorage.getItem(`visualize_ids:${bridgeId}`);
      if (!storedRaw) return;
      try {
        const stored = JSON.parse(storedRaw);
        const newUrl = new URL(window.location.href);
        if (!messageId && stored.message_id) {
          newUrl.searchParams.set("message_id", stored.message_id);
        }
        if (!threadId && stored.thread_id) {
          newUrl.searchParams.set("thread_id", stored.thread_id);
        }
        if (!subThreadId && stored.sub_thread_id) {
          newUrl.searchParams.set("subThread_id", stored.sub_thread_id);
        }
        router.replace(`${newUrl.pathname}${newUrl.search}`);
      } catch (error) {
        console.warn("Failed to restore visualize ids from localStorage", error);
      }
    }
  }, [bridgeId, messageId, threadId, subThreadId, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!bridgeId || !messageId || !threadId || !subThreadId) return;
    window.localStorage.setItem(
      `visualize_ids:${bridgeId}`,
      JSON.stringify({
        message_id: messageId,
        thread_id: threadId,
        sub_thread_id: subThreadId,
      })
    );
  }, [bridgeId, messageId, threadId, subThreadId]);

  const recursiveMessage = recursiveHistory?.data || null;

  const responsePreview = useMemo(() => {
    const content =
      recursiveMessage?.updated_llm_message || recursiveMessage?.llm_message || recursiveMessage?.chatbot_message || "";
    if (!content) return "";
    return content.length > 120 ? `${content.slice(0, 120)}...` : content;
  }, [recursiveMessage]);

  // Fetch recursive history using data from URL
  useEffect(() => {
    if (!bridgeId || !threadId || !messageId) {
      console.warn("Missing required IDs for recursive history fetch");
      return;
    }

    const fetchRecursiveHistory = async () => {
      try {
        await dispatch(
          getRecursiveHistoryAction({
            agent_id: bridgeId,
            thread_id: threadId,
            message_id: messageId,
          })
        );
      } catch (error) {
        console.error("❌ Error fetching recursive history:", error);
      }
    };

    fetchRecursiveHistory();
  }, [bridgeId, threadId, messageId, dispatch]);

  const normalizeToolCalls = (toolData) => {
    if (!toolData) return [];
    if (Array.isArray(toolData)) {
      if (toolData.length === 0) return [];
      return toolData.flatMap((toolSet) => Object.values(toolSet || {}));
    }
    if (typeof toolData === "object") {
      return Object.values(toolData);
    }
    return [];
  };

  const toolCalls = useMemo(() => {
    return normalizeToolCalls(recursiveMessage?.tools_call_data);
  }, [recursiveMessage?.tools_call_data]);

  const getToolType = (tool) => {
    if (tool?.data?.metadata?.type) return tool.data.metadata.type;
    if (tool?.message_id || tool?.bridge_id || tool?.thread_id) return "agent";
    if (Array.isArray(tool?.tools_call_data)) return "agent";
    return null;
  };

  const buildToolNode = (tool) => {
    const toolType = getToolType(tool);
    const functionData = {
      id: tool?.id ?? null,
      args: tool?.args ?? (tool?.user ? { _query: tool.user } : {}),
      data: tool?.data ?? (toolType ? { metadata: { type: toolType }, response: tool } : { response: tool }),
    };

    if (toolType === "agent") {
      const childMessage = tool?.data?.response || tool?.response || tool || null;
      const childTools = normalizeToolCalls(childMessage?.tools_call_data);
      return {
        name: tool?.name || tool?.AiConfig?.model || tool?.bridge_id || "Unknown Agent",
        functionData,
        nodeType: "agent",
        children: childTools.map(buildToolNode),
      };
    }

    return {
      name: tool?.name || "Unknown Tool",
      nodeType: "tool",
      functionData,
      children: [],
    };
  };

  const derivedAgents = useMemo(() => {
    if (toolCalls.length === 0) return [];

    const orderedTools = toolCalls;
    const agents = [];
    let currentAgent = null;

    orderedTools.forEach((tool) => {
      const toolType = getToolType(tool);
      const functionData = {
        id: tool?.id ?? null,
        args: tool?.args ?? (tool?.user ? { _query: tool.user } : {}),
        data: tool?.data ?? (toolType ? { metadata: { type: toolType }, response: tool } : { response: tool }),
      };

      if (toolType === "agent") {
        const childMessage = tool?.data?.response || tool?.response || tool || null;
        const childToolCalls = normalizeToolCalls(childMessage?.tools_call_data);
        const childParallelTools = childToolCalls.map(buildToolNode);

        currentAgent = {
          name: tool?.name || tool?.AiConfig?.model || tool?.bridge_id || "Unknown Agent",
          functionData,
          nodeType: "agent",
          parallelTools: childParallelTools,
          isLoading: recursiveHistoryLoading && childParallelTools.length === 0,
        };
        agents.push(currentAgent);
        return;
      }

      if (toolType === "function") {
        if (!currentAgent) {
          currentAgent = {
            name: "FUNCTIONS",
            functionData: null,
            parallelTools: [],
          };
          agents.push(currentAgent);
        }
        currentAgent.parallelTools.push({
          name: tool?.name || "Unknown Tool",
          functionData,
        });
      }
    });
    return agents;
  }, [toolCalls, recursiveHistoryLoading]);

  const directCallCounts = useMemo(() => {
    if (toolCalls.length === 0) return { agentCount: 0, toolCount: 0 };
    const agentCount = toolCalls.filter((tool) => getToolType(tool) === "agent").length;
    const toolCount = toolCalls.filter((tool) => getToolType(tool) === "function").length;
    return { agentCount, toolCount };
  }, [toolCalls]);
  const mainAgentTools = useMemo(() => {
    if (toolCalls.length === 0) return [];

    const data = toolCalls
      .filter((tool) => getToolType(tool) === "function")
      .map((tool) => ({
        name: tool?.name || "Unknown Tool",
        functionData: {
          id: tool?.id ?? null,
          args: tool?.args ?? {},
          data: tool?.data ?? {},
        },
      }));

    return data;
  }, [toolCalls]);

  const handleToolPrimaryClick = useCallback(
    (tool) => {
      if (!tool) return;
      const flowHitId = tool?.data?.metadata?.flowHitId;
      if (typeof window !== "undefined" && window.openViasocket) {
        window.openViasocket(tool?.id, {
          flowHitId,
          embedToken,
          meta: {
            type: "tool",
            bridge_id: bridgeId,
          },
        });
        return;
      }
      setSelectedTool(tool);
    },
    [embedToken, bridgeId]
  );

  // Store edges at component level so they can be accessed by edges memo
  const treeEdgesRef = React.useRef([]);

  const nodes = useMemo(() => {
    const baseX = 650;
    const levelGap = 400; // Horizontal gap between tree levels
    const baseRowHeight = 160; // Base node height estimate
    const verticalPadding = 80; // Extra spacing between sibling subtrees
    const alignY = 150; // Y position for root level

    const allNodes = [];
    const allEdges = [];
    let nodeIdCounter = 0;

    const getAgentToolList = (agent) => {
      if (Array.isArray(agent?.parallelTools)) return agent.parallelTools;
      if (Array.isArray(agent?.children)) return agent.children;
      return [];
    };

    const getChildAgents = (agent) => getAgentToolList(agent).filter((tool) => tool?.nodeType === "agent");

    const getToolsForDisplay = (agent) => getAgentToolList(agent).filter((tool) => tool?.nodeType !== "agent");

    const estimateNodeHeight = (agent) => {
      const tools = getToolsForDisplay(agent);
      const toolCount = tools.length;
      if (toolCount === 0) return baseRowHeight;
      const rows = Math.ceil(toolCount / 2);
      const toolSection = 36 + rows * 42;
      return baseRowHeight + toolSection;
    };

    const getSubtreeHeight = (agent) => {
      const children = getChildAgents(agent);
      const nodeHeight = estimateNodeHeight(agent);
      const minHeight = nodeHeight + verticalPadding;
      if (children.length === 0) return minHeight;
      return Math.max(
        minHeight,
        children.reduce((sum, child) => sum + getSubtreeHeight(child), 0)
      );
    };

    // Recursive function to build tree nodes
    const buildTreeNodes = (agent, parentId, level, yOffset) => {
      const nodeId = `agent-${nodeIdCounter++}`;
      const x = baseX + level * levelGap;
      const childAgents = getChildAgents(agent);
      const toolsForDisplay = getToolsForDisplay(agent);
      const subtreeHeight = getSubtreeHeight(agent);
      const nodeHeight = estimateNodeHeight(agent);
      const y = yOffset + subtreeHeight / 2 - nodeHeight / 2;

      // Create node for this agent using BatchUI
      allNodes.push({
        id: nodeId,
        type: "generic",
        position: { x, y },
        data: {
          source: childAgents.length > 0,
          target: level > 0,
          ui: {
            width: 320,
            containerClass: "border border-base-300 p-3 bg-base-100",
            render: () => (
              <BatchUI
                agents={[
                  {
                    name: agent.name,
                    functionData: agent.functionData,
                    parallelTools: toolsForDisplay, // Only direct tools, no child agents
                    isLoading: agent.isLoading,
                    nodeType: agent.nodeType,
                  },
                ]}
                onToolClick={(tool) => {
                  setSelectedTool(tool);
                  toggleSidebar("tool-full-slider", "right");
                }}
                onToolSliderClick={(tool) => handleToolPrimaryClick(tool)}
              />
            ),
          },
        },
      });

      // Create edge from parent to this node
      if (parentId) {
        allEdges.push({
          id: `e-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          style: {
            stroke: "#22c55e",
            strokeWidth: 2,
            animated: true,
          },
          animated: true,
        });
      }

      // Recursively build nodes for child agents (they become separate nodes)
      if (childAgents.length > 0) {
        let runningOffset = yOffset;
        childAgents.forEach((childAgent) => {
          buildTreeNodes(childAgent, nodeId, level + 1, runningOffset);
          runningOffset += getSubtreeHeight(childAgent);
        });
      }

      return nodeId;
    };

    // Build the tree starting from derived agents
    if (derivedAgents.length > 0) {
      const totalTreeHeight = derivedAgents.reduce((sum, agent) => sum + getSubtreeHeight(agent), 0);
      let runningOffset = alignY - totalTreeHeight / 2;
      derivedAgents.forEach((agent) => {
        buildTreeNodes(agent, "2", 1, runningOffset);
        runningOffset += getSubtreeHeight(agent);
      });
    }

    // Store edges for use in edges memo
    treeEdgesRef.current = allEdges;

    return [
      {
        id: "1",
        type: "generic",
        position: { x: 0, y: alignY },
        data: {
          source: true,
          ui: {
            width: 260,
            containerClass: "p-4 border border-base-300 ",
            render: () => <UserPromptUI text={recursiveMessage?.user || ""} />,
          },
        },
      },
      {
        id: "2",
        type: "generic",
        position: { x: 320, y: alignY },
        data: {
          source: true,
          target: true,
          ui: {
            width: 320,
            containerClass: "p-4 border border-base-300 ",
            render: () => (
              <MainAgentUI
                name={mainAgentName}
                onToolClick={(tool) => {
                  setSelectedTool(tool);
                  toggleSidebar("tool-full-slider", "right");
                }}
                onToolSliderClick={(tool) => handleToolPrimaryClick(tool)}
                onResponseClick={() => {
                  setSelectedResponse(recursiveMessage);
                  toggleSidebar("response-full-slider", "right");
                }}
                responsePreview={responsePreview}
                tools={mainAgentTools}
                agentCount={directCallCounts.agentCount}
                toolCount={directCallCounts.toolCount}
              />
            ),
          },
        },
      },
      ...allNodes,
    ];
  }, [derivedAgents, mainAgentTools, recursiveMessage?.user, mainAgentName, responsePreview, recursiveMessage]);

  const edges = useMemo(() => {
    const edgeStyle = {
      stroke: "#22c55e", // Green color
      strokeWidth: 2,
      animated: true,
    };

    // Start with the edge from User Prompt to Main Agent
    const edgeList = [
      {
        id: "e1-2",
        source: "1",
        target: "2",
        style: edgeStyle,
        animated: true,
      },
      // Add all the tree edges collected during node building
      ...treeEdgesRef.current,
    ];

    return edgeList;
  }, [derivedAgents.length]);

  const handleGoBack = () => {
    const searchParams = new URLSearchParams();
    if (versionId) searchParams.set("version", versionId);
    searchParams.set("type", "chatbot");
    const query = searchParams.toString();
    router.push(`/org/${orgId}/agents/history/${bridgeId}${query ? `?${query}` : ""}`);
  };

  return (
    <div className="h-screen w-full relative bg-base-200 flex flex-col">
      {/* Navbar */}
      <div className="bg-base-100 border-b border-base-300 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-base-content">Agent Execution Flow</h1>
          <span className="text-base-content/40">•</span>
          <p className="text-sm text-base-content/60">
            Executed {recursiveMessage?.created_at ? formatRelativeTime(recursiveMessage.created_at) : "recently"}
          </p>
        </div>
        <button onClick={handleGoBack} className="text-base-content hover:text-primary transition-colors" title="Close">
          <X size={24} />
        </button>
      </div>

      {/* ReactFlow Container */}
      <div className="flex-1 relative">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
          <Background />
        </ReactFlow>
      </div>

      <ToolFullSlider
        tool={selectedTool}
        onClose={() => {
          toggleSidebar("tool-full-slider", "right");
          setSelectedTool(null);
        }}
        onBack={handleGoBack}
      />

      <ResponseFullSlider
        response={selectedResponse}
        onClose={() => {
          toggleSidebar("response-full-slider", "right");
          setSelectedResponse(null);
        }}
        onBack={handleGoBack}
      />

      {/* Close Button - Bottom Right */}
      <button
        onClick={handleGoBack}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-md hover:bg-primary/80 shadow-lg transition-all"
      >
        <ArrowLeft size={16} />
        <span className="text-sm font-medium">GO BACK</span>
      </button>
    </div>
  );
}
