"use client";
import CustomTable from "@/components/customTable/CustomTable";
import MainLayout from "@/components/layoutComponents/MainLayout";
import ApiKeyModal from "@/components/modals/ApiKeyModal";
import PageHeader from "@/components/Pageheader";
import { useCustomSelector } from "@/customHooks/customSelector";
import { deleteApikeyAction, updateApikeyAction } from "@/store/action/apiKeyAction";
import { API_KEY_COLUMNS, MODAL_TYPE } from "@/utils/enums";
import { formatDate, formatRelativeTime, getIconOfService, openModal, toggleSidebar } from "@/utils/utility";
import { BookIcon, RefreshIcon, SquarePenIcon, TrashIcon } from "@/components/Icons";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import DeleteModal from "@/components/UI/DeleteModal";
import SearchItems from "@/components/UI/SearchItems";
import ApiKeyGuideSlider from "@/components/configuration/configurationComponent/ApiKeyGuide";
import ConnectedAgentsModal from "@/components/modals/ConnectedAgentsModal";
import { toast } from "react-toastify";
import useDeleteOperation from "@/customHooks/useDeleteOperation";

export const runtime = "edge";

const Page = () => {
  const pathName = usePathname();
  const dispatch = useDispatch();
  const path = pathName?.split("?")[0].split("/");
  const orgId = path[2] || "";
  const { apikeyData, descriptions, linksData } = useCustomSelector((state) => ({
    apikeyData: state?.apiKeysReducer?.apikeys?.[orgId] || [],
    descriptions: state.flowDataReducer.flowData.descriptionsData?.descriptions || {},
    linksData: state.flowDataReducer.flowData.linksData || [],
  }));
  const [filterApiKeys, setFilterApiKeys] = useState(apikeyData);

  useEffect(() => {
    setFilterApiKeys(apikeyData);
  }, [apikeyData]);

  const [selectedApiKey, setSelectedApiKey] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDataToDelete, setselectedDataToDelete] = useState(null);
  const selectedService = apikeyData?.find((item) => item._id === selectedApiKey?._id)?.service;
  const [selectedApiKeyForAgents, setSelectedApiKeyForAgents] = useState(null);
  const { isDeleting, executeDelete } = useDeleteOperation();

  useEffect(() => {
    if (selectedApiKeyForAgents) {
      openModal(MODAL_TYPE.CONNECTED_AGENTS_MODAL);
    }
  }, [selectedApiKeyForAgents]);

  const handleUpdateClick = useCallback(
    (item) => {
      setSelectedApiKey(item);
      setIsEditing(true);
      openModal(MODAL_TYPE.API_KEY_MODAL);
    },
    [MODAL_TYPE, openModal]
  );

  const deleteApikey = useCallback(
    async (item) => {
      await executeDelete(async () => {
        return dispatch(
          deleteApikeyAction({
            org_id: item.org_id,
            name: item.name,
            id: item._id,
          })
        );
      });
    },
    [dispatch, executeDelete]
  );

  const showConnectedAgents = useCallback((item) => {
    setSelectedApiKeyForAgents(item);
    openModal(MODAL_TYPE.CONNECTED_AGENTS_MODAL);
  }, []);

  const dataWithIcons = filterApiKeys.map((item) => ({
    ...item,
    actualName: item.name,
    apikey_usage: item?.apikey_usage ? parseFloat(item.apikey_usage).toFixed(4) : 0,
    service: (
      <div className="flex items-center gap-2">
        {getIconOfService(item.service, 18, 18)}
        <span className="capitalize">{item.service}</span>
      </div>
    ),
    last_used: item.last_used ? (
      <div className="group cursor-help">
        <span className="group-hover:hidden">{formatRelativeTime(item.last_used)}</span>
        <span className="hidden group-hover:inline ">{formatDate(item.last_used)}</span>
      </div>
    ) : (
      "No records found"
    ),
    last_used_original: item.last_used,
  }));

  const resetUsage = useCallback(
    async (item) => {
      const dataToSend = {
        name: item.name,
        apikey_object_id: item._id,
        service: apikeyData?.find((api) => api._id === item._id)?.service,
        comment: item.comment,
        apikey_limit: item?.apikey_limit || 1,
        apikey_usage: 0,
        org_id: item.org_id,
      };
      const response = await dispatch(updateApikeyAction(dataToSend));
      if (response) {
        toast.success("API key reset successfully");
      }
    },
    [apikeyData, dispatch]
  );

  const EndComponent = ({ row }) => {
    return (
      <div className="flex gap-3 justify-center items-center" onClick={(e) => e.stopPropagation()}>
        <div
          className="tooltip tooltip-primary"
          data-tip="delete"
          onClick={(e) => {
            e.stopPropagation();
            setselectedDataToDelete(row);
            openModal(MODAL_TYPE.DELETE_MODAL);
          }}
        >
          <TrashIcon size={16} />
        </div>
        <div
          className="tooltip tooltip-primary"
          data-tip="Update"
          onClick={(e) => {
            e.stopPropagation();
            handleUpdateClick(row);
          }}
        >
          <SquarePenIcon size={16} />
        </div>
        {row?.apikey_usage && Number(row?.apikey_usage) > 0 ? (
          <div
            className="tooltip tooltip-primary"
            data-tip="Reset Usage"
            onClick={(e) => {
              e.stopPropagation();
              resetUsage(row);
            }}
          >
            <RefreshIcon size={16} />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="px-2">
        <MainLayout>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between w-full pt-4 ">
            <PageHeader
              title="API Keys"
              description={
                descriptions?.["Provider Keys"] ||
                "Add your model-specific API keys to enable and use different AI models in your chat."
              }
              docLink={linksData?.find((link) => link.title === "API Key")?.blog_link}
            />
          </div>
        </MainLayout>
        <div className="flex flex-row gap-4">
          {apikeyData?.length > 5 && (
            <SearchItems data={apikeyData} setFilterItems={setFilterApiKeys} item="API Keys" />
          )}
          <div className={`${apikeyData?.length <= 5 ? " " : ""} flex-shrink-0 flex gap-4 ml-2`}>
            <button className="btn btn-sm" onClick={() => toggleSidebar("Api-Keys-guide-slider", "right")}>
              <BookIcon /> API Key Guide
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => openModal(MODAL_TYPE.API_KEY_MODAL)}>
              + Add New API Key
            </button>
          </div>
        </div>
      </div>
      {filterApiKeys.length > 0 ? (
        Object.entries(
          dataWithIcons.reduce((acc, item) => {
            const service = item.service.props.children[1].props.children;
            if (!acc[service]) {
              acc[service] = [];
            }
            acc[service].push(item);
            return acc;
          }, {})
        ).map(([service, items]) => (
          <div key={service} className="mb-2 mt-4">
            <h2 className="text-xl font-semibold capitalize flex items-center gap-2 pl-4">
              {getIconOfService(service.toLowerCase(), 24, 24)}
              {service}
            </h2>
            <CustomTable
              data={items}
              columnsToShow={API_KEY_COLUMNS}
              sorting
              sortingColumns={["name", "last_used", "apikey_usage"]}
              keysToWrap={["apikey", "comment"]}
              endComponent={EndComponent}
              handleRowClick={(data) => showConnectedAgents(data)}
              keysToExtractOnRowClick={["_id", "name", "version_ids"]}
            />
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No API keys entries found</p>
        </div>
      )}
      <ApiKeyModal
        orgId={orgId}
        isEditing={isEditing}
        selectedApiKey={selectedApiKey}
        setSelectedApiKey={setSelectedApiKey}
        setIsEditing={setIsEditing}
        apikeyData={apikeyData}
        selectedService={selectedService}
      />

      <ApiKeyGuideSlider />
      <DeleteModal
        onConfirm={deleteApikey}
        item={selectedDataToDelete}
        title="Delete API Key"
        description={`Are you sure you want to delete the API key "${selectedDataToDelete?.name}"? This action cannot be undone.`}
        loading={isDeleting}
        isAsync={true}
      />
      <ConnectedAgentsModal apiKey={selectedApiKeyForAgents} orgId={orgId} key={selectedApiKeyForAgents} />
    </div>
  );
};

export default Page;
