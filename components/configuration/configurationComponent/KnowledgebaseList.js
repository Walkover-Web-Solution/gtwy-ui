import { useCustomSelector } from "@/customHooks/customSelector";
import { AddIcon, TrashIcon } from "@/components/Icons";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { GetFileTypeIcon, openModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";
import KnowledgeBaseModal from "@/components/modals/KnowledgeBaseModal";
import { truncate } from "@/components/historyPageComponents/AssistFile";
import OnBoarding from "@/components/OnBoarding";
import TutorialSuggestionToast from "@/components/TutorialSuggestoinToast";
import InfoTooltip from "@/components/InfoTooltip";
import { getAllKnowBaseDataAction } from "@/store/action/knowledgeBaseAction";
import DeleteModal from "@/components/UI/DeleteModal";
import useTutorialVideos from "@/hooks/useTutorialVideos";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { CircleQuestionMark } from "lucide-react";

const KnowledgebaseList = ({ params, searchParams, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  // Use the tutorial videos hook
  const { getKnowledgeBaseVideo } = useTutorialVideos();

  const { knowledgeBaseData, knowbaseVersionData, shouldToolsShow } = useCustomSelector((state) => {
    const modelReducer = state?.modelReducer?.serviceModels;
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

    // Use bridgeData when isPublished=true, otherwise use versionData
    const activeData = isPublished ? bridgeDataFromState : versionData;
    const serviceName = activeData?.service;
    const modelTypeName = activeData?.configuration?.type?.toLowerCase();
    const modelName = activeData?.configuration?.model;

    return {
      knowledgeBaseData: state?.knowledgeBaseReducer?.knowledgeBaseData?.[params?.org_id] || [],
      knowbaseVersionData: isPublished ? bridgeDataFromState?.doc_ids || [] : versionData?.doc_ids || [],
      shouldToolsShow: modelReducer?.[serviceName]?.[modelTypeName]?.[modelName]?.validationConfig?.tools,
    };
  });

  const [selectedKnowledgebase, setSelectedKnowledgebase] = useState(null);
  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE?.DELETE_KNOWLEDGE_BASE_MODAL);
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const [tutorialState, setTutorialState] = useState({
    showTutorial: false,
    showSuggestion: false,
  });
  const handleInputChange = (e) => {
    setSearchQuery(e.target?.value || "");
  };
  const handleAddKnowledgebase = (id) => {
    // Find the knowledge base item to get collectionId
    const knowledgeBaseItem = knowledgeBaseData?.find((item) => item._id === id);
    if (!knowledgeBaseItem) return;

    // Check if ID already exists in the current doc_ids
    const existingItem = knowbaseVersionData?.find((item) =>
      typeof item === "string" ? item === id : item.resource_id === id
    );
    if (existingItem) return;

    // Format the new item with collection_id and resource_id
    const newDocItem = {
      collection_id: knowledgeBaseItem.collectionId,
      resource_id: id,
      description: knowledgeBaseItem.description,
    };

    dispatch(
      updateBridgeVersionAction({
        versionId: searchParams?.version,
        dataToSend: { doc_ids: [...(knowbaseVersionData || []), newDocItem] },
      })
    );
    // Close dropdown after selection
    setTimeout(() => {
      if (typeof document !== "undefined") {
        document.activeElement?.blur?.();
      }
    }, 0);
  };
  const handleDeleteKnowledgebase = async (item) => {
    await executeDelete(async () => {
      return dispatch(
        updateBridgeVersionAction({
          versionId: searchParams?.version,
          dataToSend: {
            doc_ids: knowbaseVersionData.filter((docItem) => {
              // Handle both old format (string) and new format (object)
              if (typeof docItem === "string") {
                return docItem !== item?._id;
              } else {
                return docItem.resource_id !== item?._id;
              }
            }),
          },
        })
      );
    });
  };
  const handleOpenDeleteModal = (item) => {
    setSelectedKnowledgebase(item);
    openModal(MODAL_TYPE?.DELETE_KNOWLEDGE_BASE_MODAL);
  };

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === "rag") {
        if (e.data?.status == "create") {
          dispatch(getAllKnowBaseDataAction(params.org_id));
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [params.org_id]);

  const hasKnowledgebases = (Array.isArray(knowbaseVersionData) ? knowbaseVersionData : []).length > 0;
  const knowledgebaseDropdownContent = !tutorialState?.showTutorial && (
    <ul
      id="knowledgebase-dropdown"
      tabIndex={0}
      className="menu menu-dropdown-toggle dropdown-content z-high px-4 shadow bg-base-100 rounded-box w-72 max-h-96 overflow-y-auto pb-1"
    >
      <div className="flex flex-col gap-2 w-full">
        <li className="text-sm font-semibold disabled">Available Knowledge Bases</li>
        <input
          id="knowledgebase-search-input"
          type="text"
          placeholder="Search Knowledge Base"
          value={searchQuery}
          onChange={handleInputChange}
          className="input input-bordered w-full input-sm"
        />
        {(Array.isArray(knowledgeBaseData) ? knowledgeBaseData : [])
          .filter((item) => {
            const matchesSearch = item?.title?.toLowerCase()?.includes(searchQuery?.toLowerCase());
            // Check if item already exists in knowbaseVersionData (handle both old and new format)
            const alreadyExists = knowbaseVersionData?.some((docItem) => {
              if (typeof docItem === "string") {
                return docItem === item?._id;
              } else {
                return docItem.resource_id === item?._id;
              }
            });
            return matchesSearch && !alreadyExists;
          })
          .map((item) => (
            <li
              id={`knowledgebase-dropdown-item-${item?._id}`}
              key={item?._id}
              onClick={() => handleAddKnowledgebase(item?._id)}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                  {GetFileTypeIcon(item?.url?.includes(".pdf") ? "pdf" : "document", 16, 16)}
                  {item?.title?.length > 20 ? (
                    <div className="tooltip" data-tip={item?.title}>
                      {truncate(item?.title, 20)}
                    </div>
                  ) : (
                    truncate(item?.title, 20)
                  )}
                </div>
              </div>
            </li>
          ))}
        <li
          id="knowledgebase-add-new-button"
          className="py-2 border-t border-base-300 w-full sticky bottom-0 bg-base-100"
          onClick={() => {
            if (window.openRag) {
              window.openRag();
            } else {
              openModal(MODAL_TYPE?.KNOWLEDGE_BASE_MODAL);
            }
            if (typeof document !== "undefined") {
              document.activeElement?.blur?.();
            }
          }}
        >
          <div>
            <AddIcon size={16} />
            <p className="font-semibold">Add new Knowledge Base</p>
          </div>
        </li>
      </div>
    </ul>
  );

  const renderKnowledgebase = useMemo(() => {
    const knowledgebaseItems = (Array.isArray(knowbaseVersionData) ? knowbaseVersionData : [])
      ?.map((docItem, index) => {
        // Handle both old format (string) and new format (object)
        let resourceId, _collectionId;
        if (typeof docItem === "string") {
          resourceId = docItem;
          _collectionId = null;
        } else {
          resourceId = docItem.resource_id;
          _collectionId = docItem.collection_id;
        }

        const item = knowledgeBaseData?.find((kb) => kb._id === resourceId);
        return item ? (
          <div
            id={`knowledgebase-card-${item._id}`}
            key={resourceId || index}
            className={`group flex items-center border border-base-200 cursor-pointer bg-base-100 relative min-h-[44px] w-full ${item?.description?.trim() === "" ? "border-red-600" : ""}transition-colors duration-200`}
          >
            <div className="flex items-center gap-2 w-full ml-2">
              {GetFileTypeIcon(item?.url?.includes(".pdf") ? "pdf" : "document", 16, 16)}
              <div className="flex items-center gap-2 w-full">
                {item?.title?.length > 24 ? (
                  <div className="tooltip tooltip-top min-w-0" data-tip={item?.title}>
                    <span className="min-w-0 text-sm truncate text-left">
                      <span className="truncate text-sm font-normal block w-[300px]">{item?.title}</span>
                    </span>
                  </div>
                ) : (
                  <span className="min-w-0 text-sm truncate text-left">
                    <span className="truncate text-sm font-normal block w-[300px]">{item?.title}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Remove button that appears on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 pr-2 flex-shrink-0">
              <button
                id={`knowledgebase-delete-button-${item._id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDeleteModal(item);
                }}
                className="btn btn-ghost btn-sm p-1 hover:bg-red-100 hover:text-error"
                title="Remove"
                disabled={isReadOnly}
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        ) : null;
      })
      .filter(Boolean);

    return <div className={`grid gap-2 w-full max-w-md`}>{knowledgebaseItems}</div>;
  }, [knowbaseVersionData, knowledgeBaseData]);
  return (
    <div className="w-full gap-2 flex flex-col px-2 py-2 cursor-default">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm whitespace-nowrap">Knowledge Base</p>
          <InfoTooltip tooltipContent="A Knowledge Base stores helpful info like docs and FAQs. Agents use it to give accurate answers without hardcoding, and it's easy to update.">
            <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
          </InfoTooltip>
        </div>
      </div>
      {tutorialState?.showSuggestion && (
        <TutorialSuggestionToast
          setTutorialState={setTutorialState}
          flagKey={"knowledgeBase"}
          TutorialDetails={"KnowledgeBase Configuration"}
        />
      )}
      {tutorialState?.showTutorial && (
        <OnBoarding
          setShowTutorial={() => setTutorialState((prev) => ({ ...prev, showTutorial: false }))}
          video={getKnowledgeBaseVideo()}
          flagKey={"knowledgeBase"}
        />
      )}
      <div className="flex flex-col gap-2 w-full ">
        {!hasKnowledgebases ? (
          <div className="dropdown dropdown-end w-full max-w-md">
            <div className="border-2 border-base-200 border-dashed p-4 text-center">
              <p className="text-sm text-base-content/70">No knowledge base found.</p>
              <button
                id="knowledgebase-add-button"
                tabIndex={0}
                className="flex items-center justify-center gap-1 mt-3 text-base-content hover:text-base-content/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
                disabled={!shouldToolsShow || isReadOnly}
              >
                <AddIcon className="w-3 h-3" />
                Add
              </button>
            </div>
            {knowledgebaseDropdownContent}
          </div>
        ) : (
          <>
            {renderKnowledgebase}
            {hasKnowledgebases && (
              <div className="dropdown dropdown-end w-full max-w-md">
                <div className="border-2 border-base-200 border-dashed text-center">
                  <button
                    id="knowledgebase-add-button"
                    tabIndex={0}
                    className="flex items-center justify-center gap-1 p-2 text-base-content/50 hover:text-base-content/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
                    disabled={isReadOnly}
                  >
                    <AddIcon className="w-3 h-3" />
                    Add Knowledge Base
                  </button>
                </div>
                {knowledgebaseDropdownContent}
              </div>
            )}
          </>
        )}
      </div>
      <DeleteModal
        onConfirm={handleDeleteKnowledgebase}
        item={selectedKnowledgebase}
        name="knowledgebase"
        title="Are you sure?"
        description="This action Remove the selected Knowledgebase from the Agent."
        buttonTitle="Remove"
        modalType={MODAL_TYPE?.DELETE_KNOWLEDGE_BASE_MODAL}
        loading={isDeleting}
        isAsync={true}
      />
      <KnowledgeBaseModal
        params={params}
        searchParams={searchParams}
        knowbaseVersionData={knowbaseVersionData}
        addToVersion={true}
      />
    </div>
  );
};

export default KnowledgebaseList;
