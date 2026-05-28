import React, { useState, useEffect } from "react";
import { CircleAlertIcon, RocketIcon, SparklesIcon, CheckIcon } from "@/components/Icons";
import { AGENT_SETUP_GUIDE_STEPS } from "@/utils/enums";
import { useCustomSelector } from "@/customHooks/customSelector";
import Protected from "./Protected";

const AgentSetupGuide = ({
  params = {},
  apiKeySectionRef,
  promptTextAreaRef,
  isEmbedUser,
  searchParams,
  onVisibilityChange = () => {},
  onSwitchToModelTab = () => {},
  onSwitchToPromptTab = () => {},
  onSwitchToConnectorsTab = () => {},
  setApiKeyError = () => {},
}) => {
  const { bridgeApiKey, prompt, shouldPromptShow, service, showDefaultApikeys, modelName, bridgeType, embedFields } =
    useCustomSelector((state) => {
      const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
      const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
      const isPublished = searchParams?.isPublished === "true";

      // Use published data if isPublished=true, otherwise use version data
      const dataSource = isPublished ? bridgeDataFromState : versionData;
      const service = dataSource?.service;
      const modelReducer = state?.modelReducer?.serviceModels;
      const serviceName = dataSource?.service;
      const modelTypeName = dataSource?.configuration?.type?.toLowerCase();
      const modelName = dataSource?.configuration?.model;
      const showDefaultApikeys = state.appInfoReducer.embedUserDetails.addDefaultApiKeys;

      return {
        bridgeApiKey: isPublished
          ? bridgeDataFromState?.apikey_object_id?.[service]
          : versionData?.apikey_object_id?.[service],
        prompt: isPublished
          ? bridgeDataFromState?.configuration?.prompt || ""
          : versionData?.configuration?.prompt || "",
        shouldPromptShow: modelReducer?.[serviceName]?.[modelTypeName]?.[modelName]?.validationConfig?.system_prompt,
        service: service,
        showDefaultApikeys,
        modelName: modelName,
        bridgeType: bridgeDataFromState?.bridgeType,
        embedFields: state.appInfoReducer.embedUserDetails?.prompt?.embedFields || [],
      };
    });

  // Helper to check if prompt has meaningful content
  const hasPromptContent = (promptValue) => {
    if (!promptValue) return false;
    if (typeof promptValue === "string") return promptValue.trim() !== "";
    if (typeof promptValue === "object") {
      return Object.values(promptValue).some((v) => typeof v === "string" && v.trim() !== "");
    }
    return false;
  };

  const [isAnimating, setIsAnimating] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorType, setErrorType] = useState("");
  const [isVisible, setIsVisible] = useState(() => {
    if (hasPromptContent(prompt)) return false;
    if (isEmbedUser && showDefaultApikeys) return true;
    return !bridgeApiKey;
  });
  // Track step completion
  const getStepCompletion = (stepNumber) => {
    switch (stepNumber) {
      case "1": // Define Agent's Purpose
        return hasPromptContent(prompt);
      case "2": // Configure API Access
        return !!bridgeApiKey || showDefaultApikeys || (modelName === "gpt-5-nano" && bridgeType === "chatbot");
      case "3": // Connect External Functions (optional)
        return true; // Always considered complete since it's optional
      case "4": // Choose AI Service (optional)
        return !!service;
      case "5": // Select Model (optional)
        return !!modelName;
      default:
        return false;
    }
  };

  useEffect(() => {
    // Embed user with default API keys: hide only when prompt has content
    if (isEmbedUser && showDefaultApikeys) {
      if (hasPromptContent(prompt)) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      return;
    }

    const hasPrompt = hasPromptContent(prompt);
    const hasApiKey = !!bridgeApiKey;

    if (hasPrompt || !shouldPromptShow) {
      setShowError(false);
      setErrorType("");
      if (promptTextAreaRef?.current) {
        promptTextAreaRef.current.querySelectorAll("input, textarea").forEach((el) => {
          el.style.borderColor = "";
        });
      }
    }
    if (hasApiKey) {
      setShowError(false);
      setErrorType("");
      setApiKeyError(false);
    }

    const promptRequired = shouldPromptShow !== false;
    const shouldHide = promptRequired ? hasPrompt && hasApiKey : hasApiKey;

    if (shouldHide) {
      if (isVisible) {
        setIsAnimating(true);
        setTimeout(() => {
          setIsVisible(false);
          setIsAnimating(false);
        }, 300);
      }
    } else {
      setIsVisible(true);
    }
  }, [bridgeApiKey, prompt, shouldPromptShow, showDefaultApikeys]);

  useEffect(() => {
    if (typeof onVisibilityChange === "function") {
      onVisibilityChange(isVisible);
    }
  }, [isVisible, onVisibilityChange]);

  const handleStart = () => {
    if (shouldPromptShow && !hasPromptContent(prompt)) {
      setShowError(true);
      setErrorType("prompt");
      const applyPromptFieldErrors = () => {
        if (!promptTextAreaRef?.current) return;
        const fields = promptTextAreaRef.current.querySelectorAll("input, textarea");
        fields.forEach((el) => {
          el.style.borderColor = "red";
        });
        const firstEl = fields[0];
        if (firstEl) {
          firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
          firstEl.focus();
        }
      };
      if (!promptTextAreaRef?.current) {
        onSwitchToPromptTab();
        setTimeout(applyPromptFieldErrors, 400);
      } else {
        applyPromptFieldErrors();
      }
      return;
    }
    if (!bridgeApiKey && !(modelName === "gpt-5-nano" && bridgeType === "chatbot")) {
      setShowError(true);
      setErrorType("apikey");
      onSwitchToModelTab();
      setApiKeyError(true);
      setTimeout(() => {
        if (apiKeySectionRef?.current) {
          apiKeySectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 400);
      return;
    }

    // Smooth transition when hiding
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
    }, 300);
  };
  if (!isVisible) return null;

  return (
    <div
      data-testid="agent-setup-guide-container"
      id="agent-setup-guide-container"
      className={`w-full h-full z-very-low bg-base-300 overflow-hidden relative transition-all duration-300 ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
    >
      <div className="card w-full h-full">
        <div className="card-body p-6 h-full flex flex-col">
          <div className="text-center mb-4 flex-shrink-0">
            <div className="mb-3 flex justify-center">
              <RocketIcon className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-base-content mb-2">Agent Setup Guide</h1>
            <p className="text-base-content/70 text-sm">Everything you need to create your AI agent</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt2">
            <div className="space-y-3">
              {AGENT_SETUP_GUIDE_STEPS?.map(({ step, title, detail, optional, icon }, index) => {
                if ((step === "1" || step === "2") && !shouldPromptShow) {
                  return null;
                }
                if (step === "2" && isEmbedUser && showDefaultApikeys) {
                  return null;
                }

                const isCompleted = getStepCompletion(step);

                const handleStepClick = () => {
                  if (step === "1") onSwitchToPromptTab();
                  else if (step === "2") onSwitchToModelTab();
                  else if (step === "3") onSwitchToConnectorsTab();
                  else if (step === "4" || step === "5") onSwitchToModelTab();
                };

                return (
                  <div
                    data-testid={`agent-setup-step-${step}`}
                    id={`agent-setup-step-${step}`}
                    key={step}
                    onClick={handleStepClick}
                    className={`card shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer ${
                      isCompleted ? "bg-success/10 border border-success/20" : "bg-base-200 border border-base-300"
                    }`}
                  >
                    <div className="card-body p-2">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 flex items-center justify-center transition-all duration-300 ${
                            isCompleted ? "text-success" : "text-base-content"
                          }`}
                        >
                          {isCompleted ? <CheckIcon className="h-4 w-4" /> : <span className="text-sm">{icon}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3
                              className={`font-semibold text-sm mt-1 ${
                                isCompleted ? "text-success" : "text-base-content"
                              }`}
                            >
                              {title}
                            </h3>
                            {optional && (
                              <div className="badge badge-sm bg-base-300 text-base-content border-base-300">
                                Optional
                              </div>
                            )}
                          </div>
                          {step === "1" && isEmbedUser && embedFields.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {embedFields
                                .filter((item) => !item.hidden)
                                .map((field) => (
                                  <span
                                    key={field.name}
                                    className="badge badge-sm bg-base-300 border-base-300 text-base-content font-mono"
                                  >
                                    {field.displayValue || field.name}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <p className={`text-sm mb-2 ${isCompleted ? "text-success/70" : "text-base-content/70"}`}>
                              {detail}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {showError && (
            <div className="card bg-error shadow-sm mt-4 flex-shrink-1 mx-6 text-xs text-base-100">
              <div className="card-body p-2">
                <div className="flex items-start gap-3">
                  <div className={`btn btn-sm btn-circle transition-all duration-300 btn-ghost`}>
                    <CircleAlertIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base-100 text-sm">
                      {errorType === "prompt" ? "Prompt Required" : "API Key Required"}
                      <br />
                      <span className="text-base-100/80">
                        {errorType === "prompt"
                          ? "Please add a prompt to continue building your agent"
                          : "Please add your API key to continue building"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mt-6 flex-shrink-0">
            <button
              data-testid="agent-setup-get-started-button"
              id="agent-setup-get-started-button"
              onClick={handleStart}
              className="btn btn-lg gap-2 bg-base-content text-base-100 hover:bg-base-content/90 border-base-content shadow-md hover:shadow-lg transition-all duration-200"
            >
              Get Started
              <SparklesIcon className="h-4 w-4" />
            </button>
            <p className="text-xs text-base-content/60 mt-3">Follow these steps to create your agent successfully</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Protected(AgentSetupGuide);
