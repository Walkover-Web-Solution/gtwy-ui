"use client";
import React, { useState, useEffect, use, useCallback } from "react";
import { MODAL_TYPE } from "@/utils/enums";
import CustomTable from "@/components/customTable/CustomTable";
import MainLayout from "@/components/layoutComponents/MainLayout";
import PageHeader from "@/components/Pageheader";
import { useCustomSelector } from "@/customHooks/customSelector";
import { toggleSidebar, formatRelativeTime, formatDate, openModal } from "@/utils/utility";
import SearchItems from "@/components/UI/SearchItems";
import RAGEmbedGuideSlider from "@/components/sliders/RAGEmbedGuideSlider";
import IntegrationModal from "@/components/modals/IntegrationModal";
import Protected from "@/components/Protected";

export const runtime = "edge";

const Page = ({ params }) => {
  const resolvedParams = use(params);

  const { integrationData, descriptions, linksData } = useCustomSelector((state) => ({
    integrationData: state?.integrationReducer?.integrationData?.[resolvedParams?.org_id] || [],
    descriptions: state.flowDataReducer.flowData?.descriptionsData?.descriptions || {},
    linksData: state.flowDataReducer.flowData.linksData || [],
  }));

  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [ragEmbedIntegrations, setRagEmbedIntegrations] = useState([]); // Type-filtered integrations
  const [filterIntegration, setFilterIntegration] = useState([]); // Search-filtered integrations

  // Filter to show only rag_embed type integrations
  useEffect(() => {
    const filtered = integrationData.filter((item) => item.type === "rag_embed");
    setRagEmbedIntegrations(filtered);
    setFilterIntegration(filtered); // Initialize search filter with all rag_embed integrations
  }, [integrationData]);

  const tableData = (filterIntegration || [])?.map((item, index) => ({
    id: item._id,
    actualName: item?.name,
    name: (
      <div className="flex gap-2">
        <div className="tooltip" data-tip={item.name}>
          {item.name}
        </div>
      </div>
    ),
    createdAt: item.created_at ? (
      <div className="group cursor-help">
        <span className="group-hover:hidden">{formatRelativeTime(item.created_at)}</span>
        <span className="hidden group-hover:inline">{formatDate(item.created_at)}</span>
      </div>
    ) : (
      "No records found"
    ),
    createdAt_original: item.created_at,
    embed_id: item?.folder_id,
    originalName: item?.name,
    org_id: item?.org_id,
    embed_limit: item?.folder_limit,
    embed_usage: item?.folder_usage ? parseFloat(item.folder_usage).toFixed(4) : 0,
    originalItem: item,
  }));

  const toggleRAGEmbedGuideSlider = useCallback(() => {
    toggleSidebar("rag-embed-guide-slider", "right");
  }, []);

  const handleClickIntegration = (item) => {
    setSelectedIntegration(item);
    toggleRAGEmbedGuideSlider();
  };

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="px-2 pt-4">
        <MainLayout>
          <div className="flex flex-col sm:flex-row">
            <PageHeader
              title="RAG Embed Integration"
              docLink={linksData?.find((link) => link.title === "RAG as Embed")?.blog_link}
              description={
                descriptions?.["RAG Embed"] ||
                "Embedded RAG allows you to seamlessly integrate the full RAG AI interface directly into any product or website."
              }
            />
          </div>
        </MainLayout>

        {/* Controls Section */}
        <div className="w-full">
          <div className="flex flex-row gap-4">
            {ragEmbedIntegrations?.length > 5 && (
              <SearchItems data={ragEmbedIntegrations} setFilterItems={setFilterIntegration} item="RAG Embed" />
            )}
            <div className={`flex-shrink-0 ${ragEmbedIntegrations?.length > 5 ? "mr-2" : "ml-2"}`}>
              <button className="btn btn-primary btn-sm mr-2" onClick={() => openModal(MODAL_TYPE.INTEGRATION_MODAL)}>
                + Create New RAG Embed
              </button>
            </div>
          </div>
        </div>
      </div>

      {filterIntegration.length > 0 ? (
        <div className="w-full overflow-visible">
          <CustomTable
            data={tableData}
            columnsToShow={["name", "embed_id", "createdAt"]}
            sorting
            sortingColumns={["name", "createdAt"]}
            keysToWrap={["name", "description"]}
            handleRowClick={(data) => handleClickIntegration(data)}
            keysToExtractOnRowClick={["org_id", "embed_id"]}
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No RAG Embed entries found</p>
        </div>
      )}

      <IntegrationModal params={resolvedParams} type="rag_embed" />
      <RAGEmbedGuideSlider
        data={selectedIntegration}
        handleCloseSlider={toggleRAGEmbedGuideSlider}
        params={resolvedParams}
      />
    </div>
  );
};

export default Protected(Page);
