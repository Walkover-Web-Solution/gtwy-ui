import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction, updateFuntionApiAction } from "@/store/action/bridgeAction";
import { getStatusClass, openModal, closeModal } from "@/utils/utility";
import React, { useMemo, useRef, useState } from "react";
import { useConfigurationContext } from "../ConfigurationContext";
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
  const { discardPromptDraft } = useConfigurationContext();
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

      // Read from connected_tools array and filter by type "pre_tool"
      const connectedTools = activeData?.connected_tools || [];
      const preToolEntries = connectedTools.filter((t) => t?.type === "pre_tool");

      // Transform to legacy format for compatibility
      const bridge_pre_tools = preToolEntries.map((entry) => ({
        type: entry.pre_tool_type,
        id: entry.id, // Store the function_id for custom pre-tools
        variable_path: entry.variable_path || {},
        prompt: entry.prompt,
        formats: entry.formats,
        url: entry.url,
        _connectedToolEntry: entry,
      }));

      return {
        integrationData: orgData?.integrationData || {},
        function_data: orgData?.functionData || {},
        bridge_pre_tools,
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
        const fn = function_data?.[tool.id];
        return {
          _id: tool.id,
          _type: tool.type,
          _toolEntry: tool,
          ...(fn || {}),
          title: fn?.title || tool.id || PRE_TOOL_LABELS.custom_function,
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
        const fn = function_data?.[toolItem._id];
        const fnName = fn?.script_id;
        setPreFunctionId(toolItem._id);
        setPreFunctionName(fnName || toolItem.title || "");
        setPreToolData(fn);
        setPreFunctionData(fn);
        setVariablesPath(toolItem._toolEntry?.variable_path || {});
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
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: {
            connected_tool: {
              type: "pre_tool",
              id: id,
              pre_tool_type: PRE_TOOL_TYPES.custom_function,
            },
            operation: 1,
          },
        })
      );
    });
  };

  const onBuiltInPreToolSelect = (type) => {
    guardedAction(() => {
      // For gtwy_web_search and query_refiner, call API on selection then open modal
      // For rag_knowledgebase, don't call API until user selects KB in modal
      if (type === "gtwy_web_search" || type === "query_refiner") {
        dispatch(
          updateBridgeVersionAction({
            bridgeId: params?.id,
            versionId: searchParams?.version,
            dataToSend: {
              connected_tool: {
                type: "pre_tool",
                pre_tool_type: type,
              },
              operation: 1,
            },
          })
        );
      }
      setSelectedPreTool({ type, config: {}, variable_path: {} });
      openModal(MODAL_TYPE.PREBUILT_PRE_TOOL_CONFIG_MODAL);
      setTimeout(() => {
        if (typeof document !== "undefined") document.activeElement?.blur?.();
      }, 0);
    });
  };

  const disableAllPreTools = async () => {
    for (const toolItem of bridgePreFunctions) {
      const connectedToolEntry = toolItem._toolEntry?._connectedToolEntry;
      if (connectedToolEntry) {
        await dispatch(
          updateBridgeVersionAction({
            bridgeId: params?.id,
            versionId: searchParams?.version,
            dataToSend: {
              connected_tool: {
                type: "pre_tool",
                id: connectedToolEntry.id,
                pre_tool_type: connectedToolEntry.pre_tool_type,
              },
              operation: 0,
            },
          })
        );
      }
    }
  };

  const onChangeFunctionSelect = async (id) => {
    guardedAction(async () => {
      await disableAllPreTools();
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: {
            connected_tool: {
              type: "pre_tool",
              id: id,
              pre_tool_type: PRE_TOOL_TYPES.custom_function,
            },
            operation: 1,
          },
        })
      );
      setShowChangePicker(false);
    });
  };

  const onChangeBuiltInPreToolSelect = async (type) => {
    guardedAction(async () => {
      await disableAllPreTools();
      // For gtwy_web_search and query_refiner, call API on selection then open modal
      // For rag_knowledgebase, don't call API until user selects KB in modal
      if (type === "gtwy_web_search" || type === "query_refiner") {
        dispatch(
          updateBridgeVersionAction({
            bridgeId: params?.id,
            versionId: searchParams?.version,
            dataToSend: {
              connected_tool: {
                type: "pre_tool",
                pre_tool_type: type,
              },
              operation: 1,
            },
          })
        );
      }
      setShowChangePicker(false);
      setSelectedPreTool({ type, config: {}, variable_path: {} });
      openModal(MODAL_TYPE.PREBUILT_PRE_TOOL_CONFIG_MODAL);
    });
  };

  const removePreFunction = async () => {
    await executeDelete(async () => {
      const toolItem = bridgePreFunctions.find((t) => t._id === preFunctionId);
      const connectedToolEntry = toolItem?._toolEntry?._connectedToolEntry;
      if (connectedToolEntry) {
        return dispatch(
          updateBridgeVersionAction({
            bridgeId: params?.id,
            versionId: searchParams?.version,
            dataToSend: {
              connected_tool: {
                type: "pre_tool",
                id: connectedToolEntry.id,
                pre_tool_type: connectedToolEntry.pre_tool_type,
              },
              operation: 0,
            },
          })
        );
      }
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
    // Update the pre_tool entry in connected_tools
    const toolItem = bridgePreFunctions.find((t) => t._id === preFunctionId);
    const connectedToolEntry = toolItem?._toolEntry?._connectedToolEntry;
    if (connectedToolEntry) {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: {
            connected_tool: {
              type: "pre_tool",
              id: connectedToolEntry.id,
              pre_tool_type: connectedToolEntry.pre_tool_type,
              variable_path: variablesPath,
            },
            operation: 2,
          },
        })
      );
    }
  };

  const handleSaveBuiltInPreTool = (updatedToolEntry) => {
    const toolItem = bridgePreFunctions.find((t) => t._type === updatedToolEntry.type);
    const connectedToolEntry = toolItem?._toolEntry?._connectedToolEntry;

    setSelectedPreTool(updatedToolEntry);

    const isRagKnowledgebase = updatedToolEntry.type === "rag_knowledgebase";
    const isGtwyWebSearch = updatedToolEntry.type === "gtwy_web_search";
    const isQueryRefiner = updatedToolEntry.type === "query_refiner";
    const isExisting = !!connectedToolEntry;

    const payload = {
      type: "pre_tool",
      pre_tool_type: updatedToolEntry.type,
    };

    if (isRagKnowledgebase) {
      payload.id = updatedToolEntry.config?.resource_id;
      payload.collection_id = updatedToolEntry.config?.collection_id;
    } else if (isGtwyWebSearch) {
      // For gtwy_web_search, don't send id, send url and formats
      payload.url = updatedToolEntry.variable_path?.url;
      payload.formats = updatedToolEntry.config?.formats;
    } else if (isQueryRefiner) {
      // For query_refiner, don't send id, send prompt
      payload.prompt = updatedToolEntry.prompt;
    } else {
      // For custom_function, send variable_path
      payload.variable_path = updatedToolEntry.variable_path || {};
    }

    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams?.version,
        dataToSend: {
          connected_tool: payload,
          operation: isExisting ? 2 : 1,
        },
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
          discardPromptDraft();
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
