"use client";
/* eslint-disable no-commented-code/no-commented-code, unused-imports/no-unused-imports, unused-imports/no-unused-vars */
import CustomTable from "@/components/customTable/CustomTable";
import MainLayout from "@/components/layoutComponents/MainLayout";
import KnowledgeBaseModal from "@/components/modals/KnowledgeBaseModal";
import ResourceChunksModal from "@/components/modals/ResourceChunksModal";
import QueryKnowledgeBaseModal from "@/components/modals/QueryKnowledgeBaseModal";
import PageHeader from "@/components/Pageheader";
import { useCustomSelector } from "@/customHooks/customSelector";
import { deleteResourceAction, getAllKnowBaseDataAction } from "@/store/action/knowledgeBaseAction";
import { KNOWLEDGE_BASE_COLUMNS, MODAL_TYPE } from "@/utils/enums";
import { openModal, formatRelativeTime, formatDate, GetFileTypeIcon } from "@/utils/utility";
import { SquarePenIcon, TrashIcon } from "@/components/Icons";
import React, { useEffect, useState, use, useMemo } from "react";
import { useDispatch } from "react-redux";
import DeleteModal from "@/components/UI/DeleteModal";
import SearchItems from "@/components/UI/SearchItems";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { FileSearch, Folder } from "lucide-react";
import ResourcePage from "@/components/folders/ResourcePage";
import useFolders from "@/hooks/useFolders";
import { useFolderContext } from "@/components/folders/FolderContext";
import { toast } from "react-toastify";

export const runtime = "edge";

const Page = ({ params }) => {
  const resolvedParams = use(params);
  const dispatch = useDispatch();
  const { knowledgeBaseData, descriptions, linksData, isOrgBlocked } = useCustomSelector((state) => ({
    knowledgeBaseData: state?.knowledgeBaseReducer?.knowledgeBaseData?.[resolvedParams?.org_id] || [],
    descriptions: state.flowDataReducer.flowData.descriptionsData?.descriptions || {},
    linksData: state.flowDataReducer.flowData.linksData || [],
    isOrgBlocked: state?.userDetailsReducer?.blockedOrgIds?.includes(resolvedParams?.org_id) || false,
  }));
  const { folders, createFolder, renameFolder, deleteFolder, moveResource } = useFolders(
    "knowledgebase",
    resolvedParams.org_id
  );
  const { activeFolderId, setDraggedResourceId } = useFolderContext();
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState();
  const [filterKnowledgeBase, setFilterKnowledgeBase] = useState(knowledgeBaseData);
  const [selectedDataToDelete, setselectedDataToDelete] = useState(null);
  const [selectedResourceForChunks, setSelectedResourceForChunks] = useState({ id: null, name: null });
  const [selectedResourceForQuery, setSelectedResourceForQuery] = useState(null);
  const { isDeleting, executeDelete } = useDeleteOperation();
  useEffect(() => {
    setFilterKnowledgeBase(knowledgeBaseData);
  }, [knowledgeBaseData]);

  const displayedKnowledgeBase = useMemo(() => {
    return filterKnowledgeBase;
    /* if (activeFolderId === null) return filterKnowledgeBase;
    const getResourceFolderId = (resourceId) => {
      const folder = folders.find((f) => f.config?.resourceIds?.includes(resourceId));
      return folder ? folder._id : null;
    };
    if (activeFolderId === "uncategorized") {
      return filterKnowledgeBase.filter((item) => !getResourceFolderId(item._id));
    }
    return filterKnowledgeBase.filter((item) => getResourceFolderId(item._id) === activeFolderId); */
  }, [filterKnowledgeBase, folders, activeFolderId]);

  const tableData = displayedKnowledgeBase.map((item) => ({
    ...item,
    actualName: item?.title,
    createdAt_original: item?.createdAt,
    name: (
      <div
        className="flex gap-2 cursor-pointer"
        onClick={() => {
          setSelectedResourceForChunks({ id: item._id, name: item.title });
          openModal(MODAL_TYPE.RESOURCE_CHUNKS_MODAL);
        }}
      >
        <div className="tooltip flex items-center gap-2" data-tip={item.title}>
          <span>{GetFileTypeIcon(item?.url?.includes(".pdf") ? "pdf" : "document", 16, 16)}</span>
          <span> {item.title}</span>
        </div>
      </div>
    ),
    description: (
      <div className="text-sm text-base-content max-w-xs">
        {item?.description ? (
          <div className="tooltip" data-tip={item.description}>
            <span className="truncate block">
              {item.description.split(" ").slice(0, 5).join(" ")}
              {item.description.split(" ").length > 5 ? "..." : ""}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 italic">No description</span>
        )}
      </div>
    ),
    chunk: (
      <div className="text-xs text-gray-600">
        <div>Size: {item.settings?.chunkSize || "N/A"}</div>
        {item.settings?.chunkOverlap && <div>Overlap: {item.settings.chunkOverlap}</div>}
      </div>
    ),
    strategy: <div className="text-xs text-gray-600">{item.settings?.strategy || "N/A"}</div>,
    created: (
      <div className="group cursor-help w-[160px]">
        <span className="group-hover:hidden">{formatRelativeTime(item?.createdAt)}</span>
        <span className="hidden group-hover:inline">{formatDate(item?.createdAt)}</span>
      </div>
    ),
    actual_name: item?.title,
    collection_id: item.collection_id,
    _id: item._id,
  }));

  const handleUpdateKnowledgeBase = (item) => {
    const originalItem = knowledgeBaseData.find((kb) => kb._id === item._id);
    setSelectedKnowledgeBase(originalItem);
    openModal(MODAL_TYPE?.KNOWLEDGE_BASE_MODAL);
  };

  const handleDeleteKnowledgebase = async (item) => {
    await executeDelete(async () => {
      return dispatch(deleteResourceAction({ data: { id: item?._id, orgId: resolvedParams?.org_id } }));
    });
  };
  const EndComponent = ({ row }) => {
    return (
      <div className="flex gap-3 justify-center items-center">
        <div
          className="tooltip tooltip-primary"
          data-tip="Test Knowledgebase"
          onClick={() => {
            setSelectedResourceForQuery(row);
            openModal(MODAL_TYPE.QUERY_KNOWLEDGE_BASE_MODAL);
          }}
        >
          <FileSearch strokeWidth={2} size={20} className="cursor-pointer hover:text-primary transition-colors" />
        </div>
        <div
          className="tooltip tooltip-primary"
          data-tip="delete"
          onClick={() => {
            setselectedDataToDelete(row);
            openModal(MODAL_TYPE.DELETE_MODAL);
          }}
        >
          <TrashIcon strokeWidth={2} size={20} />
        </div>
        <div className="tooltip tooltip-primary" data-tip="Update" onClick={() => handleUpdateKnowledgeBase(row)}>
          <SquarePenIcon size={20} />
        </div>
        {/* <div className="dropdown dropdown-left">
          <label tabIndex={0} className="btn btn-ghost btn-xs btn-circle text-base-content/70 hover:bg-base-300">
            <Folder size={14} />
          </label>
          <div tabIndex={0} className="dropdown-content z-[100] mt-2">
            <MoveToFolderMenu
              folders={folders}
              currentFolderId={(() => {
                const folder = Array.isArray(folders) ? folders.find((f) => f && f.config?.resourceIds?.includes(row._id)) : null;
                return folder ? folder._id : null;
              })()}
              onMove={(folderId) => moveResource(row._id, folderId)}
            />
          </div>
        </div> */}
      </div>
    );
  };

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === "rag") {
        if (e.data?.status === "create") {
          dispatch(getAllKnowBaseDataAction(resolvedParams.org_id));
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [resolvedParams.org_id]);

  return (
    <div className="flex w-full min-h-screen">
      <div className="w-full flex-1 overflow-x-hidden flex flex-col">
        <div className="px-2 pt-4">
          <MainLayout>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full gap-2">
              <PageHeader
                title="Knowledge Base"
                description={
                  descriptions?.["Knowledge Base"] ||
                  "A knowledge Base is a collection of useful info like docs and FAQs. You can add it via files, URLs, or websites. Agents use this data to generate dynamic, context-aware responses without hardcoding."
                }
                docLink={linksData?.find((link) => link.title === "Knowledge Base")?.blog_link}
              />
            </div>
          </MainLayout>
          <div className="flex flex-row flex-wrap gap-4 px-4 pb-3 items-center">
            {knowledgeBaseData?.length > 5 && (
              <SearchItems data={knowledgeBaseData} setFilterItems={setFilterKnowledgeBase} item="KnowledgeBase" />
            )}
            <div className={`flex-shrink-0 ${knowledgeBaseData?.length > 5 ? "mr-2" : "ml-2"}`}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (isOrgBlocked) {
                    toast.error(
                      "Your org is blocked. You cannot create knowledge bases. Contact support@gtwy.ai for assistance."
                    );
                    return;
                  }
                  if (window.openRag) {
                    window.openRag();
                  } else {
                    openModal(MODAL_TYPE?.KNOWLEDGE_BASE_MODAL);
                  }
                }}
                disabled={isOrgBlocked}
                title={isOrgBlocked ? "Your org is blocked. Contact support@gtwy.ai for assistance." : undefined}
              >
                + Create Knowledge Base
              </button>
            </div>
          </div>
        </div>

        {filterKnowledgeBase.length > 0 ? (
          <CustomTable
            data={tableData}
            /* draggableRows={true}
            onDragStart={(row) => setDraggedResourceId(row._id)}
            onDragEnd={() => setDraggedResourceId(null)} */
            columnsToShow={KNOWLEDGE_BASE_COLUMNS}
            sorting
            sortingColumns={["name", "created"]}
            keysToWrap={["name", "description"]}
            endComponent={EndComponent}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No knowledge base entries found</p>
          </div>
        )}

        <KnowledgeBaseModal
          params={resolvedParams}
          selectedResource={selectedKnowledgeBase}
          setSelectedResource={setSelectedKnowledgeBase}
        />
        <ResourceChunksModal resourceId={selectedResourceForChunks.id} resourceName={selectedResourceForChunks.name} />
        <QueryKnowledgeBaseModal resource={selectedResourceForQuery} orgId={resolvedParams.org_id} />
        <DeleteModal
          onConfirm={handleDeleteKnowledgebase}
          item={selectedDataToDelete}
          title="Delete knowledgeBase "
          description={`Are you sure you want to delete the KnowledgeBase "${selectedDataToDelete?.actual_name}"? This action cannot be undone.`}
          loading={isDeleting}
          isAsync={true}
        />
      </div>
    </div>
  );
};

const WrappedPage = (props) => (
  <ResourcePage>
    <Page {...props} />
  </ResourcePage>
);
export default WrappedPage;
