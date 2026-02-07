import { useCustomSelector } from "@/customHooks/customSelector";
import { updateApiAction, updateBridgeVersionAction, updateFuntionApiAction } from "@/store/action/bridgeAction";
import { getStatusClass, openModal } from "@/utils/utility";
import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import EmbedListSuggestionDropdownMenu from "./EmbedListSuggestionDropdownMenu";
import FunctionParameterModal from "./FunctionParameterModal";
import { MODAL_TYPE } from "@/utils/enums";
import RenderEmbed from "./RenderEmbed";
import InfoTooltip from "@/components/InfoTooltip";
import { isEqual } from "lodash";
import { AddIcon } from "@/components/Icons";
import DeleteModal from "@/components/UI/DeleteModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";

const PreEmbedList = ({ params, searchParams, isPublished, isEditor = true, isEmbedUser = false }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const [preFunctionData, setPreFunctionData] = useState(null);
  const [preFunctionId, setPreFunctionId] = useState(null);
  const [preFunctionName, setPreFunctionName] = useState(null);
  const [preToolData, setPreToolData] = useState(null);
  const [variablesPath, setVariablesPath] = useState({});
  const { integrationData, function_data, bridge_pre_tools, model, embedToken, variables_path } = useCustomSelector(
    (state) => {
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
      };
    }
  );
  const dispatch = useDispatch();

  // Delete operation hook
  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE.DELETE_PRE_TOOL_MODAL);

  const bridgePreFunctions = useMemo(
    () => bridge_pre_tools.map((id) => function_data?.[id]),
    [bridge_pre_tools, function_data, params]
  );
  const handleOpenModal = (functionId) => {
    setPreFunctionId(functionId);
    setPreFunctionName(function_data?.[functionId]?.script_id || function_data?.[functionId]?.title || "");
    setPreToolData(function_data?.[functionId]);
    setPreFunctionData(function_data?.[functionId]);
    setVariablesPath(variables_path[preFunctionName] || {});
    openModal(MODAL_TYPE.PRE_FUNCTION_PARAMETER_MODAL);
  };
  const handleOpenDeleteModal = (functionId, functionName) => {
    setPreFunctionId(functionId);
    setPreFunctionName(functionName);
    openModal(MODAL_TYPE.DELETE_PRE_TOOL_MODAL);
  };
  const onFunctionSelect = (id) => {
    dispatch(
      updateApiAction(params.id, {
        pre_tools: id,
        version_id: searchParams?.version,
        status: "1",
      })
    );
    // Close dropdown after selection
    setTimeout(() => {
      if (typeof document !== "undefined") {
        document.activeElement?.blur?.();
      }
    }, 0);
  };

  const removePreFunction = async () => {
    await executeDelete(async () => {
      return dispatch(
        updateApiAction(params.id, {
          pre_tools: preFunctionId,
          version_id: searchParams?.version,
          status: "0",
        })
      );
    });
  };

  const handleChangePreTool = () => {
    // Focus on the pre-tool dropdown to allow user to select a different pre-tool
    setTimeout(() => {
      // Look for the EmbedListSuggestionDropdownMenu dropdown - updated selector
      const dropdown = document.querySelector(".dropdown-right");
      if (dropdown) {
        // Find the dropdown content with tabIndex
        const dropdownContent = dropdown.querySelector('ul[tabindex="0"]');
        if (dropdownContent) {
          dropdownContent.focus();
          // Trigger the dropdown to open by adding the 'dropdown-open' class
          dropdown.classList.add("dropdown-open");

          // Function to close dropdown and cleanup
          const closeDropdown = () => {
            dropdown.classList.remove("dropdown-open");
            document.removeEventListener("click", handleClickOutside);
            document.removeEventListener("click", handleDropdownItemClick);
          };

          // Add click outside handler to close dropdown
          const handleClickOutside = (event) => {
            if (!dropdown.contains(event.target)) {
              closeDropdown();
            }
          };

          // Add click handler for dropdown items (selection)
          const handleDropdownItemClick = (event) => {
            // Check if clicked element is a dropdown item (li or button inside dropdown)
            const clickedItem = event.target.closest("li");
            if (clickedItem && dropdown.contains(clickedItem)) {
              // Close dropdown after selection
              setTimeout(() => closeDropdown(), 100);
            }
          };

          // Add the event listeners after a small delay to avoid immediate closure
          setTimeout(() => {
            document.addEventListener("click", handleClickOutside);
            document.addEventListener("click", handleDropdownItemClick);
          }, 50);

          // Also focus on the search input for better UX
          const searchInput = dropdownContent.querySelector("input");
          if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
          }
        }
      }
    }, 100);
  };
  const handleSavePreFunctionData = () => {
    if (!isEqual(preToolData, preFunctionData)) {
      const { _id, ...dataToSend } = preToolData;
      dispatch(
        updateFuntionApiAction({
          function_id: preFunctionId,
          dataToSend: dataToSend,
        })
      );
      setPreToolData("");
    }
    if (!isEqual(variablesPath, variables_path[preFunctionName])) {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: { variables_path: { [preFunctionName]: variablesPath } },
        })
      );
    }
  };

  return (
    <>
      <div id="pre-embed-list-container">
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
        />

        <div id="pre-embed-list-content" className="w-full mt-4 gap-2 flex flex-col px-2 py-2 cursor-default">
          {bridgePreFunctions.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <div id="pre-embed-header-wrapper" className="flex items-center gap-2 group">
                <InfoTooltip tooltipContent="A prefunction prepares data before passing it to the main function for the GPT call.">
                  <div className="flex items-center gap-1 cursor-help">
                    <p className="text-sm whitespace-nowrap">Pre Functions</p>
                  </div>
                </InfoTooltip>
              </div>
            </div>
          )}
          {bridgePreFunctions.length === 0 && (
            <div id="pre-embed-empty-dropdown" className="dropdown dropdown-end w-full max-w-md">
              <div className="border-2 border-base-200 border-dashed text-center">
                <InfoTooltip tooltipContent="A prefunction prepares data before passing it to the main function for the GPT call.">
                  <button
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
              />
            </div>
          )}
          <div className="flex flex-col gap-2 w-full">
            {/* Render pre-tool cards */}
            {bridgePreFunctions.length > 0 && (
              <div id="pre-embed-functions-container" className="w-full max-w-md">
                <RenderEmbed
                  isPublished={isPublished}
                  isEditor={isEditor}
                  bridgeFunctions={bridgePreFunctions}
                  integrationData={integrationData}
                  getStatusClass={getStatusClass}
                  handleOpenModal={handleOpenModal}
                  embedToken={embedToken}
                  params={params}
                  name="preFunction"
                  handleRemoveEmbed={removePreFunction}
                  handleOpenDeleteModal={handleOpenDeleteModal}
                  handleChangePreTool={handleChangePreTool}
                  halfLength={1}
                />
                {bridgePreFunctions.length > 0 && (
                  <div id="pre-embed-add-more-dropdown" className="dropdown dropdown-right">
                    <EmbedListSuggestionDropdownMenu
                      params={params}
                      searchParams={searchParams}
                      name={"preFunction"}
                      hideCreateFunction={false}
                      onSelect={onFunctionSelect}
                      connectedFunctions={bridge_pre_tools}
                      shouldToolsShow={true}
                      modelName={model}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PreEmbedList;
