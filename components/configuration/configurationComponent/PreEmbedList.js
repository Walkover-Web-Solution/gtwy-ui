import { useCustomSelector } from "@/customHooks/customSelector";
import { updateApiAction, updateBridgeVersionAction, updateFuntionApiAction } from "@/store/action/bridgeAction";
import { getStatusClass, openModal, closeModal } from "@/utils/utility";
import React, { useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import EmbedListSuggestionDropdownMenu from "./EmbedListSuggestionDropdownMenu";
import FunctionParameterModal from "./FunctionParameterModal";
import { MODAL_TYPE, PRE_TOOL_TYPES, PRE_TOOL_LABELS } from "@/utils/enums";
import RenderEmbed from "./RenderEmbed";
import InfoTooltip from "@/components/InfoTooltip";
import { isEqual } from "lodash";
import { AddIcon } from "@/components/Icons";
import DeleteModal from "@/components/UI/DeleteModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import PrebuiltPreToolConfigModal from "@/components/modals/PrebuiltPreToolConfigModal";
import ConfirmationModal from "@/components/UI/ConfirmationModal";
import unsavedPromptGuard from "@/utils/unsavedPromptGuard";

const PreEmbedList = ({ params, searchParams, isPublished, isEditor = true, isEmbedUser = false }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const [preFunctionData, setPreFunctionData] = useState(null);
  const [preFunctionId, setPreFunctionId] = useState(null);
  const [preFunctionName, setPreFunctionName] = useState(null);
  const [preToolData, setPreToolData] = useState(null);
  const [variablesPath, setVariablesPath] = useState({});
  const [showChangePicker, setShowChangePicker] = useState(false);
  const [isAddPreToolDropdownFocused, setIsAddPreToolDropdownFocused] = useState(false);
  const [selectedPreTool, setSelectedPreTool] = useState(null); // for built-in modal
  const [deleteWarning, setDeleteWarning] = useState(null); // Warning message for delete modal

  // Pending action to run after the user confirms leaving unsaved prompt changes
  const pendingActionRef = useRef(null);

  /** Run `action` immediately, or show the unsaved-prompt guard modal first. */
  const guardedAction = (action) => {
    if (unsavedPromptGuard.hasUnsavedChanges) {
      pendingActionRef.current = action;
      openModal(MODAL_TYPE.UNSAVED_PROMPT_ACTION_MODAL);
    } else {
      action();
    }
  };
  const { integrationData, function_data, bridge_pre_tools, model, embedToken, variables_path, prompt } =
    useCustomSelector((state) => {
      const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
      const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
      const isPublished = searchParams?.isPublished === "true";
      const orgData = state?.bridgeReducer?.org?.[params?.org_id];

      // Use bridgeData when isPublished=true, otherwise use versionData
      const activeData = isPublished ? bridgeDataFromState : versionData;
      const serviceName = activeData?.service;
      const modelTypeName = activeData?.configuration?.type?.toLowerCase();
      const modelName = activeData?.configuration?.model;

      return {
        integrationData: orgData?.integrationData || {},
        function_data: orgData?.functionData || {},
        bridge_pre_tools: isPublished ? bridgeDataFromState?.pre_tools || [] : versionData?.pre_tools || [],
        modelType: modelTypeName,
        model: modelName,
        service: serviceName,
        embedToken: orgData?.embed_token,
        variables_path: isPublished ? bridgeDataFromState?.variables_path || {} : versionData?.variables_path || {},
        prompt: isPublished ? bridgeDataFromState?.configuration?.prompt : versionData?.configuration?.prompt,
      };
    });
  const dispatch = useDispatch();

  // Delete operation hook
  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE.DELETE_PRE_TOOL_MODAL);

  const bridgePreFunctions = useMemo(() => {
    return bridge_pre_tools.map((tool) => {
      if (tool.type === PRE_TOOL_TYPES.custom_function) {
        const fn = function_data?.[tool.config?.function_id];
        return {
          _id: tool.config?.function_id,
          _type: tool.type,
          _toolEntry: tool,
          ...(fn || {}),
          title: fn?.title || PRE_TOOL_LABELS[tool.type],
        };
      }
      // built-in types
      return {
        _id: tool.type,
        _type: tool.type,
        _toolEntry: tool,
        title: PRE_TOOL_LABELS[tool.type] || tool.type,
        description: "pre-built",
      };
    });
  }, [bridge_pre_tools, function_data]);

  const handleOpenModal = (itemId) => {
    guardedAction(() => {
      // Find the full tool item from bridgePreFunctions by _id
      const toolItem = bridgePreFunctions.find((t) => t._id === itemId);
      if (!toolItem) return;

      const toolType = toolItem._type;

      if (toolType === PRE_TOOL_TYPES.custom_function) {
        setPreFunctionId(toolItem._id);
        setPreFunctionName(toolItem.script_id || toolItem.title || "");
        setPreToolData(function_data?.[toolItem._id]);
        setPreFunctionData(function_data?.[toolItem._id]);
        setVariablesPath(toolItem._toolEntry?.args || {});
        openModal(MODAL_TYPE.PRE_FUNCTION_PARAMETER_MODAL);
      } else {
        setSelectedPreTool(toolItem._toolEntry);
        openModal(MODAL_TYPE.PREBUILT_PRE_TOOL_CONFIG_MODAL);
      }
    });
  };

  const handleOpenDeleteModal = (itemId, itemScriptId) => {
    guardedAction(() => {
      const toolItem = bridgePreFunctions.find((t) => t._id === itemId);
      if (!toolItem) return;

      setPreFunctionId(itemId);
      setPreFunctionName(toolItem._type !== PRE_TOOL_TYPES.custom_function ? toolItem._type : itemScriptId || itemId);

      // Check if prompt contains {{pre_function}} variable
      let warning = null;
      if (prompt) {
        const promptText = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
        if (promptText.includes("{{pre_function}}")) {
          warning = "This pre tool is used in the prompt via {{pre_function}} variable.";
        }
      }

      // Store warning in state to pass to DeleteModal
      setDeleteWarning(warning);
      openModal(MODAL_TYPE.DELETE_PRE_TOOL_MODAL);
    });
  };

  const onFunctionSelect = (id) => {
    guardedAction(() => {
      dispatch(
        updateApiAction(params.id, {
          pre_tools: {
            type: PRE_TOOL_TYPES.custom_function,
            config: {
              function_id: id,
              script_id: function_data?.[id]?.script_id,
              required: function_data?.[id]?.required || [],
            },
          },
          version_id: searchParams?.version,
          status: "1",
        })
      );
    });
  };

  const onBuiltInPreToolSelect = (type) => {
    guardedAction(() => {
      dispatch(
        updateApiAction(params.id, {
          pre_tools: { type },
          version_id: searchParams?.version,
          status: "1",
        })
      );
      setSelectedPreTool({ type, config: {}, args: {} });
      openModal(MODAL_TYPE.PREBUILT_PRE_TOOL_CONFIG_MODAL);
      setTimeout(() => {
        if (typeof document !== "undefined") document.activeElement?.blur?.();
      }, 0);
    });
  };

  const disableAllPreTools = async () => {
    for (const toolItem of bridgePreFunctions) {
      await dispatch(
        updateApiAction(params.id, {
          pre_tools: toolItem._toolEntry,
          version_id: searchParams?.version,
          status: "0",
        })
      );
    }
  };

  const onChangeFunctionSelect = async (id) => {
    guardedAction(async () => {
      await disableAllPreTools();
      dispatch(
        updateApiAction(params.id, {
          pre_tools: {
            type: PRE_TOOL_TYPES.custom_function,
            config: {
              function_id: id,
              script_id: function_data?.[id]?.script_id,
              required: function_data?.[id]?.required || [],
            },
          },
          version_id: searchParams?.version,
          status: "1",
        })
      );
      setShowChangePicker(false);
    });
  };

  const onChangeBuiltInPreToolSelect = async (type) => {
    guardedAction(async () => {
      await disableAllPreTools();
      dispatch(
        updateApiAction(params.id, {
          pre_tools: { type },
          version_id: searchParams?.version,
          status: "1",
        })
      );
      setShowChangePicker(false);
      setSelectedPreTool({ type, config: {}, args: {} });
      openModal(MODAL_TYPE.PREBUILT_PRE_TOOL_CONFIG_MODAL);
    });
  };

  const removePreFunction = async () => {
    await executeDelete(async () => {
      const toolItem = bridgePreFunctions.find((t) => t._id === preFunctionId);
      const toolEntry =
        toolItem?._toolEntry ||
        (typeof preFunctionId === "string"
          ? { type: "custom_function", config: { function_id: preFunctionId } }
          : null);
      return dispatch(
        updateApiAction(params.id, {
          pre_tools: toolEntry,
          version_id: searchParams?.version,
          status: "0",
        })
      );
    });
  };

  const handleChangePreTool = () => {
    guardedAction(() => {
      setShowChangePicker(true);
    });
  };

  const handleAddPreToolDropdownBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsAddPreToolDropdownFocused(false);
    }
  };

  const handleSavePreFunctionData = () => {
    // Save function schema changes
    if (!isEqual(preToolData, preFunctionData)) {
      const { _id, ...dataToSend } = preToolData;
      dispatch(updateFuntionApiAction({ function_id: preFunctionId, dataToSend }));
      setPreToolData("");
    }
    // Save args inline in the pre_tools array entry
    const updatedPreTools = bridge_pre_tools.map((t) => {
      if (t.type === PRE_TOOL_TYPES.custom_function && t.config?.function_id === preFunctionId) {
        return { ...t, args: variablesPath };
      }
      return t;
    });
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams?.version,
        dataToSend: { pre_tools: updatedPreTools },
      })
    );
  };

  const handleSaveBuiltInPreTool = (updatedToolEntry) => {
    const updatedPreTools = bridge_pre_tools.map((t) => {
      if (t.type === updatedToolEntry.type) {
        return updatedToolEntry;
      }
      return t;
    });
    setSelectedPreTool(updatedToolEntry);
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams?.version,
        dataToSend: { pre_tools: updatedPreTools },
      })
    );
  };

  return (
    <>
      <div data-testid="pre-embed-list-container" id="pre-embed-list-container">
        <FunctionParameterModal
          isPublished={isReadOnly}
          name="Pre Tool"
          functionId={preFunctionId}
          Model_Name={MODAL_TYPE.PRE_FUNCTION_PARAMETER_MODAL}
          embedToken={embedToken}
          handleSave={handleSavePreFunctionData}
          toolData={preToolData}
          setToolData={setPreToolData}
          function_details={preFunctionData}
          functionName={preFunctionName}
          variablesPath={variablesPath}
          setVariablesPath={setVariablesPath}
          variables_path={variables_path}
        />
        <DeleteModal
          onConfirm={removePreFunction}
          item={preFunctionId}
          name={preFunctionName}
          title="Are you sure?"
          description={"This action Remove the selected Pre Tool from the Agent."}
          buttonTitle="Remove Pre Tool"
          modalType={MODAL_TYPE.DELETE_PRE_TOOL_MODAL}
          loading={isDeleting}
          isAsync={true}
          warning={deleteWarning}
        />

        <PrebuiltPreToolConfigModal
          toolEntry={selectedPreTool}
          onSave={handleSaveBuiltInPreTool}
          orgId={params?.org_id}
        />

        <div id="pre-embed-list-content" className="w-full mt-4 gap-2 flex flex-col px-2 py-2 cursor-default">
          {bridgePreFunctions.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <div
                data-testid="pre-embed-header-wrapper"
                id="pre-embed-header-wrapper"
                className="flex items-center gap-2 group"
              >
                <InfoTooltip tooltipContent="A prefunction prepares data before passing it to the main function for the GPT call.">
                  <div className="flex items-center gap-1 cursor-help">
                    <p className="text-sm whitespace-nowrap">Pre Functions</p>
                  </div>
                </InfoTooltip>
              </div>
            </div>
          )}
          {bridgePreFunctions.length === 0 && (
            <>
              <div
                data-testid="pre-embed-empty-dropdown"
                id="pre-embed-empty-dropdown"
                className={`dropdown dropdown-end w-full max-w-md`}
                onFocusCapture={() => setIsAddPreToolDropdownFocused(true)}
                onBlurCapture={handleAddPreToolDropdownBlur}
              >
                <div className="border-2 border-base-200 border-dashed text-center">
                  <InfoTooltip
                    tooltipContent="A prefunction prepares data before passing it to the main function for the GPT call."
                    disabled={isAddPreToolDropdownFocused}
                  >
                    <button
                      data-testid="pre-embed-add-button"
                      id="pre-embed-add-button"
                      tabIndex={0}
                      className="flex items-center justify-center gap-1 p-2 text-base-content/50 hover:text-base-content/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
                      disabled={isReadOnly}
                    >
                      <AddIcon className="w-3 h-3" />
                      Add Pre Functions
                    </button>
                  </InfoTooltip>
                </div>
                <EmbedListSuggestionDropdownMenu
                  params={params}
                  searchParams={searchParams}
                  name={"preFunction"}
                  hideCreateFunction={false}
                  onSelect={onFunctionSelect}
                  connectedFunctions={bridge_pre_tools}
                  shouldToolsShow={true}
                  modelName={model}
                  onSelectBuiltInPreTool={onBuiltInPreToolSelect}
                  connectedPreToolTypes={bridge_pre_tools
                    .filter((t) => typeof t === "object" && t.type !== PRE_TOOL_TYPES.custom_function)
                    .map((t) => t.type)}
                />
              </div>
            </>
          )}
          <div className="flex flex-col gap-2 w-full">
            {/* Render pre-tool cards */}
            {bridgePreFunctions.length > 0 && (
              <div
                data-testid="pre-embed-functions-container"
                id="pre-embed-functions-container"
                className="w-full max-w-md"
              >
                <RenderEmbed
                  isPublished={isPublished}
                  isEditor={isEditor}
                  bridgeFunctions={bridgePreFunctions}
                  integrationData={integrationData}
                  getStatusClass={getStatusClass}
                  handleOpenModal={handleOpenModal}
                  embedToken={embedToken}
                  params={params}
                  versionId={searchParams?.version}
                  name="preFunction"
                  handleRemoveEmbed={removePreFunction}
                  handleOpenDeleteModal={handleOpenDeleteModal}
                  handleChangePreTool={handleChangePreTool}
                  isChangePreToolDropdownOpen={showChangePicker}
                  halfLength={1}
                />
                {bridgePreFunctions.length > 0 && (
                  <>
                    {showChangePicker && (
                      <div className="fixed inset-0 z-10" onClick={() => setShowChangePicker(false)} />
                    )}
                    <div
                      data-testid="pre-embed-add-more-dropdown"
                      id="pre-embed-add-more-dropdown"
                      className={`dropdown dropdown-right ${showChangePicker ? "dropdown-open" : ""}`}
                    >
                      <EmbedListSuggestionDropdownMenu
                        params={params}
                        searchParams={searchParams}
                        name={"preFunction"}
                        hideCreateFunction={false}
                        onSelect={onChangeFunctionSelect}
                        connectedFunctions={bridge_pre_tools}
                        shouldToolsShow={true}
                        modelName={model}
                        onSelectBuiltInPreTool={onChangeBuiltInPreToolSelect}
                        connectedPreToolTypes={bridge_pre_tools
                          .filter((t) => typeof t === "object" && t.type !== PRE_TOOL_TYPES.custom_function)
                          .map((t) => t.type)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Unsaved prompt guard modal for pre-tool actions */}
      <ConfirmationModal
        modalType={MODAL_TYPE.UNSAVED_PROMPT_ACTION_MODAL}
        title="Unsaved Prompt Changes"
        message="You have unsaved changes to your prompt. Save your prompt first, or discard changes and continue."
        confirmText="Discard & Continue"
        cancelText="Go Back"
        confirmButtonClass="btn-error text-white"
        onConfirm={() => {
          closeModal(MODAL_TYPE.UNSAVED_PROMPT_ACTION_MODAL);
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          if (action) action();
        }}
        onCancel={() => {
          closeModal(MODAL_TYPE.UNSAVED_PROMPT_ACTION_MODAL);
          pendingActionRef.current = null;
        }}
        onClose={() => {
          closeModal(MODAL_TYPE.UNSAVED_PROMPT_ACTION_MODAL);
          pendingActionRef.current = null;
        }}
      />
    </>
  );
};

export default PreEmbedList;
