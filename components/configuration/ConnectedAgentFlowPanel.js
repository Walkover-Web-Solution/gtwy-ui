import dynamic from "next/dynamic";
import { useMemo, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { createNodesFromAgentDoc } from "@/components/FlowDataManager";
import { useConfigurationContext } from "./ConfigurationContext";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getConnectedAgentFlowAction } from "@/store/action/orchestralFlowAction";
import { getFromCookies } from "@/utils/utility";
import Protected from "../Protected";

const AgentToAgentConnection = dynamic(() => import("@/components/AgentToAgentConnection"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px]">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  ),
});

const buildDocFromFlow = (flowData, params, bridgeType, bridgeData, allBridges) => {
  // If no flow data, create a default structure with just the master agent
  if (!flowData) {
    const masterBridge = bridgeData || allBridges?.find((b) => b._id === params?.id);
    const defaultAgentData = {
      [params?.id]: {
        agent_name: masterBridge?.name || masterBridge?.slugName || `Agent_${params?.id}`,
        parentAgents: [],
        childAgents: [],
        thread_id: false,
        description: masterBridge?.description || "Master Agent",
        bridgeData: masterBridge, // Include bridge data
      },
    };
    return createNodesFromAgentDoc(defaultAgentData, allBridges);
  }

  // If already processed (has nodes and edges), return as is
  if (flowData?.nodes && flowData?.edges) {
    return flowData;
  }

  // Process the new data structure with bridge data mapping
  const enrichedFlowData = enrichFlowDataWithBridges(flowData, allBridges);
  return createNodesFromAgentDoc(enrichedFlowData, allBridges);
};

// Helper function to enrich flow data with bridge information
const enrichFlowDataWithBridges = (flowData, allBridges) => {
  const enrichedData = {};

  Object.entries(flowData).forEach(([agentId, agentData]) => {
    // Find corresponding bridge data - try multiple approaches
    let bridgeInfo = allBridges?.find((bridge) => bridge._id === agentId);

    // If not found by _id, try to find by versions array (for version IDs)
    if (!bridgeInfo) {
      bridgeInfo = allBridges?.find((bridge) => bridge.versions && bridge.versions.includes(agentId));
    }

    enrichedData[agentId] = {
      ...agentData,
      // Enhance with bridge data
      agent_name: agentData.agent_name || bridgeInfo?.name || bridgeInfo?.slugName || `Agent_${agentId}`,
      description: agentData.description || bridgeInfo?.description || "",
      bridgeData: bridgeInfo, // Include full bridge data
      // Map child agents with their bridge data
      childAgents: (agentData.childAgents || []).map((childId) => {
        let childBridge = allBridges?.find((b) => b._id === childId);
        // Try versions array if not found by _id
        if (!childBridge) {
          childBridge = allBridges?.find((b) => b.versions && b.versions.includes(childId));
        }
        return {
          id: childId,
          name: childBridge?.name || childBridge?.slugName || `Agent_${childId}`,
          bridgeData: childBridge,
        };
      }),
      // Map parent agents with their bridge data
      parentAgents: (agentData.parentAgents || []).map((parentId) => {
        let parentBridge = allBridges?.find((b) => b._id === parentId);
        // Try versions array if not found by _id
        if (!parentBridge) {
          parentBridge = allBridges?.find((b) => b.versions && b.versions.includes(parentId));
        }
        return {
          id: parentId,
          name: parentBridge?.name || parentBridge?.slugName || `Agent_${parentId}`,
          bridgeData: parentBridge,
        };
      }),
    };
  });

  return enrichedData;
};

const formatAgentsForPersist = (agents = {}) =>
  Object.entries(agents).reduce((acc, [id, agent]) => {
    if (!agent) return acc;
    acc[id] = {
      agent_name: agent.name,
      description: agent.description,
      parentAgents: agent.parentAgents || [],
      childAgents: agent.childAgents || [],
      thread_id: agent.thread_id ?? false,
      variables: agent.variables || {},
      variables_path: agent.variables_path || {},
    };
    return acc;
  }, {});

const ConnectedAgentFlowPanel = ({ isEmbedUser }) => {
  const dispatch = useDispatch();
  const { params, searchParams, bridgeType, connectedAgentFlow, bridgeName, switchView, currentView } =
    useConfigurationContext();
  const { apiConnectedAgentFlow, bridgeData, allBridges } = useCustomSelector((state) => ({
    apiConnectedAgentFlow:
      state.orchestralFlowReducer.connectedAgentFlowByBridge?.[params?.org_id]?.[params?.id]?.[searchParams?.version] ||
      null,
    bridgeData: state.bridgeReducer?.org?.[params?.org_id]?.orgs?.find((bridge) => bridge._id === params?.id) || null,
    allBridges: state.bridgeReducer?.org?.[params?.org_id]?.orgs || [],
  }));
  useEffect(() => {
    if (currentView === "agent-flow" && searchParams?.version) {
      dispatch(
        getConnectedAgentFlowAction({
          orgId: params.org_id,
          bridgeId: params.id,
          versionId: searchParams.version,
        })
      );
    }
  }, [currentView, searchParams.version, apiConnectedAgentFlow, params.org_id, params.id]);

  const effectiveFlow = apiConnectedAgentFlow || connectedAgentFlow;

  const processedFlow = useMemo(() => {
    const result = buildDocFromFlow(effectiveFlow, params, bridgeType, bridgeData, allBridges);
    return result;
  }, [effectiveFlow, params, bridgeType, bridgeData, allBridges]);

  const handleFlowSave = useCallback(
    async (agentStructure) => {
      if (!params?.id || !searchParams?.version) return;

      const payload = {
        master_agent: agentStructure?.master_agent || params.id,
        bridge_type: bridgeType,
        flow_name: agentStructure?.flow_name || bridgeName || "Agent Flow",
        flow_description: agentStructure?.flow_description || "",
        status: agentStructure?.status || "draft",
        agents: formatAgentsForPersist(agentStructure?.agents || {}),
      };

      await dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams.version,
          dataToSend: {
            connected_agent_flow: payload,
          },
        })
      );
    },
    [dispatch, params, searchParams, bridgeType, bridgeName]
  );
  useEffect(() => {
    const existingScript = document.getElementById("gtwy-user-script");
    if (existingScript || isEmbedUser) return;

    if (params?.org_id) {
      const scriptId = "gtwy-user-script";
      const scriptURl =
        process.env.NEXT_PUBLIC_ENV !== "PROD"
          ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy_dev.js`
          : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/gtwy.js`;
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = scriptURl;
      script.setAttribute("skipLoadGtwy", true);
      script.setAttribute("token", getFromCookies("local_token"));
      script.setAttribute("org_id", params?.org_id);
      script.setAttribute("customIframeId", "gtwyEmbedInterface");
      script.setAttribute("gtwy_user", true);
      script.setAttribute("parentId", "gtwy");
      script.setAttribute("hideHeader", true);
      document.head.appendChild(script);
    }

    return () => {
      const script = document.getElementById("gtwy-user-script");
      if (script) {
        sessionStorage.removeItem("orchestralUser");
      }
    };
  }, [params]);

  return (
    <div id="connected-agent-flow-panel" className="w-full">
      <div className="flex justify-end mb-2">
        <button
          id="agent-flow-back-button"
          className="btn btn-xs btn-outline gap-1"
          onClick={() => switchView?.("config")}
        >
          ⬅ Back to Config
        </button>
      </div>
      <div
        id="agent-flow-canvas-container"
        className="w-full h-[calc(100vh-8rem)] min-h-[600px] border border-base-200 rounded-xl overflow-hidden bg-base-50"
      >
        <AgentToAgentConnection
          params={{ ...params, bridgeId: params.id }}
          searchParams={searchParams}
          orchestralData={processedFlow}
          discardedData={processedFlow}
          name={bridgeName || "Agent Flow"}
          description=""
          createdFlow={Boolean(effectiveFlow)}
          setIsLoading={() => {}}
          isEmbedUser={false}
          mode="connected"
          onConnectedFlowSave={handleFlowSave}
        />
      </div>
    </div>
  );
};

export default Protected(ConnectedAgentFlowPanel);
