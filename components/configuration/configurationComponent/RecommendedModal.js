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
      const currentPrompt = promptTextAreaRef.current?.querySelector("textarea")?.value?.trim() || prompt.trim();
      if (((bridgeApiKey || deafultApiKeys) && currentPrompt !== "") || service === "ai_ml") {
        const response = await modelSuggestionApi({ versionId: searchParams?.version });
        if (response?.success) {
          setModelRecommendations({
            available: {
              service: response.data.available.service,
              model: response.data.available.model,
            },
            unavailable: {
              service: response.data.unavailable.service,
              model: response.data.unavailable.model,
            },
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
    <div>
      <div className="flex flex-col gap-3">
        {shouldPromptShow && (
          <div className="flex flex-col items-start gap-2">
            <button
              id="get-recommended-model-button"
              className="flex items-center gap-2  rounded-md bg-gradient-to-r from-blue-800 to-orange-600 text-sm text-transparent bg-clip-text hover:opacity-80 transition-opacity"
              onClick={handleGetRecommendations}
              disabled={isLoadingRecommendations || isPublished || !isEditor}
            >
              {isLoadingRecommendations ? "Loading..." : "Get Recommended Model"}
            </button>

            {modelRecommendations && (
              <div className="p-4 bg-base-100 rounded-lg border border-base-300 w-full mb-2">
                {modelRecommendations.error ? (
                  <p className="text-red-500 text-sm">{modelRecommendations.error}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-base-content">
                      <span className="font-medium">Recommended Provider:</span>{" "}
                      {modelRecommendations?.available?.service}
                    </p>
                    <p className="text-base-content">
                      <span className="font-medium">Recommended Model:</span> {modelRecommendations?.available?.model}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedModal;
