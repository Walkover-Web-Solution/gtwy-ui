import { memo } from "react";
import NonImageModelConfig from "./NonImageModelConfig";
import ConnectedAgentFlowPanel from "./ConnectedAgentFlowPanel";
import { useConfigurationContext } from "./ConfigurationContext";

const SetupView = memo(() => {
  const { currentView } = useConfigurationContext();

  // Render agent flow panel when view is 'agent-flow'
  if (currentView === "agent-flow") {
    return <ConnectedAgentFlowPanel />;
  }

  // Use unified configuration for all model types
  // Individual tabs will handle feature availability based on validationConfig
  return <NonImageModelConfig />;
});

SetupView.displayName = "SetupView";

export default SetupView;
