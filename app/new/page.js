"use client";
import { useCustomSelector } from "@/customHooks/customSelector";
import { openModal, renderedOrganizations, setInCookies } from "@/utils/utility";
import React, { useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import Protected from "@/components/Protected";
import { switchOrg, switchUser } from "@/config/index";
import { toast } from "react-toastify";
import { setCurrentOrgIdAction } from "@/store/action/orgAction";
import { createBridgeAction, createAgentFromTemplateAction } from "@/store/action/bridgeAction";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import CreateNewBridge from "@/components/CreateNewBridge";
import { MODAL_TYPE } from "@/utils/enums";
import { FileText, Lightbulb } from "lucide-react";

const INITIAL_FORM_STATE = {
  bridgeName: "",
  selectedOrg: null,
  searchQuery: "",
  bridgeType: "api",
  selectedService: "openai",
  selectedModel: "gpt-4o",
  selectedModelType: "chat",
  slugName: "",
  isLoading: false,
  template_Id: "",
};

function Page() {
  const dispatch = useDispatch();
  const route = useRouter();
  const searchParams = useSearchParams();
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  const { organizations } = useCustomSelector((state) => ({
    organizations: state.userDetailsReducer.organizations,
  }));

  const queryTemplateId = searchParams.get("template_id");
  const templateId = queryTemplateId;
  const isTemplateFlow = Boolean(queryTemplateId);

  useEffect(() => {
    const setTemplateData = async () => {
      if (isTemplateFlow) {
        try {
          setIsInitialLoading(true);
          updateFormState({
            template_Id: templateId,
          });
          toast.success("Template loaded successfully");
          //}
        } catch (error) {
          toast.error(error.response?.data?.message || "Error loading template");
        } finally {
          setIsInitialLoading(false);
        }
      }
    };
    setTemplateData();
  }, [templateId]);

  const updateFormState = useCallback((updates) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const { selectedOrg, bridgeName, bridgeType, slugName } = formState;

      if (!selectedOrg) {
        return toast.error("Please select an organization");
      }

      if (!isTemplateFlow && !bridgeName.trim()) {
        return toast.error("Please enter a agent name");
      }

      if (!isTemplateFlow && bridgeType === "chatbot" && !slugName.trim()) {
        return toast.error("Please enter a slug name for chatbot");
      }

      try {
        const templateBridgeName = `template_agent_${Date.now()}`;
        const resolvedBridgeName = isTemplateFlow ? templateBridgeName : bridgeName;
        const resolvedSlugName = isTemplateFlow ? templateBridgeName : slugName || bridgeName;
        updateFormState({ isLoading: true });
        const response = await switchOrg(selectedOrg.id);

        const { token } = await switchUser({
          orgId: selectedOrg.id,
          orgName: selectedOrg.name,
        });
        setInCookies("local_token", token);

        await dispatch(setCurrentOrgIdAction(selectedOrg.id));

        if (response.status !== 200) {
          throw new Error("Failed to switch organization");
        }

        const bridgeData = {
          service: formState.selectedService,
          model: formState.selectedModel,
          name: resolvedBridgeName,
          slugName: resolvedSlugName,
          bridgeType,
          type: formState.selectedModelType,
          orgid: selectedOrg.id,
          ...(formState.template_Id && { templateId: formState.template_Id }),
        };

        const onSuccess = (data) => {
          const createdAgent = data?.data?.agent;
          const agentId = createdAgent?._id;
          const targetVersion = createdAgent?.published_version_id || createdAgent?.versions?.[0];
          if (agentId && targetVersion) {
            route.push(`/org/${selectedOrg.id}/agents/configure/${agentId}?version=${targetVersion}`);
          } else {
            toast.error("Unable to open the newly created agent. Please try again.");
            updateFormState({ isLoading: false });
          }
        };

        if (formState.template_Id) {
          await dispatch(
            createAgentFromTemplateAction(
              formState.template_Id,

              onSuccess
            )
          );
        } else {
          await dispatch(
            createBridgeAction(
              {
                dataToSend: bridgeData,
                orgid: selectedOrg.id,
              },
              onSuccess
            )
          );
        }
      } catch (error) {
        console.error("Error:", error.message || error);
        updateFormState({ isLoading: false });
      }
    },
    [formState, dispatch, route]
  );

  const handleSelectOrg = useCallback(
    (orgId, orgName) => {
      updateFormState({ selectedOrg: { id: orgId, name: orgName } });
    },
    [updateFormState]
  );

  const handleOpenCreateAgent = useCallback(() => {
    if (!formState.selectedOrg?.id) {
      toast.error("Please select an organization");
      return;
    }
    openModal(MODAL_TYPE.CREATE_BRIDGE_MODAL);
  }, [formState.selectedOrg?.id]);

  const handleChange = useCallback(
    (field) => (e) => {
      updateFormState({ [field]: e.target.value });
    },
    [updateFormState]
  );

  if ((!isTemplateFlow && formState.isLoading) || isInitialLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Organizations List */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-5">
            <h2 className="text-lg font-semibold text-base-content">Organizations</h2>
            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text">Search organizations</span>
              </label>
              <input
                autoComplete="off"
                type="text"
                placeholder="Type a name"
                value={formState.searchQuery}
                onChange={handleChange("searchQuery")}
                className="input input-bordered w-full"
              />
            </div>
            <div className="mt-4 space-y-2 max-h-[70vh] overflow-x-hidden overflow-y-auto pr-1">
              {renderedOrganizations(organizations, formState, handleSelectOrg)}
            </div>
          </div>
        </div>

        {isTemplateFlow ? (
          <div className="card bg-base-100 border border-base-200 shadow-sm">
            <div className="card-body p-6 md:p-8 flex flex-col min-h-[70vh]">
              <h2 className="text-2xl font-semibold text-base-content">Create Template Agent</h2>
              <div className="divider my-4" />

              {/* Informative Content */}
              <div className="flex-1 flex flex-col justify-center space-y-6 py-8">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>

                  <h3 className="text-xl font-semibold text-base-content">What are Templates?</h3>

                  <p className="text-base-content/70 leading-relaxed">
                    Templates are pre-configured agents with predefined settings, prompts, and workflows. They help you
                    get started quickly by providing a ready-made structure for common use cases.
                  </p>

                  <div className="grid md:grid-cols-3 gap-4 mt-8">
                    <div className="p-4 bg-base-200 rounded-lg">
                      <div className="text-sm font-medium text-base-content mb-2">⚡ Quick Start</div>
                      <p className="text-xs text-base-content/60">
                        Get up and running in seconds with pre-built configurations
                      </p>
                    </div>
                    <div className="p-4 bg-base-200 rounded-lg">
                      <div className="text-sm font-medium text-base-content mb-2">🎯 Best Practices</div>
                      <p className="text-xs text-base-content/60">Built using proven patterns and optimized settings</p>
                    </div>
                    <div className="p-4 bg-base-200 rounded-lg">
                      <div className="text-sm font-medium text-base-content mb-2">🔧 Customizable</div>
                      <p className="text-xs text-base-content/60">Fully editable to match your specific needs</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Button at Bottom */}
              <div className="mt-auto pt-6">
                <button
                  type="button"
                  disabled={formState.isLoading}
                  onClick={handleSubmit}
                  className="btn btn-primary w-full"
                >
                  {formState.isLoading ? "Creating..." : "Create from Template"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 border border-base-200 shadow-sm">
            <div className="card-body p-6 md:p-8 flex flex-col min-h-[70vh]">
              <h2 className="text-2xl font-semibold text-base-content">Create New Agent</h2>
              <div className="divider my-4" />

              {/* Informative Content */}
              <div className="flex-1 flex flex-col justify-center space-y-6 py-8">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Lightbulb className="w-8 h-8 text-primary" />
                  </div>

                  <h3 className="text-xl font-semibold text-base-content">What are Agents?</h3>

                  <p className="text-base-content/70 leading-relaxed">
                    Agents are AI-powered assistants that you can customize to perform specific tasks. Configure them
                    with custom models, prompts, and behaviors to automate workflows and enhance productivity.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 mt-8">
                    <div className="p-4 bg-base-200 rounded-lg text-left">
                      <div className="text-sm font-medium text-base-content mb-2">🤖 AI-Powered</div>
                      <p className="text-xs text-base-content/60">
                        Leverage advanced language models like GPT-4 for intelligent responses
                      </p>
                    </div>
                    <div className="p-4 bg-base-200 rounded-lg text-left">
                      <div className="text-sm font-medium text-base-content mb-2">⚙️ Customizable</div>
                      <p className="text-xs text-base-content/60">
                        Fine-tune prompts, models, and settings to match your use case
                      </p>
                    </div>
                    <div className="p-4 bg-base-200 rounded-lg text-left">
                      <div className="text-sm font-medium text-base-content mb-2">🔗 API & Chatbot</div>
                      <p className="text-xs text-base-content/60">
                        Deploy as an API endpoint or embed as a chatbot widget
                      </p>
                    </div>
                    <div className="p-4 bg-base-200 rounded-lg text-left">
                      <div className="text-sm font-medium text-base-content mb-2">📊 Version Control</div>
                      <p className="text-xs text-base-content/60">
                        Track changes and maintain multiple versions of your agent
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Button at Bottom */}
              <div className="mt-auto pt-6">
                <button
                  type="button"
                  disabled={!formState.selectedOrg?.id}
                  onClick={handleOpenCreateAgent}
                  className="btn btn-primary w-full"
                >
                  Continue
                </button>
                <CreateNewBridge orgid={formState.selectedOrg?.id} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Protected(Page);
