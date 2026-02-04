"use client";
import CustomTable from "@/components/customTable/CustomTable";
import MainLayout from "@/components/layoutComponents/MainLayout";
import KnowledgeBaseModal from "@/components/modals/KnowledgeBaseModal";
import ResourceChunksModal from "@/components/modals/ResourceChunksModal";
import PageHeader from "@/components/Pageheader";
import { useCustomSelector } from "@/customHooks/customSelector";
import { deleteResourceAction, getAllKnowBaseDataAction } from "@/store/action/knowledgeBaseAction";
import { KNOWLEDGE_BASE_COLUMNS, MODAL_TYPE } from "@/utils/enums";
import { openModal, formatRelativeTime, formatDate, GetFileTypeIcon } from "@/utils/utility";
import { SquarePenIcon, TrashIcon } from "@/components/Icons";
import React, { useEffect, useState, use } from "react";
import { useDispatch } from "react-redux";
import DeleteModal from "@/components/UI/DeleteModal";
import SearchItems from "@/components/UI/SearchItems";
import useDeleteOperation from "@/customHooks/useDeleteOperation";

export const runtime = "edge";

const Page = ({ params }) => {
  const resolvedParams = use(params);
  const dispatch = useDispatch();
  const { knowledgeBaseData, descriptions, linksData } = useCustomSelector((state) => ({
    knowledgeBaseData: state?.knowledgeBaseReducer?.knowledgeBaseData?.[resolvedParams?.org_id] || [],
    descriptions: state.flowDataReducer.flowData.descriptionsData?.descriptions || {},
    linksData: state.flowDataReducer.flowData.linksData || [],
  }));
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState();
  const [filterKnowledgeBase, setFilterKnowledgeBase] = useState(knowledgeBaseData);
  const [selectedDataToDelete, setselectedDataToDelete] = useState(null);
  const [selectedResourceForChunks, setSelectedResourceForChunks] = useState({ id: null, name: null });
  const { isDeleting, executeDelete } = useDeleteOperation();
  useEffect(() => {
    setFilterKnowledgeBase(knowledgeBaseData);
  }, [knowledgeBaseData]);
  const tableData = filterKnowledgeBase.map((item) => ({
    ...item,
    actualName: item?.name,
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
    <div className="w-full">
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
        <div className="flex flex-row gap-4">
          {knowledgeBaseData?.length > 5 && (
            <SearchItems data={knowledgeBaseData} setFilterItems={setFilterKnowledgeBase} item="KnowledgeBase" />
          )}
          <div className={`flex-shrink-0 ${knowledgeBaseData?.length > 5 ? "mr-2" : "ml-2"}`}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (window.openRag) {
                  window.openRag();
                } else {
                  openModal(MODAL_TYPE?.KNOWLEDGE_BASE_MODAL);
                }
              }}
            >
              + Create Knowledge Base
            </button>
          </div>
        </div>
      </div>

      {filterKnowledgeBase.length > 0 ? (
        <CustomTable
          data={tableData}
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
      <DeleteModal
        onConfirm={handleDeleteKnowledgebase}
        item={selectedDataToDelete}
        title="Delete knowledgeBase "
        description={`Are you sure you want to delete the KnowledgeBase "${selectedDataToDelete?.actual_name}"? This action cannot be undone.`}
        loading={isDeleting}
        isAsync={true}
      />
    </div>
  );
};

export default Page;
