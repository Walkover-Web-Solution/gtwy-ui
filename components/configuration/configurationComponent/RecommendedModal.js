import { modelSuggestionApi } from "@/config/index";
import { useCustomSelector } from "@/customHooks/customSelector";
import React, { useState, useCallback } from "react";

const RecommendedModal = ({
  apiKeySectionRef,
  promptTextAreaRef,
  searchParams,
  bridgeApiKey,
  params,
  shouldPromptShow,
  service,
  deafultApiKeys,
  isPublished,
  isEditor,
}) => {
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [modelRecommendations, setModelRecommendations] = useState(null);
  const { prompt } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const isPublished = searchParams?.isPublished === "true";

    // Use published data if isPublished=true, otherwise use version data

    return {
      prompt: isPublished ? bridgeDataFromState?.configuration?.prompt || "" : versionData?.configuration?.prompt || "",
    };
  });
  const setErrorBorder = (ref, selector, scrollToView = false) => {
    if (ref?.current) {
      if (scrollToView) {
        ref.current.scrollIntoView({ behavior: "smooth" });
      }
      setTimeout(() => {
        const element = ref.current.querySelector(selector);
        if (element) {
          element.focus();
          element.style.borderColor = "red";
        }
      }, 300);
    }
  };
  const handleGetRecommendations = useCallback(async () => {
    setIsLoadingRecommendations(true);

    try {
      // Convert prompt to string safely (handles both string and object formats)
      const promptText =
        typeof prompt === "string"
          ? prompt
          : prompt?.customPrompt ||
            [
              prompt?.role ? `Role: ${prompt.role}` : null,
              prompt?.goal ? `Goal: ${prompt.goal}` : null,
              prompt?.instruction ? `Instructions: ${prompt.instruction}` : null,
            ]
              .filter(Boolean)
              .join("\n\n") ||
            "";
      const currentPrompt = promptTextAreaRef.current?.querySelector("textarea")?.value?.trim() || promptText.trim();
      if (((bridgeApiKey || deafultApiKeys) && currentPrompt !== "") || service === "ai_ml") {
        const response = await modelSuggestionApi({ versionId: searchParams?.version });
        if (response?.success) {
          setModelRecommendations({
            service: response.data.service,
            model: response.data.model,
            session_id: response.data.session_id,
          });
        } else {
          setModelRecommendations({ error: "Failed to get model recommendations." });
        }
      } else {
        if (currentPrompt === "") {
          setModelRecommendations({ error: "Prompt is missing. Please enter a prompt" });
          setErrorBorder(promptTextAreaRef, "textarea", true);
        } else {
          setModelRecommendations({ error: "API key is missing. Please add an API key" });
          setErrorBorder(apiKeySectionRef, "select", true);
        }
      }
    } catch (error) {
      console.error("Error fetching recommended model:", error);
      setModelRecommendations({ error: "Error fetching recommended model" });
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [bridgeApiKey, params?.version, promptTextAreaRef, apiKeySectionRef]);
  return (
    <div className="relative">
      {shouldPromptShow && (
        <>
          <button
            data-testid="get-recommended-model-button"
            id="get-recommended-model-button"
            className="flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGetRecommendations}
            disabled={isLoadingRecommendations || isPublished || !isEditor}
          >
            {isLoadingRecommendations ? "Loading..." : "Get Recommended Model"}
          </button>

          {modelRecommendations && (
            <div className="absolute right-0 top-full z-high mt-2 w-72 p-4 bg-base-100 border border-base-300 shadow-lg">
              {modelRecommendations.error ? (
                <p className="text-error text-sm">{modelRecommendations.error}</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="text-base-content">
                    <span className="font-medium">Recommended Provider:</span> {modelRecommendations?.service}
                  </p>
                  <p className="text-base-content">
                    <span className="font-medium">Recommended Model:</span> {modelRecommendations?.model}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecommendedModal;
