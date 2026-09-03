"use client";
import CustomTable from "@/components/customTable/CustomTable";
import PageHeader from "@/components/Pageheader";
import { useCustomSelector } from "@/customHooks/customSelector";
import { MODAL_TYPE } from "@/utils/enums";
import React, { useEffect, useState, use } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layoutComponents/MainLayout";
import { openModal, closeModal, formatRelativeTime, formatDate } from "@/utils/utility";
import IntegrationModal from "@/components/modals/IntegrationModal";
import SearchItems from "@/components/UI/SearchItems";
import { EllipsisIcon, RefreshIcon } from "@/components/Icons";
import { ClockFading, Pencil } from "lucide-react";
import Modal from "@/components/UI/Modal";
import UsageLimitModal from "@/components/modals/UsageLimitModal";
import { updateIntegrationDataAction } from "@/store/action/integrationAction";
import { toast } from "react-toastify";
import usePortalDropdown from "@/customHooks/usePortalDropdown";

export const runtime = "edge";

const Page = ({ params }) => {
  const resolvedParams = use(params);
  const router = useRouter();

  const dispatch = useDispatch();
  const { integrationData, descriptions, linksData, isOrgBlocked } = useCustomSelector((state) => ({
    integrationData: state?.integrationReducer?.integrationData?.[resolvedParams?.org_id] || [],
    descriptions: state.flowDataReducer.flowData?.descriptionsData?.descriptions || {},
    linksData: state.flowDataReducer.flowData.linksData || [],
    isOrgBlocked: state?.userDetailsReducer?.blockedOrgIds?.includes(resolvedParams?.org_id) || false,
  }));

  const [embedIntegrations, setEmbedIntegrations] = useState([]); // Type-filtered integrations
  const [filterIntegration, setFilterIntegration] = useState([]); // Search-filtered integrations
  const [selectedIntegrationForLimit, setSelectedIntegrationForLimit] = useState(null);
  const [renameIntegration, setRenameIntegration] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [currentName, setCurrentName] = useState("");

  const handleOpenRenameModal = (row) => {
    setRenameIntegration(row);
    setCurrentName(row?.originalName || "");
    setTimeout(() => {
      const dialog = document.getElementById("RENAME_EMBED_MODAL");
      if (dialog && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
    }, 50);
  };

  const handleCloseRenameModal = () => {
    const dialog = document.getElementById("RENAME_EMBED_MODAL");
    if (dialog && typeof dialog.close === "function") {
      dialog.close();
    }
    setRenameIntegration(null);
    setCurrentName("");
  };

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

  const handleClickIntegration = (item) => {
    // Navigate to integration detail page using path params
    router.push(`/org/${resolvedParams.org_id}/integration/${item.embed_id}`);
  };

  const handleSetIntegrationLimit = (item) => {
    // Transform the data to match what UsageLimitModal expects
    const transformedData = {
      ...item,
      item_limit: item.embed_limit,
      item_limit_reset_period: item.originalItem?.folder_limit_reset_period || "",
      actualName: item.actualName || item.originalName,
    };
    setSelectedIntegrationForLimit(transformedData);
    openModal(MODAL_TYPE.API_KEY_LIMIT_MODAL);
  };

  const handleUpdateIntegrationLimit = async (integration, limit, resetPeriod) => {
    closeModal(MODAL_TYPE?.API_KEY_LIMIT_MODAL);
    const dataToSend = {
      ...integration.originalItem,
      folder_limit: limit,
      folder_limit_reset_period: resetPeriod,
    };
    const res = await dispatch(updateIntegrationDataAction(resolvedParams.org_id, dataToSend));
    if (res?.data) toast.success("Integration Usage Limit Updated Successfully");
  };

  const handleRenameIntegration = async () => {
    const newName = currentName.trim();
    if (!newName) {
      toast.error("Name cannot be empty");
      return;
    }
    setIsRenaming(true);
    try {
      const dataToSend = { ...renameIntegration.originalItem, name: newName };
      const res = await dispatch(updateIntegrationDataAction(resolvedParams.org_id, dataToSend));
      if (res?.data) {
        toast.success("Embed renamed successfully");
        handleCloseRenameModal();
      }
    } catch (error) {
      toast.error("Failed to rename embed");
      console.error(error);
    } finally {
      setIsRenaming(false);
    }
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
          <li>
            <a
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePortalCloseImmediate();
                handleOpenRenameModal(row);
              }}
            >
              <Pencil size={16} />
              Rename
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
    <div className="w-full h-screen flex flex-col">
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
      </div>

      {/* Controls Section */}
      <div className="px-4 py-3 flex items-center">
        <div>
          {embedIntegrations?.length > 5 && (
            <SearchItems data={embedIntegrations} setFilterItems={setFilterIntegration} item="Integration" />
          )}
        </div>
        <button
          className="btn btn-primary btn-sm ml-2 mb-2"
          onClick={() => openModal(MODAL_TYPE.INTEGRATION_MODAL)}
          disabled={isOrgBlocked}
          title={isOrgBlocked ? "Your org is blocked. Contact support@gtwy.ai for assistance." : undefined}
        >
          + Create New Embed
        </button>
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
      <UsageLimitModal data={selectedIntegrationForLimit} onConfirm={handleUpdateIntegrationLimit} item="Embed Name" />

      <Modal
        MODAL_ID="RENAME_EMBED_MODAL"
        onClose={handleCloseRenameModal}
        title="Rename Embed"
        description="Provide a new name for this embed integration"
        icon={<Pencil size={16} className="text-trace-gold" />}
        widthClass="w-[min(480px,92vw)]"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={handleCloseRenameModal} disabled={isRenaming}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRenameIntegration}
              disabled={isRenaming || !currentName.trim() || currentName.trim() === renameIntegration?.originalName}
            >
              {isRenaming ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-1"></span>
                  Renaming...
                </>
              ) : (
                "Rename"
              )}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="form-control">
            <input
              key={renameIntegration?._id || "none"}
              type="text"
              className="input input-bordered w-full input-sm"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              maxLength={50}
              autoFocus
              disabled={isRenaming}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !isRenaming &&
                  currentName.trim() &&
                  currentName.trim() !== renameIntegration?.originalName
                ) {
                  handleRenameIntegration();
                }
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Portal components from hook */}
      <PortalStyles />
      <PortalDropdown />
    </div>
  );
};

export default Page;
