// OptimizePromptModal.jsx
import { optimizePromptApi } from "@/config/index";
import { useCustomSelector } from "@/customHooks/customSelector";
import { optimizePromptReducer } from "@/store/reducer/bridgeReducer";
import { MODAL_TYPE } from "@/utils/enums";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import OptimiseBaseModal from "./OptimiseBaseModal";

function OptimizePromptModal({ savePrompt, setPrompt, params, searchParams, messages, setMessages, thread_id }) {
  const dispatch = useDispatch();
  const { prompt, optimizePromptHistory } = useCustomSelector((state) => ({
    prompt:
      state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.configuration?.prompt || "",
    optimizePromptHistory: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.optimizePromptHistory || [],
  }));
  const [promptHistory, setPromptHistory] = useState(optimizePromptHistory);
  const [currentIndex, setCurrentIndex] = useState(optimizePromptHistory.length - 1);

  useEffect(() => {
    setPromptHistory(optimizePromptHistory);
    setCurrentIndex(optimizePromptHistory.length - 1);
  }, [optimizePromptHistory]);

  const handleOptimizeApi = async (instructionText, params, searchParams) => {
    const response = await optimizePromptApi({
      query: instructionText,
      thread_id,
      bridge_id: params.id,
      version_id: searchParams?.version,
    });

    const result = typeof response === "string" ? JSON.parse(response) : (response?.data ?? response);
    dispatch(optimizePromptReducer({ bridgeId: params.id, prompt: result?.updated }));
    return result;
  };

  const handleApply = async (promptToInsert) => {
    savePrompt(promptToInsert);
    setPrompt(promptToInsert);
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      return promptHistory[currentIndex - 1];
    }
  };

  const handleRedo = () => {
    if (currentIndex < promptHistory.length) {
      setCurrentIndex(currentIndex + 1);
      return promptHistory[currentIndex + 1];
    }
  };

  const handleClose = () => {
    setCurrentIndex(optimizePromptHistory.length);
  };

  return (
    <OptimiseBaseModal
      modalType={MODAL_TYPE.OPTIMIZE_PROMPT}
      title="Improve prompt"
      contentLabel="Prompt"
      content={prompt}
      optimizeApi={handleOptimizeApi}
      onApply={handleApply}
      onClose={handleClose}
      params={params}
      searchParams={searchParams}
      messages={messages}
      setMessages={setMessages}
      showHistory={true}
      history={promptHistory}
      setCurrentIndex={setCurrentIndex}
      currentIndex={currentIndex}
      onUndo={handleUndo}
      onRedo={handleRedo}
    />
  );
}

export default React.memo(OptimizePromptModal);
