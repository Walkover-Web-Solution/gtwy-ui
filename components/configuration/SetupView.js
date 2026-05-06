import { memo } from "react";
import NonImageModelConfig from "./NonImageModelConfig";
import ConnectedAgentFlowPanel from "./ConnectedAgentFlowPanel";

const SetupView = memo(
  ({
    currentView,
    switchView,
    params,
    searchParams,
    isEmbedUser,
    isPublished,
    isEditor,
    apiKeySectionRef,
    promptTextAreaRef,
    uiState,
    updateUiState,
    promptState,
    setPromptState,
    handleCloseTextAreaFocus,
    savePrompt,
    isMobileView,
    closeHelperButtonLocation,
    apiKeyError,
    setApiKeyError,
  }) => {
    if (currentView === "agent-flow") {
      return (
        <ConnectedAgentFlowPanel
          params={params}
          searchParams={searchParams}
          switchView={switchView}
          currentView={currentView}
        />
      );
    }

    return (
      <NonImageModelConfig
        params={params}
        searchParams={searchParams}
        isEmbedUser={isEmbedUser}
        isPublished={isPublished}
        isEditor={isEditor}
        apiKeySectionRef={apiKeySectionRef}
        promptTextAreaRef={promptTextAreaRef}
        uiState={uiState}
        updateUiState={updateUiState}
        promptState={promptState}
        setPromptState={setPromptState}
        handleCloseTextAreaFocus={handleCloseTextAreaFocus}
        savePrompt={savePrompt}
        isMobileView={isMobileView}
        closeHelperButtonLocation={closeHelperButtonLocation}
        apiKeyError={apiKeyError}
        setApiKeyError={setApiKeyError}
        currentView={currentView}
        switchView={switchView}
      />
    );
  }
);

SetupView.displayName = "SetupView";

export default SetupView;
