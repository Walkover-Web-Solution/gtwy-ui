import { useCustomSelector } from "@/customHooks/customSelector";
import { createBridgeAction, createBridgeWithAiAction } from "@/store/action/bridgeAction";
import { getServiceAction } from "@/store/action/serviceAction";
import { closeModal, focusDialogWhenOpen, sendDataToParent } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import LoadingSpinner from "./LoadingSpinner";
import Protected from "./Protected";
import { BotIcon, Info, Plus } from "lucide-react";
import { CloseIcon } from "./Icons";

const buildInitialState = () => ({
  selectedService: "openai",
  selectedModel: "gpt-4o",
  selectedType: "chat",
  isManualMode: false,
  validationErrors: { purpose: "" },
  globalError: "",
  isLoading: false,
  isAiLoading: false,
});

function CreateNewBridge({ orgid, isEmbedUser, defaultBridgeType = "api" }) {
  const [state, setState] = useState(buildInitialState);
  const textAreaPurposeRef = useRef();
  const dispatch = useDispatch();
  const router = useRouter();

  const { SERVICES } = useCustomSelector((state) => ({
    SERVICES: state?.serviceReducer?.services,
  }));
  const bridgeTypeForContext = useMemo(
    () => (defaultBridgeType?.toLowerCase() === "chatbot" ? "chatbot" : "api"),
    [defaultBridgeType]
  );

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

  const handleCreateAgent = useCallback(() => {
    const purpose = textAreaPurposeRef?.current?.value?.trim();
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

          router.push(`/org/${orgid}/agents/configure/${data.agent._id}?version=${data.agent.versions[0]}`);
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
                  `/org/${orgid}/agents/configure/${data.data.agent._id}?version=${data.data.agent.versions[0]}`
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

            router.push(`/org/${orgid}/agents/configure/${data.data.agent._id}?version=${data.data.agent.versions[0]}`);
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
  ]);

  const handleCloseModal = useCallback(() => {
    closeModal(MODAL_TYPE.CREATE_BRIDGE_MODAL);
  }, []);

  return (
    <div>
      {state.isLoading && <LoadingSpinner />}
      <dialog id={MODAL_TYPE.CREATE_BRIDGE_MODAL} className="modal backdrop-blur-sm">
        <div
          id="create-new-bridge-modal-container"
          className="modal-box max-w-2xl w-full mx-4 bg-gradient-to-br from-base-100 to-base-200 shadow-2xl border border-base-300"
        >
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
              id="create-new-bridge-close-button"
              className="btn btn-sm btn-circle btn-ghost hover:bg-base-300"
              onClick={handleCloseModal}
            >
              <CloseIcon size={20} className="text-primary" />
            </button>
          </div>

          {/* Global Error Message */}
          {state.globalError && (
            <div id="create-new-bridge-error-alert" className="alert alert-error mb-6 shadow-lg">
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
                    id="agent-purpose"
                    placeholder="e.g., A customer support agent that helps users with product inquiries and troubleshooting..."
                    ref={textAreaPurposeRef}
                    autoFocus
                    onChange={handlePurposeInput}
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
                    <svg
                      className="w-4 h-4 text-info mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
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
            <button id="create-new-bridge-cancel-button" className="btn btn-sm" onClick={handleCloseModal}>
              Cancel
            </button>

            <button
              data-testid="create-new-bridge-submit-button"
              id="create-new-bridge-submit-button"
              className="btn btn-sm btn-primary"
              onClick={handleCreateAgent}
              disabled={state.isAiLoading || state.isLoading}
            >
              {state.isAiLoading || state.isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Agent
                </>
              )}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default Protected(CreateNewBridge);
