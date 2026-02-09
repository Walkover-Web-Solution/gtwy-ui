"use client";
import CustomTable from "@/components/customTable/CustomTable";
import PageHeader from "@/components/Pageheader";
import { useCustomSelector } from "@/customHooks/customSelector";
import { MODAL_TYPE } from "@/utils/enums";
import React, { useCallback, useEffect, useState, use } from "react";
import { useDispatch } from "react-redux";
import MainLayout from "@/components/layoutComponents/MainLayout";
import { openModal, toggleSidebar, closeModal, formatRelativeTime, formatDate } from "@/utils/utility";
import IntegrationModal from "@/components/modals/IntegrationModal";
import GtwyIntegrationGuideSlider from "@/components/sliders/GtwyIntegrationGuideSlider";
import SearchItems from "@/components/UI/SearchItems";
import { EllipsisIcon, RefreshIcon } from "@/components/Icons";
import { ClockFading } from "lucide-react";
import UsageLimitModal from "@/components/modals/UsageLimitModal";
import { updateIntegrationDataAction } from "@/store/action/integrationAction";
import { toast } from "react-toastify";
import usePortalDropdown from "@/customHooks/usePortalDropdown";

export const runtime = "edge";

const Page = ({ params }) => {
  const resolvedParams = use(params);

  const dispatch = useDispatch();
  const { integrationData, descriptions, linksData } = useCustomSelector((state) => ({
    integrationData: state?.integrationReducer?.integrationData?.[resolvedParams?.org_id] || [],
    descriptions: state.flowDataReducer.flowData?.descriptionsData?.descriptions || {},
    linksData: state.flowDataReducer.flowData.linksData || [],
  }));

  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [embedIntegrations, setEmbedIntegrations] = useState([]); // Type-filtered integrations
  const [filterIntegration, setFilterIntegration] = useState([]); // Search-filtered integrations
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [selectedIntegrationForLimit, setSelectedIntegrationForLimit] = useState(null);

  // Use portal dropdown hook
  const { handlePortalOpen, handlePortalCloseImmediate, PortalDropdown, PortalStyles } = usePortalDropdown();

  // Filter to show only embed type integrations
  useEffect(() => {
    const filtered = integrationData.filter((item) => item.type === "embed");
    setEmbedIntegrations(filtered);
    setFilterIntegration(filtered); // Initialize search filter with all embed integrations
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

  const toggleGtwyIntegraionSlider = useCallback(() => {
    setIsSliderOpen(!isSliderOpen);
    toggleSidebar("gtwy-integration-slider", "right");
  }, [isSliderOpen]);

  const handleClickIntegration = (item) => {
    setSelectedIntegration(item);
    toggleGtwyIntegraionSlider();
  };

  const handleSetIntegrationLimit = (item) => {
    // Transform the data to match what UsageLimitModal expects
    const transformedData = {
      ...item,
      item_limit: item.embed_limit, // Map integration_limit to bridge_limit
      actualName: item.actualName || item.originalName, // Ensure actualName is available
    };
    setSelectedIntegrationForLimit(transformedData);
    openModal(MODAL_TYPE.API_KEY_LIMIT_MODAL);
  };

  const handleUpdateIntegrationLimit = async (integration, limit) => {
    closeModal(MODAL_TYPE?.API_KEY_LIMIT_MODAL);
    const dataToSend = {
      ...integration.originalItem,
      folder_limit: limit,
    };
    const res = await dispatch(updateIntegrationDataAction(resolvedParams.org_id, dataToSend));
    if (res?.data) toast.success("Integration Usage Limit Updated Successfully");
  };

  const resetUsage = async (integration) => {
    const dataToSend = {
      ...integration.originalItem,
      folder_usage: 0,
    };
    const res = await dispatch(updateIntegrationDataAction(resolvedParams.org_id, dataToSend));
    if (res?.data) toast.success("Integration Usage Reset Successfully");
  };

  const EndComponent = ({ row }) => {
    const handleDropdownClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const dropdownContent = (
        <ul className="menu bg-base-100 rounded-box w-52 p-2 shadow">
          <li>
            <a
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePortalCloseImmediate();
                handleSetIntegrationLimit(row);
              }}
            >
              <ClockFading className="" size={16} />
              Usage Limit
            </a>
          </li>
          {Number(row?.embed_usage) > 0 ? (
            <li>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePortalCloseImmediate();
                  resetUsage(row);
                }}
              >
                <RefreshIcon className="mr-2" size={16} />
                Reset Usage
              </a>
            </li>
          ) : null}
        </ul>
      );

      handlePortalOpen(e.currentTarget, dropdownContent);
    };

    return (
      <div className="flex items-center gap-2">
        <div className="bg-transparent">
          <div role="button" className="hover:bg-base-200 rounded-lg p-3 cursor-pointer" onClick={handleDropdownClick}>
            <EllipsisIcon className="rotate-90" size={16} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="px-2 pt-4">
        <MainLayout>
          <div className="flex flex-col sm:flex-row">
            <PageHeader
              title=" GTWY Embed Integration"
              docLink={
                linksData?.find((link) => link.title === "GTWY as Embed")?.blog_link ||
                "https://gtwy.ai/blogs/features/gtwy-embed--1"
              }
              description={
                descriptions?.["Gtwy as Embed"] ||
                "Embedded GTWY allows you to seamlessly integrate the full GTWY AI interface directly into any product or website."
              }
            />
          </div>
        </MainLayout>

        {/* Controls Section */}

        {/* Content Section */}
        <div className="w-full">
          <div className="flex flex-row gap-4">
            {embedIntegrations?.length > 5 && (
              <SearchItems data={embedIntegrations} setFilterItems={setFilterIntegration} item="Integration" />
            )}
            <div className={`flex-shrink-0 ${embedIntegrations?.length > 5 ? "mr-2" : "ml-2"}`}>
              <button className="btn btn-primary btn-sm mr-2" onClick={() => openModal(MODAL_TYPE.INTEGRATION_MODAL)}>
                + Create New Embed
              </button>
            </div>
          </div>
        </div>
      </div>
      {filterIntegration.length > 0 ? (
        <div className="w-full overflow-visible">
          <CustomTable
            data={tableData}
            columnsToShow={["name", "embed_id", "createdAt", "embed_usage"]}
            sorting
            sortingColumns={["name", "embed_usage", "createdAt"]}
            keysToWrap={["name", "description"]}
            handleRowClick={(data) => handleClickIntegration(data)}
            keysToExtractOnRowClick={["org_id", "embed_id"]}
            endComponent={EndComponent}
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No integration entries found</p>
        </div>
      )}

      <IntegrationModal params={resolvedParams} type="embed" />
      <GtwyIntegrationGuideSlider data={selectedIntegration} handleCloseSlider={toggleGtwyIntegraionSlider} />
      <UsageLimitModal data={selectedIntegrationForLimit} onConfirm={handleUpdateIntegrationLimit} item="Embed Name" />

      {/* Portal components from hook */}
      <PortalStyles />
      <PortalDropdown />
    </div>
  );
};

export default Page;
