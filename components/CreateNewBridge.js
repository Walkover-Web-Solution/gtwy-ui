import { useCustomSelector } from "@/customHooks/customSelector";
import { createBridgeAction, createBridgeWithAiAction } from "@/store/action/bridgeAction";
import { getServiceAction } from "@/store/action/serviceAction";
import { closeModal, focusDialogWhenOpen, sendDataToParent } from "@/utils/utility";
import { MODAL_TYPE, AI_CREATE_STEPS } from "@/utils/enums";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useContext } from "react";
import { useDispatch } from "react-redux";
import LoadingSpinner from "./LoadingSpinner";
import Protected from "./Protected";
import { BotIcon, Info, Plus, AlertCircle } from "lucide-react";
import { CloseIcon } from "./Icons";
import { FolderContext } from "@/components/folders/FolderContext";
import { toast } from "react-toastify";

const buildInitialState = () => ({
  selectedService: "openai",
  selectedModel: "gpt-4o",
  selectedType: "chat",
  validationErrors: { purpose: "" },
  globalError: "",
  isLoading: false,
  isAiLoading: false,
});

function AgentCreateAiLoading({ stepIndex }) {
  const clampedStep = Math.min(stepIndex, AI_CREATE_STEPS.length - 1);
  const activeStep = AI_CREATE_STEPS[clampedStep];
  const onFinalStep = clampedStep === AI_CREATE_STEPS.length - 1;

  return (
    <div
      data-testid="agent-create-ai-loading"
      className="flex min-h-0 items-center justify-center"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full text-center">
        <div>
          <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary sm:text-xs">
            AI creation in progress
          </span>

          <div className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
            <div className="relative h-16 w-16">
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full border border-primary/30 bg-gradient-to-br from-primary/30 to-secondary/20 shadow-lg">
                <BotIcon size={36} className="text-primary animate-pulse" />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h4 className="mx-auto max-w-md text-lg font-bold leading-snug text-base-content sm:text-2xl">
              Building your agent with AI
            </h4>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-base-content/60 sm:text-base">
              {onFinalStep ? `${activeStep.hint} — almost ready` : activeStep.hint}
            </p>
          </div>

          <ul className="mt-8 space-y-3 text-left sm:mt-9">
            {AI_CREATE_STEPS.map((step, index) => {
              const done = index < clampedStep;
              const active = index === clampedStep;
              return (
                <li
                  key={step.label}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all duration-500 sm:px-5 sm:py-4 ${
                    active ? "border-primary/25 bg-primary/10 shadow-sm" : "border-base-200 bg-base-100"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      done
                        ? "bg-success text-success-content"
                        : active
                          ? "bg-primary text-primary-content"
                          : "bg-base-300 text-base-content/50"
                    }`}
                  >
                    {done ? "✓" : active ? <span className="loading loading-spinner loading-xs" /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <span
                      className={`block break-words text-sm leading-6 ${active ? "font-semibold text-base-content" : done ? "text-success" : "text-base-content/50"}`}
                    >
                      {step.label}
                    </span>
                    <span className="mt-1 block break-words text-xs leading-5 text-base-content/40">{step.hint}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-6 text-center text-sm leading-6 text-base-content/50 sm:text-base">
            {onFinalStep
              ? "Finishing up — you’ll be redirected when your agent is ready"
              : "This usually takes under a minute"}
          </p>
        </div>
      </div>
    </div>
  );
}

function CreateNewBridge({ orgid, isEmbedUser, defaultBridgeType = "api" }) {
  const [state, setState] = useState(buildInitialState);
  const textAreaPurposeRef = useRef();
  const dispatch = useDispatch();
  const router = useRouter();

  const folderContext = useContext(FolderContext);
  const activeFolderId = folderContext?.activeFolderId;

  const { SERVICES, isOrgBlocked } = useCustomSelector((state) => ({
    SERVICES: state?.serviceReducer?.services,
    isOrgBlocked: state?.userDetailsReducer?.blockedOrgIds?.includes(orgid) || false,
  }));
  const bridgeTypeForContext = useMemo(
    () => (defaultBridgeType?.toLowerCase() === "chatbot" ? "chatbot" : "api"),
    [defaultBridgeType]
  );

  const [aiStepIndex, setAiStepIndex] = useState(0);

  useEffect(() => {
    if (!state.isAiLoading) {
      setAiStepIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setAiStepIndex((prev) => (prev >= AI_CREATE_STEPS.length - 1 ? prev : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [state.isAiLoading]);

  // Generate unique names
  const generateUniqueName = useCallback(() => {
    const baseName = "untitled_agent_";
    return `${baseName}`;
  }, []);

  // State update helper
  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Clean state
  const cleanState = useCallback(() => {
    setState(buildInitialState());
    if (textAreaPurposeRef?.current) {
      textAreaPurposeRef.current.value = "";
    }
    closeModal(MODAL_TYPE.CREATE_BRIDGE_MODAL);
  }, []);

  // Effects
  useEffect(() => {
    if (!SERVICES || Object.entries(SERVICES).length === 0) {
      dispatch(getServiceAction({ orgid }));
    }
  }, [SERVICES, dispatch, orgid]);

  useEffect(
    () => () => {
      closeModal(MODAL_TYPE.CREATE_BRIDGE_MODAL);
    },
    []
  );

  useEffect(() => {
    const cleanup = focusDialogWhenOpen(MODAL_TYPE.CREATE_BRIDGE_MODAL, () => {
      textAreaPurposeRef?.current?.focus?.();
    });
    return cleanup;
  }, []);

  const handlePurposeInput = useCallback(() => {
    updateState({
      validationErrors: { ...state.validationErrors, purpose: "" },
      globalError: "",
    });
  }, [updateState, state.validationErrors]);

  const INVALID_FOLDER_IDS = new Set(["uncategorized", "trash", "null"]);

  const getResolvedFolderId = useCallback(() => {
    if (activeFolderId && !INVALID_FOLDER_IDS.has(activeFolderId)) {
      return activeFolderId;
    }

    if (typeof window !== "undefined") {
      // 1. Try URL search params
      const urlParams = new URLSearchParams(window.location.search);
      const paramFolderId = urlParams.get("folder_id") || urlParams.get("folderId");
      if (paramFolderId && !INVALID_FOLDER_IDS.has(paramFolderId)) {
        return paramFolderId;
      }

      // 2. Try sessionStorage for this organization's agents page
      if (orgid) {
        const sessionKey = `activeFolderId_/org/${orgid}/agents`;
        const saved = sessionStorage.getItem(sessionKey);
        if (saved && !INVALID_FOLDER_IDS.has(saved)) {
          return saved;
        }
      }

      // 3. Fallback: Search all activeFolderId_ keys in sessionStorage
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith("activeFolderId_") && key.includes("/agents")) {
            const val = sessionStorage.getItem(key);
            if (val && !INVALID_FOLDER_IDS.has(val)) {
              return val;
            }
          }
        }
      } catch (e) {
        console.error("Error reading sessionStorage keys", e);
      }
    }
    return null;
  }, [activeFolderId, orgid]);

  const handleCreateAgent = useCallback(() => {
    if (isOrgBlocked) {
      toast.error("Your org is blocked. You cannot create agents. Contact support@gtwy.ai for assistance.");
      return;
    }
    const purpose = textAreaPurposeRef?.current?.value?.trim();
    const resolvedFolderId = getResolvedFolderId();
    updateState({
      validationErrors: { purpose: "" },
      globalError: "",
    });

    const resolvedBridgeType = bridgeTypeForContext;

    if (purpose) {
      updateState({ isAiLoading: true });

      const dataToSend = {
        purpose,
        bridgeType: resolvedBridgeType,
        ...(resolvedFolderId ? { folder_id: resolvedFolderId } : {}),
      };

      dispatch(createBridgeWithAiAction({ dataToSend, orgId: orgid }))
        .then((response) => {
          const data = response.data;

          if (isEmbedUser) {
            sendDataToParent(
              "drafted",
              {
                name: data?.agent?.name,
                agent_id: data?.agent?._id,
              },
              "Agent created Successfully"
            );
          }

          router.push(
            `/org/${orgid}/agents/configure/${data.agent._id}?version=${data.agent.versions[0]}&tab=${
              isEmbedUser || data.agent.published_version_id ? "prompt" : "integration"
            }`
          );
          updateState({ isAiLoading: false });
          cleanState();
        })
        .catch((error) => {
          updateState({ isAiLoading: false });

          if (state.selectedModel) {
            updateState({ isLoading: true });
            const fallbackDataToSend = {
              service: state.selectedService,
              model: state.selectedModel,
              bridgeType: resolvedBridgeType,
              type: state.selectedType,
              ...(resolvedFolderId ? { folder_id: resolvedFolderId } : {}),
            };
            dispatch(
              createBridgeAction({ dataToSend: fallbackDataToSend, orgid }, (data) => {
                if (isEmbedUser) {
                  sendDataToParent(
                    "drafted",
                    {
                      name: data?.data?.agent?.name,
                      agent_id: data?.data?.agent?._id,
                    },
                    "Agent created Successfully"
                  );
                }
                router.push(
                  `/org/${orgid}/agents/configure/${data.data.agent._id}?version=${data.data.agent.versions[0]}&tab=${
                    isEmbedUser || data.data.agent.published_version_id ? "prompt" : "integration"
                  }`
                );
                updateState({ isLoading: false });
                cleanState();
              })
            ).catch(() => {
              updateState({
                isLoading: false,
                globalError: error?.response?.data?.message || "Error while creating agent",
              });
            });
          } else {
            updateState({
              globalError: error?.response?.data?.message || "Error while creating agent",
            });
          }
        });
    } else {
      if (state.selectedModel) {
        updateState({ isLoading: true });

        const dataToSend = {
          service: state.selectedService,
          model: state.selectedModel,
          bridgeType: resolvedBridgeType,
          type: state.selectedType,
          ...(resolvedFolderId ? { folder_id: resolvedFolderId } : {}),
        };

        dispatch(
          createBridgeAction({ dataToSend, orgid }, (data) => {
            if (isEmbedUser) {
              sendDataToParent(
                "drafted",
                {
                  name: data?.data?.agent?.name,
                  agent_id: data?.data?.agent?._id,
                },
                "Agent created Successfully"
              );
            }

            router.push(
              `/org/${orgid}/agents/configure/${data.data.agent._id}?version=${data.data.agent.versions[0]}&tab=${
                isEmbedUser || data.data.agent.published_version_id ? "prompt" : "integration"
              }`
            );
            updateState({ isLoading: false });
            cleanState();
          })
        ).catch(() => {
          updateState({ isLoading: false });
        });
      }
    }
  }, [
    state.selectedModel,
    state.selectedService,
    state.selectedType,
    updateState,
    dispatch,
    orgid,
    isEmbedUser,
    router,
    cleanState,
    generateUniqueName,
    bridgeTypeForContext,
    getResolvedFolderId,
    activeFolderId,
    folderContext,
    isOrgBlocked,
  ]);

  const handleCloseModal = useCallback(() => {
    if (state.isAiLoading) return;
    cleanState();
  }, [cleanState, state.isAiLoading]);

  return (
    <div>
      {state.isLoading && <LoadingSpinner />}
      <dialog
        data-testid={MODAL_TYPE.CREATE_BRIDGE_MODAL}
        id={MODAL_TYPE.CREATE_BRIDGE_MODAL}
        className="modal backdrop-blur-sm"
      >
        <div
          data-testid="create-new-bridge-modal-container"
          id="create-new-bridge-modal-container"
          className="modal-box max-h-[90vh] max-w-2xl w-full mx-4 overflow-y-auto bg-gradient-to-br from-base-100 to-base-200 shadow-2xl border border-base-300"
        >
          {state.isAiLoading ? (
            <AgentCreateAiLoading stepIndex={aiStepIndex} />
          ) : (
            <>
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-base-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <BotIcon size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-base-content">Create New Agent</h3>
                  </div>
                </div>
                <button
                  data-testid="create-new-bridge-close-button"
                  id="create-new-bridge-close-button"
                  className="btn btn-sm btn-circle btn-ghost hover:bg-base-300"
                  onClick={handleCloseModal}
                >
                  <CloseIcon size={20} className="text-primary" />
                </button>
              </div>

              {/* Global Error Message */}
              {state.globalError && (
                <div
                  data-testid="create-new-bridge-error-alert"
                  id="create-new-bridge-error-alert"
                  className="alert alert-error mb-6 shadow-lg"
                >
                  <Plus size={20} className="text-primary" />
                  <span className="font-medium">{state.globalError}</span>
                </div>
              )}

              {/* Agent Purpose Section */}
              <div className="space-y-4">
                <div className=" rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <h4 className="text-lg font-semibold text-base-content">Agent Purpose</h4>
                    <span className="text-xs bg-info/20 text-info px-2 py-1 rounded-full">Optional</span>
                  </div>

                  <div className="form-control">
                    <div className="relative">
                      <textarea
                        data-testid="agent-purpose"
                        id="agent-purpose"
                        placeholder="e.g., A customer support agent that helps users with product inquiries and troubleshooting..."
                        ref={textAreaPurposeRef}
                        autoFocus
                        onChange={handlePurposeInput}
                        disabled={state.isAiLoading || state.isLoading}
                        className={`textarea textarea-bordered w-full min-h-[150px] max-h-[150px] bg-base-100 transition-all duration-300 text-base resize-none placeholder:text-base-content/40 ${
                          state.validationErrors.purpose
                            ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                            : "border-base-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        }`}
                        aria-label="Agent purpose description"
                        maxLength={300}
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-base-content/50">
                        {textAreaPurposeRef?.current?.value?.length || 0}/300
                      </div>
                    </div>

                    {state.validationErrors.purpose && (
                      <div className="flex items-center gap-2 mt-2 text-error">
                        <Info size={20} className="text-error" />
                        <span className="text-sm font-medium">{state.validationErrors.purpose}</span>
                      </div>
                    )}

                    <div className="mt-3 p-3 bg-info/10 rounded-lg border border-info/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-info">
                          <p className="font-medium mb-1">Smart Creation</p>
                          <p className="text-xs text-info/80">
                            • <strong>With purpose:</strong> AI will create a customized agent based on your description
                            <br />• <strong>Without purpose:</strong> A basic agent template will be created for manual
                            setup
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-base-300">
                <button
                  data-testid="create-new-bridge-cancel-button"
                  id="create-new-bridge-cancel-button"
                  className="btn btn-sm"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>

                <button
                  data-testid="create-new-bridge-submit-button"
                  id="create-new-bridge-submit-button"
                  className="btn btn-sm btn-primary min-w-[8.5rem]"
                  onClick={handleCreateAgent}
                  disabled={state.isLoading || isOrgBlocked}
                  title={isOrgBlocked ? "Your org is blocked. Contact support@gtwy.ai for assistance." : undefined}
                >
                  {state.isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Agent
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}

export default Protected(CreateNewBridge);
