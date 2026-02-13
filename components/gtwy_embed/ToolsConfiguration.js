import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Wrench, Plus, RefreshCw } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getAllFunctions, updateFuntionApiAction } from "@/store/action/bridgeAction";
import { isEqual } from "lodash";
import EmbedListSuggestionDropdownMenu from "../configuration/configurationComponent/EmbedListSuggestionDropdownMenu";
import { openModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import FunctionParameterModal from "../configuration/configurationComponent/FunctionParameterModal";
import RenderEmbed from "../configuration/configurationComponent/RenderEmbed";

const ToolsConfiguration = ({
  selectedTools = [],
  onToolsChange,
  orgId,
  params,
  configuration,
  onConfigChange,
  // Single-tool mode props
  singleToolMode = false,
  selectedToolId = null,
  onToolChange = null,
  title = "Tools Configuration",
  modalType = MODAL_TYPE.TOOL_FUNCTION_PARAMETER_MODAL,
}) => {
  const dispatch = useDispatch();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFunctionId, setSelectedFunctionId] = useState(null);
  const [selectedFunctionData, setSelectedFunctionData] = useState({});
  const [toolData, setToolData] = useState({});
  const [variablesPath, setVariablesPath] = useState({});
  const [functionName, setFunctionName] = useState("");

  const { allFunctions, integrationData } = useCustomSelector((state) => {
    const orgData = state?.bridgeReducer?.org?.[orgId];
    return {
      allFunctions: orgData?.functionData || {},
      integrationData: orgData?.integrationData || {},
    };
  });

  useEffect(() => {
    if (Object.keys(allFunctions).length === 0) {
      dispatch(getAllFunctions());
    }
  }, [dispatch, allFunctions]);

  const handleSelectFunction = (functionId) => {
    if (singleToolMode) {
      // Single-tool mode: replace the selected tool
      if (onToolChange) {
        onToolChange(functionId);
      }
    } else {
      // Multi-tool mode: add to array
      if (!selectedTools.includes(functionId)) {
        onToolsChange([...selectedTools, functionId]);
      }
    }
    setIsDropdownOpen(false);
  };

  const handleRemoveFunction = (functionId) => {
    // Get the function name to remove its variable_path
    const fn = allFunctions[functionId];
    const fnName = fn?.script_id;

    if (singleToolMode) {
      // Single-tool mode: clear the selected tool
      if (onToolChange) {
        onToolChange(null);
      }
    } else {
      // Multi-tool mode: remove from array
      onToolsChange(selectedTools.filter((id) => id !== functionId));
    }

    // Remove variable_path for this function if it exists
    if (fnName && onConfigChange) {
      const currentVariablesPath = configuration?.variables_path || {};
      if (currentVariablesPath[fnName]) {
        const { [fnName]: removed, ...remainingVariablesPath } = currentVariablesPath;
        onConfigChange("variables_path", remainingVariablesPath);
      }
    }
  };

  const handleOpenConfigModal = (functionId) => {
    const fn = allFunctions[functionId];
    setSelectedFunctionId(functionId);
    setSelectedFunctionData(fn);
    setToolData(fn);
    const fnName = fn?.script_id;
    setFunctionName(fnName);

    // Get variables path from configuration if available
    const currentVariablesPath = configuration?.variables_path || {};
    const initialVariablesPath = currentVariablesPath[fnName] || {};
    setVariablesPath(initialVariablesPath);

    openModal(modalType);
  };

  const handleSaveFunctionData = useCallback(
    (functionId) => {
      // Use the functionId passed from modal or fall back to state
      const fnId = functionId || selectedFunctionId;
      const fnName = toolData?.script_id || functionName;

      if (!isEqual(toolData, selectedFunctionData)) {
        const { _id, ...dataToSend } = toolData;
        dispatch(
          updateFuntionApiAction({
            function_id: fnId,
            dataToSend: dataToSend,
          })
        );
        setToolData({});
      }

      // Update variables_path if it changed
      const currentVariablesPath = configuration?.variables_path || {};
      const existingVariablesPath = currentVariablesPath[fnName] || {};

      if (!isEqual(variablesPath, existingVariablesPath) && fnName && onConfigChange) {
        const updatedVariablesPath = {
          ...currentVariablesPath,
          [fnName]: variablesPath,
        };
        onConfigChange("variables_path", updatedVariablesPath);
      }
    },
    [
      toolData,
      selectedFunctionData,
      selectedFunctionId,
      functionName,
      configuration,
      variablesPath,
      onConfigChange,
      dispatch,
    ]
  );

  const selectedFunctionsData = useMemo(() => {
    if (singleToolMode) {
      // Single-tool mode: return array with single tool or empty
      return selectedToolId && allFunctions[selectedToolId] ? [allFunctions[selectedToolId]] : [];
    } else {
      // Multi-tool mode: return all selected tools
      const mapped = selectedTools
        .map((id) => {
          return allFunctions[id];
        })
        .filter(Boolean);
      return mapped;
    }
  }, [singleToolMode, selectedToolId, selectedTools, allFunctions]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-primary" />
          <h5 className="text-sm font-semibold">{title}</h5>
        </div>
        <div className="dropdown dropdown-end flex-shrink-0">
          <button
            type="button"
            tabIndex={0}
            className={`btn btn-xs gap-1 ${singleToolMode && selectedToolId ? "btn-primary" : "btn-outline"}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {singleToolMode && selectedToolId ? <RefreshCw size={12} /> : <Plus size={12} />}
            {singleToolMode && selectedToolId ? "Change" : "Add"}
          </button>
          {isDropdownOpen && (
            <EmbedListSuggestionDropdownMenu
              params={params}
              searchParams={{}}
              name="tools"
              hideCreateFunction={false}
              onSelect={handleSelectFunction}
              onSelectPrebuiltTool={() => {}}
              connectedFunctions={singleToolMode ? (selectedToolId ? [selectedToolId] : []) : selectedTools}
              shouldToolsShow={true}
              modelName=""
              prebuiltToolsData={[]}
              toolsVersionData={[]}
              showInbuiltTools={{}}
              tutorialState={{ showSuggestion: false, showTutorial: false }}
              setTutorialState={() => {}}
              isPublished={false}
              isEditor={true}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-base-content/70">
          {singleToolMode
            ? "Select a pre-built tool for this integration."
            : "Select functions/tools that will be available in this integration."}
        </p>
      </div>

      {selectedFunctionsData.length > 0 ? (
        <RenderEmbed
          bridgeFunctions={selectedFunctionsData}
          integrationData={integrationData}
          getStatusClass={() => "bg-gray-100"}
          handleOpenModal={handleOpenConfigModal}
          embedToken=""
          params={params}
          handleRemoveEmbed={handleRemoveFunction}
          handleOpenDeleteModal={(functionId) => handleRemoveFunction(functionId)}
          handleChangePreTool={null}
          name="tools"
          halfLength={selectedFunctionsData.length}
          isPublished={false}
          isEditor={true}
        />
      ) : (
        <div className="bg-base-200 rounded-lg p-4 text-center">
          <p className="text-sm text-base-content/60">No tools added</p>
        </div>
      )}

      {/* Function Parameter Modal */}
      <FunctionParameterModal
        isPublished={false}
        isEditor={true}
        name={modalType === MODAL_TYPE.PRE_FUNCTION_PARAMETER_MODAL ? "Pre Tool" : "Tool"}
        functionId={selectedFunctionId}
        Model_Name={modalType}
        embedToken=""
        handleSave={handleSaveFunctionData}
        toolData={toolData}
        setToolData={setToolData}
        function_details={selectedFunctionData}
        variables_path={configuration?.variables_path || {}}
        functionName={functionName}
        setVariablesPath={setVariablesPath}
        variablesPath={variablesPath}
      />
    </div>
  );
};

export default ToolsConfiguration;
