import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getTutorialDataAction } from "@/store/action/flowDataAction";

/**
 * Custom hook to manage dynamic tutorial videos from Redux
 * Provides dynamic video content from API instead of static videos
 */
const useTutorialVideos = () => {
  const dispatch = useDispatch();

  // Get tutorial data from Redux store
  const tutorialData = useCustomSelector((state) => state?.flowDataReducer?.flowData?.tutorialData || []);

  // Load tutorial data on hook initialization
  useEffect(() => {
    if (!tutorialData || tutorialData.length === 0) {
      dispatch(getTutorialDataAction());
    }
  }, [dispatch, tutorialData]);

  // Generic helper function to get tutorial videos
  const getTutorialVideo = (tutorialType) => {
    const tutorial = tutorialData?.find((tutorial) => {
      const title = tutorial?.title?.toLowerCase() || "";
      const type = tutorial?.type?.toLowerCase() || "";
      switch (tutorialType) {
        case "bridge_creation":
        case "agent_creation":
          return (
            title.includes("agent") ||
            title.includes("bridge") ||
            type === "bridge_creation" ||
            type === "agent_creation"
          );

        case "function_creation":
        case "tool_creation":
          return (
            title.includes("function") ||
            title.includes("tool") ||
            type === "function_creation" ||
            type === "tool_creation"
          );

        case "knowledge_base":
        case "knowledgebase":
          return (
            title.includes("knowledge") || title.includes("kb") || type === "knowledge_base" || type === "knowledgebase"
          );

        case "parameter_setup":
        case "advanced_parameter":
          return (
            title.includes("parameter") ||
            title.includes("config") ||
            type === "parameter_setup" ||
            type === "advanced_parameter"
          );

        case "variable_management":
        case "add_variables":
          return (
            title.includes("variable") ||
            title.includes("path") ||
            type === "variable_management" ||
            type === "add_variables"
          );

        case "pauth_key":
        case "api_key":
          return (
            title.includes("pauth") ||
            title.includes("key") ||
            title.includes("auth") ||
            type === "pauth_key" ||
            type === "api_key"
          );

        case "test_cases":
        case "testing":
          return title.includes("test") || title.includes("case") || type === "test_cases" || type === "testing";

        default:
          return type === tutorialType || title.includes(tutorialType);
      }
    });

    return tutorial?.videoUrl;
  };

  // Specific video getter functions for different tutorial types
  const getVideos = () => ({
    bridgeCreation: getTutorialVideo("bridge_creation"),
    FunctionCreation: getTutorialVideo("function_creation"),
    knowledgeBase: getTutorialVideo("knowledge_base"),
    AdvanceParameter: getTutorialVideo("advanced_parameter"),
    Addvariables: getTutorialVideo("variable_management"),
    PauthKey: getTutorialVideo("pauth_key"),
    TestCases: getTutorialVideo("test_cases"),

    // Individual getter functions for direct use
    getBridgeCreationVideo: () => getTutorialVideo("bridge_creation"),
    getFunctionCreationVideo: () => getTutorialVideo("function_creation"),
    getKnowledgeBaseVideo: () => getTutorialVideo("knowledge_base"),
    getAdvanceParameterVideo: () => getTutorialVideo("advanced_parameter"),
    getAddVariablesVideo: () => getTutorialVideo("variable_management"),
    getPauthKeyVideo: () => getTutorialVideo("pauth_key"),
    getTestCasesVideo: () => getTutorialVideo("test_cases"),
  });

  return {
    tutorialData,
    getTutorialVideo,
    ...getVideos(),
  };
};

export default useTutorialVideos;
