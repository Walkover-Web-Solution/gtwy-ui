import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction, updateFuntionApiAction } from "@/store/action/bridgeAction";
import useTutorialVideos from "@/hooks/useTutorialVideos";
import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import EmbedListSuggestionDropdownMenu from "./EmbedListSuggestionDropdownMenu";
import FunctionParameterModal from "./FunctionParameterModal";
import { GetPreBuiltToolTypeIcon, openModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import RenderEmbed from "./RenderEmbed";
import { isEqual } from "lodash";
import InfoTooltip from "@/components/InfoTooltip";
import { AddIcon, TrashIcon, SettingsIcon } from "@/components/Icons";
import DeleteModal from "@/components/UI/DeleteModal";
import PrebuiltToolsConfigModal from "@/components/modals/PrebuiltToolsConfigModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { CircleQuestionMark } from "lucide-react";

function getStatusClass(status) {
  switch (status?.toString().trim().toLowerCase()) {
    case "drafted":
      return "bg-yellow-100";
    case "paused":
      return "bg-red-100";
    case "active":
    case "published":
      return "bg-green-100";
    case "rejected":
      return "bg-gray-100";
    // Add more cases as needed
    default:
      return "bg-gray-100";
  }
}

const EmbedList = ({ params, searchParams, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const [functionId, setFunctionId] = useState(null);
  const [functionData, setfunctionData] = useState({});
  const [toolData, setToolData] = useState({});
  const [function_name, setFunctionName] = useState("");
  const [variablesPath, setVariablesPath] = useState({});
  const dispatch = useDispatch();
  const {
    integrationData,
    bridge_functions,
    function_data,
    model,
    shouldToolsShow,
    embedToken,
    variables_path,
    prebuiltToolsData,
    toolsVersionData,
    showInbuiltTools,
    webSearchFilters,
    gtwyWebSearchFilters,
  } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const orgData = state?.bridgeReducer?.org?.[params?.org_id];
    const modelReducer = state?.modelReducer?.serviceModels;
    const activeData = isPublished ? bridgeDataFromState : versionData;
    const serviceName = activeData?.service;
    const modelTypeName = activeData?.configuration?.type?.toLowerCase();
    const modelName = activeData?.configuration?.model;

    return {
      integrationData: orgData?.integrationData || {},
      function_data: orgData?.functionData || {},
      bridge_functions: isPublished ? bridgeDataFromState?.function_ids || [] : versionData?.function_ids || [],
      model: modelName,
      shouldToolsShow: modelReducer?.[serviceName]?.[modelTypeName]?.[modelName]?.validationConfig?.tools,
      showInbuiltTools: modelReducer?.[serviceName]?.[modelTypeName]?.[modelName]?.validationConfig?.inbuilt_tools,
      embedToken: orgData?.embed_token,
      variables_path: isPublished ? bridgeDataFromState?.variables_path || {} : versionData?.variables_path || {},
      prebuiltToolsData: state?.bridgeReducer?.prebuiltTools,
      toolsVersionData: isPublished ? bridgeDataFromState?.built_in_tools : versionData?.built_in_tools,
      webSearchFilters: isPublished
        ? bridgeDataFromState?.web_search_filters || []
        : versionData?.web_search_filters || [],
      gtwyWebSearchFilters: isPublished
        ? bridgeDataFromState?.gtwy_web_search_filters || []
        : versionData?.gtwy_web_search_filters || [],
    };
  });
  // Use the tutorial videos hook
  const { getFunctionCreationVideo } = useTutorialVideos();
  const [tutorialState, setTutorialState] = useState({
    showTutorial: false,
    showSuggestion: false,
  });
  const handleOpenModal = (functionId) => {
    setFunctionId(functionId);
    const fn = function_data?.[functionId];
    setfunctionData(fn);
    setToolData(fn);
    const fnName = fn?.script_id;
    setFunctionName(fnName);
    setVariablesPath(variables_path[fnName] || {});
    openModal(MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL);
  };
  const [selectedPrebuiltTool, setSelectedPrebuiltTool] = useState(null);
  const [prebuiltToolName, setPrebuiltToolName] = useState(null);

  // Delete operation hooks
  const { isDeleting: isDeletingTool, executeDelete: executeToolDelete } = useDeleteOperation(
    MODAL_TYPE.DELETE_TOOL_MODAL
  );
  const { isDeleting: isDeletingPrebuiltTool, executeDelete: executePrebuiltToolDelete } = useDeleteOperation(
    MODAL_TYPE.DELETE_PREBUILT_TOOL_MODAL
  );

  const handleOpenDeleteModal = (functionId, functionName) => {
    setFunctionId(functionId);
    setFunctionName(functionName);
    openModal(MODAL_TYPE.DELETE_TOOL_MODAL);
  };
  const handleOpenDeletePrebuiltModal = (item) => {
    setSelectedPrebuiltTool(item);
    openModal(MODAL_TYPE.DELETE_PREBUILT_TOOL_MODAL);
  };
  const bridgeFunctions = useMemo(
    () => bridge_functions.map((id) => function_data?.[id]),
    [bridge_functions, function_data]
  );
  const handleSelectFunction = (functionId) => {
    if (functionId) {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: {
            functionData: {
              function_id: functionId,
              function_operation: "1",
            },
          },
        })
      );
    }
  };

  const handleRemoveFunctionFromBridge = async (id, name) => {
    await executeToolDelete(async () => {
      return dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: {
            functionData: {
              function_id: id,
              function_name: name,
            },
          },
        })
      );
    });
  };

  const handleSaveFunctionData = () => {
    if (!isEqual(toolData, functionData)) {
      const { _id, ...dataToSend } = toolData;
      dispatch(
        updateFuntionApiAction({
          function_id: functionId,
          dataToSend: dataToSend,
        })
      );
      setToolData("");
    }
    if (!isEqual(variablesPath, variables_path[function_name])) {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: { variables_path: { [function_name]: variablesPath } },
        })
      );
    }
  };

  // Handle adding a prebuilt tool into built_in_tools from the Tools dropdown
  const handleAddPrebuiltTool = (item) => {
    if (!item?.value) return;
    dispatch(
      updateBridgeVersionAction({
        versionId: searchParams?.version,
        dataToSend: { built_in_tools_data: { built_in_tools: item?.value, built_in_tools_operation: "1" } },
      })
    );
    // Close dropdown after selection
    setTimeout(() => {
      if (typeof document !== "undefined") {
        document.activeElement?.blur?.();
      }
    }, 0);
  };

  // Handle removing a prebuilt tool from built_in_tools
  const handleDeletePrebuiltTool = async (item, name) => {
    if (!item?.value) return;
    await executePrebuiltToolDelete(async () => {
      return dispatch(
        updateBridgeVersionAction({
          versionId: searchParams?.version,
          dataToSend: { built_in_tools_data: { built_in_tools: item?.value } },
        })
      );
    });
  };

  // Handle opening prebuilt tools configuration modal
  const handleOpenPrebuiltConfig = (toolName) => {
    setPrebuiltToolName(toolName);
    openModal(MODAL_TYPE.PREBUILT_TOOLS_CONFIG_MODAL);
  };

  // Get the correct filters based on the current prebuilt tool
  const currentPrebuiltToolFilters = prebuiltToolName === "Gtwy_Web_Search" ? gtwyWebSearchFilters : webSearchFilters;

  // Handle saving prebuilt tools configuration
  const handleSavePrebuiltConfig = async (domains) => {
    try {
      // Use different key based on prebuilt tool name
      const filterKey = prebuiltToolName === "Gtwy_Web_Search" ? "gtwy_web_search_filters" : "web_search_filters";

      await dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: {
            [filterKey]: domains,
          },
        })
      );
    } catch (error) {
      console.error("Error saving prebuilt tools configuration:", error);
      throw error;
    }
  };

  // Compute selected prebuilt tools (to render cards)
  const selectedPrebuiltTools = useMemo(() => {
    const byId = new Map((prebuiltToolsData || []).map((t) => [t.value, t]));
    return (Array.isArray(toolsVersionData) ? toolsVersionData : []).map((id) => byId.get(id)).filter(Boolean);
  }, [prebuiltToolsData, toolsVersionData]);
  const hasTools = bridgeFunctions.length > 0 || selectedPrebuiltTools.length > 0;
  return (
    bridge_functions && (
      <div id="embed-list-container">
        <DeleteModal
          onConfirm={handleRemoveFunctionFromBridge}
          item={functionId}
          name={function_name}
          title="Are you sure?"
          description={"This action Remove the selected Tool from the Agent."}
          buttonTitle="Remove Tool"
          modalType={MODAL_TYPE.DELETE_TOOL_MODAL}
          loading={isDeletingTool}
          isAsync={true}
        />
        <DeleteModal
          onConfirm={handleDeletePrebuiltTool}
          item={selectedPrebuiltTool}
          name={"Prebuilt Tool"}
          title="Are you sure?"
          description={"This action Remove the selected Prebuilt Tool from the Agent."}
          buttonTitle="Remove Prebuilt Tool"
          modalType={MODAL_TYPE.DELETE_PREBUILT_TOOL_MODAL}
          loading={isDeletingPrebuiltTool}
          isAsync={true}
        />
        <FunctionParameterModal
          isPublished={isReadOnly}
          name="Tool"
          functionId={functionId}
          Model_Name={MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL}
          embedToken={embedToken}
          handleSave={handleSaveFunctionData}
          toolData={toolData}
          setToolData={setToolData}
          function_details={functionData}
          variables_path={variables_path}
          functionName={function_name}
          setVariablesPath={setVariablesPath}
          variablesPath={variablesPath}
        />
        <div className="w-full gap-2 flex flex-col px-2 py-2 cursor-default">
          {shouldToolsShow && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm whitespace-nowrap">Tools</p>
                  <InfoTooltip
                    video={getFunctionCreationVideo()}
                    tooltipContent="Tool calling lets LLMs use external tools to get real-time data and perform complex tasks."
                  >
                    <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
                  </InfoTooltip>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <div id="embed-list-tools-container" className="flex flex-col gap-2 w-full max-w-md">
                  {!hasTools ? (
                    <div id="embed-list-no-tools-dropdown" className="dropdown dropdown-end w-full">
                      <div className="border-2 border-base-200 border-dashed p-4 text-center">
                        <p className="text-sm text-base-content/70">No tools found.</p>
                        <button
                          id="embed-list-add-tool-button"
                          tabIndex={0}
                          className="flex items-center justify-center gap-1 mt-3 text-base-content hover:text-base-content/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
                          disabled={isReadOnly}
                        >
                          <AddIcon className="w-3 h-3" />
                          Add
                        </button>
                      </div>
                      <EmbedListSuggestionDropdownMenu
                        name={"Function"}
                        params={params}
                        searchParams={searchParams}
                        onSelect={handleSelectFunction}
                        onSelectPrebuiltTool={handleAddPrebuiltTool}
                        connectedFunctions={bridge_functions}
                        shouldToolsShow={shouldToolsShow}
                        modelName={model}
                        asDropdownContent
                        prebuiltToolsData={prebuiltToolsData}
                        toolsVersionData={toolsVersionData}
                        showInbuiltTools={showInbuiltTools}
                        tutorialState={tutorialState}
                        setTutorialState={setTutorialState}
                        isPublished={isPublished}
                        isEditor={isEditor}
                      />
                    </div>
                  ) : (
                    <>
                      {bridgeFunctions.length > 0 && (
                        <RenderEmbed
                          bridgeFunctions={bridgeFunctions}
                          integrationData={integrationData}
                          getStatusClass={getStatusClass}
                          handleOpenModal={handleOpenModal}
                          embedToken={embedToken}
                          params={params}
                          name="function"
                          handleRemoveEmbed={handleRemoveFunctionFromBridge}
                          handleOpenDeleteModal={handleOpenDeleteModal}
                          halfLength={1}
                          isPublished={isPublished}
                          isEditor={isEditor}
                        />
                      )}

                      {/* Render selected Prebuilt Tools with same UI */}
                      {selectedPrebuiltTools.map((item) => {
                        const missingDesc = !item?.description;
                        const isNotSupported =
                          !showInbuiltTools ||
                          (Array.isArray(showInbuiltTools)
                            ? !showInbuiltTools.includes(item?.value)
                            : !showInbuiltTools[item?.value]);
                        const hasIssue = missingDesc || isNotSupported;

                        return (
                          <div
                            key={item?.value}
                            id={`embed-list-prebuilt-tool-${item?.value}`}
                            className={`group flex w-full items-center border border-base-200 cursor-pointer bg-base-100 relative ${hasIssue ? "border-error" : ""} transition-colors duration-200 min-h-[44px]`}
                          >
                            <div className="p-2 flex-1 flex items-center gap-2">
                              {GetPreBuiltToolTypeIcon(item?.value, 16, 16)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center">
                                  <span className="flex-1 min-w-0 text-sm font-normal text-base-content truncate">
                                    <div className="tooltip" data-tip={item?.name?.length > 24 ? item?.name : ""}>
                                      <span className="truncate block w-[300px] flex justify-left">
                                        {item?.name?.length > 24 ? `${item?.name.slice(0, 24)}...` : item?.name}
                                      </span>
                                    </div>
                                  </span>
                                </div>
                                {isNotSupported && (
                                  <p className="text-xs text-base-content/70 line-clamp-1">
                                    Model doesn't support {item?.name} tool
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 pr-2 flex-shrink-0">
                              {(item?.value === "web_search" || item?.value === "Gtwy_Web_Search") && (
                                <button
                                  id={`embed-list-prebuilt-tool-config-button-${item?.value}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPrebuiltConfig(item?.value);
                                  }}
                                  className="btn btn-ghost btn-sm p-1 hover:bg-base-300"
                                  title="Config"
                                  disabled={isReadOnly}
                                >
                                  <SettingsIcon size={16} />
                                </button>
                              )}
                              <button
                                id={`embed-list-prebuilt-tool-delete-button-${item?.value}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeletePrebuiltModal(item);
                                }}
                                className="btn btn-ghost btn-sm p-1 hover:bg-red-100 hover:text-error"
                                title="Remove"
                                disabled={isReadOnly}
                              >
                                <TrashIcon size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {hasTools && (
                        <div id="embed-list-add-tool-dropdown" className="dropdown dropdown-end w-full max-w-md">
                          <div className="border-2 border-base-200 border-dashed text-center">
                            <button
                              id="embed-list-add-tool-button"
                              tabIndex={0}
                              className="flex items-center justify-center gap-1 p-2 text-base-content/50 hover:text-base-content/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
                              disabled={isReadOnly}
                            >
                              <AddIcon className="w-3 h-3" />
                              Add Tool
                            </button>
                          </div>
                          <EmbedListSuggestionDropdownMenu
                            name={"Function"}
                            params={params}
                            searchParams={searchParams}
                            onSelect={handleSelectFunction}
                            onSelectPrebuiltTool={handleAddPrebuiltTool}
                            connectedFunctions={bridge_functions}
                            shouldToolsShow={shouldToolsShow}
                            modelName={model}
                            asDropdownContent
                            prebuiltToolsData={prebuiltToolsData}
                            toolsVersionData={toolsVersionData}
                            showInbuiltTools={showInbuiltTools}
                            tutorialState={tutorialState}
                            setTutorialState={setTutorialState}
                            isPublished={isPublished}
                            isEditor={isEditor}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Prebuilt Tools Configuration Modal */}
        <PrebuiltToolsConfigModal initialDomains={currentPrebuiltToolFilters} onSave={handleSavePrebuiltConfig} />
      </div>
    )
  );
};

export default EmbedList;
