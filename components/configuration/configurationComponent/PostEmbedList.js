import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction, updateFuntionApiAction } from "@/store/action/bridgeAction";
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
import { AlertTriangle } from "lucide-react";

const PostEmbedList = ({ params, searchParams, isPublished, isEditor = true, isEmbedUser = false }) => {
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();
  const [postFunctionData, setPostFunctionData] = useState(null);
  const [postFunctionId, setPostFunctionId] = useState(null);
  const [postFunctionName, setPostFunctionName] = useState(null);
  const [postToolData, setPostToolData] = useState(null);
  const [variablesPath, setVariablesPath] = useState({});
  const [showChangePicker, setShowChangePicker] = useState(false);

  const { integrationData, function_data, post_tool, model, embedToken, variables_path } = useCustomSelector(
    (state) => {
      const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
      const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];
      const isPublished = searchParams?.isPublished === "true";
      const orgData = state?.bridgeReducer?.org?.[params?.org_id];

      const activeData = isPublished ? bridgeDataFromState : versionData;
      const modelName = activeData?.configuration?.model;

      return {
        integrationData: orgData?.integrationData || {},
        function_data: orgData?.functionData || {},
        post_tool: activeData?.post_tool || null,
        model: modelName,
        embedToken: orgData?.embed_token,
        variables_path: isPublished ? bridgeDataFromState?.variables_path || {} : versionData?.variables_path || {},
      };
    }
  );

  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE.DELETE_POST_TOOL_MODAL);

  const post_tool_id = post_tool?.id || null;
  const post_tool_args = post_tool?.args || {};

  const bridgePostFunctions = useMemo(() => {
    if (!post_tool_id) return [];
    const fn = function_data?.[post_tool_id];
    if (!fn) return [];
    return [
      {
        _id: post_tool_id,
        ...fn,
        title: fn?.title || "Post Tool",
      },
    ];
  }, [post_tool_id, function_data]);

  const handleOpenModal = (itemId) => {
    const fn = function_data?.[itemId];
    if (!fn) return;

    setPostFunctionId(itemId);
    setPostFunctionName(fn.script_id || fn.title || "");
    setPostToolData(fn);
    setPostFunctionData(fn);

    // Load args from post_tool_args instead of variables_path
    const initialArgs = post_tool_args || {};
    setVariablesPath(initialArgs);

    openModal(MODAL_TYPE.POST_FUNCTION_PARAMETER_MODAL);
  };

  const handleOpenDeleteModal = (itemId, itemScriptId) => {
    setPostFunctionId(itemId);
    setPostFunctionName(itemScriptId || itemId);

    openModal(MODAL_TYPE.DELETE_POST_TOOL_MODAL);
  };

  const onFunctionSelect = (id) => {
    const fn = function_data?.[id];
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: {
          post_tool: {
            id: id,
            script_id: fn?.script_id || id,
            args: {},
          },
        },
      })
    );
  };

  const onChangeFunctionSelect = (id) => {
    const fn = function_data?.[id];
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params?.id,
        versionId: searchParams?.version,
        dataToSend: {
          post_tool: {
            id: id,
            script_id: fn?.script_id || id,
            args: {},
          },
        },
      })
    );
    setShowChangePicker(false);
  };

  const removePostFunction = async () => {
    await executeDelete(async () => {
      return dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: { post_tool: null },
        })
      );
    });
  };

  const handleChangePostTool = () => {
    setShowChangePicker(true);
  };

  const handleSavePostFunctionData = () => {
    // Save function schema changes
    if (!isEqual(postToolData, postFunctionData)) {
      const { _id, ...dataToSend } = postToolData;
      dispatch(updateFuntionApiAction({ function_id: postFunctionId, dataToSend }));
      setPostToolData("");
    }

    // Save args in post_tool object with id and script_id
    const existingArgs = post_tool_args || {};
    if (!isEqual(variablesPath, existingArgs)) {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params.id,
          versionId: searchParams?.version,
          dataToSend: {
            post_tool: {
              id: post_tool_id,
              script_id: post_tool?.script_id || postFunctionData?.script_id || postFunctionName,
              args: variablesPath,
            },
          },
        })
      );
    }
  };

  return (
    <>
      <div data-testid="post-embed-list-container" id="post-embed-list-container">
        <FunctionParameterModal
          isPublished={isReadOnly}
          name="Post Tool"
          functionId={postFunctionId}
          Model_Name={MODAL_TYPE.POST_FUNCTION_PARAMETER_MODAL}
          embedToken={embedToken}
          handleSave={handleSavePostFunctionData}
          toolData={postToolData}
          setToolData={setPostToolData}
          function_details={postFunctionData}
          functionName={postFunctionName}
          variablesPath={variablesPath}
          setVariablesPath={setVariablesPath}
          variables_path={variables_path}
        />
        <DeleteModal
          onConfirm={removePostFunction}
          item={postFunctionId}
          name={postFunctionName}
          title="Are you sure?"
          description={"This action Remove the selected Post Tool from the Agent."}
          buttonTitle="Remove Post Tool"
          modalType={MODAL_TYPE.DELETE_POST_TOOL_MODAL}
          loading={isDeleting}
          isAsync={true}
          warning={deleteWarning}
        />

        <div
          id="post-embed-list-content"
          className="w-full gap-2 flex flex-col cursor-default border border-base-200 p-3 rounded-lg"
        >
          <div className="flex items-center justify-between gap-2">
            <div
              data-testid="post-embed-header-wrapper"
              id="post-embed-header-wrapper"
              className="flex items-center gap-2 group"
            >
              <InfoTooltip tooltipContent="A post tool processes or transforms the AI response after the model call is complete.">
                <div className="flex items-center cursor-help">
                  <p className="text-sm font-medium text-base-content whitespace-nowrap">Post Tool</p>
                </div>
              </InfoTooltip>
            </div>
            <div
              data-testid="post-embed-empty-dropdown"
              id="post-embed-empty-dropdown"
              className="dropdown dropdown-end"
            >
              <button
                data-testid="post-embed-add-button"
                id="post-embed-add-button"
                tabIndex={0}
                className="btn btn-xs btn-outline gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isReadOnly}
              >
                <AddIcon className="w-3 h-3" />
                {bridgePostFunctions.length === 0 ? "Add" : "Change"}
              </button>
              <EmbedListSuggestionDropdownMenu
                params={params}
                searchParams={searchParams}
                name={"postFunction"}
                hideCreateFunction={false}
                onSelect={onFunctionSelect}
                connectedFunctions={post_tool_id ? [post_tool_id] : []}
                shouldToolsShow={true}
                modelName={model}
              />
            </div>
          </div>

          <p className="text-xs text-base-content/60">
            Select a tool that runs after the AI call to process the response.
          </p>

          {bridgePostFunctions.length > 0 && (
            <div className="flex flex-col gap-2 w-full">
              <RenderEmbed
                isPublished={isPublished}
                isEditor={isEditor}
                bridgeFunctions={bridgePostFunctions}
                integrationData={integrationData}
                getStatusClass={getStatusClass}
                handleOpenModal={handleOpenModal}
                embedToken={embedToken}
                params={params}
                versionId={searchParams?.version}
                name="postFunction"
                handleRemoveEmbed={removePostFunction}
                handleOpenDeleteModal={handleOpenDeleteModal}
                handleChangePreTool={handleChangePostTool}
                isChangePreToolDropdownOpen={showChangePicker}
                halfLength={1}
                maxTitleLength={null}
              />
              {showChangePicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowChangePicker(false)} />
                  <div
                    data-testid="post-embed-add-more-dropdown"
                    id="post-embed-add-more-dropdown"
                    className={`dropdown dropdown-right ${showChangePicker ? "dropdown-open" : ""}`}
                  >
                    <EmbedListSuggestionDropdownMenu
                      params={params}
                      searchParams={searchParams}
                      name={"postFunction"}
                      hideCreateFunction={false}
                      onSelect={onChangeFunctionSelect}
                      connectedFunctions={post_tool_id ? [post_tool_id] : []}
                      shouldToolsShow={true}
                      modelName={model}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-warning flex-shrink-0" />
                <p className="text-xs text-warning">Post-Tool won't run when streaming is enabled.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PostEmbedList;
