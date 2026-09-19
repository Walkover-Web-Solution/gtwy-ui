"use client";

import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import InfoTooltip from "@/components/InfoTooltip";
import McpServerModal from "@/components/modals/McpServerModal";
import DeleteModal from "@/components/UI/DeleteModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, closeModal } from "@/utils/utility";
import { CircleQuestionMark, Pencil, Plus, Server, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";

const EMPTY_SERVERS = [];

const McpServerList = ({ params, searchParams, isPublished, isEditor = true }) => {
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();

  const savedServers = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeData = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const activeData = isPublished ? bridgeData : versionData;
    const servers = activeData?.configuration?.mcp_config?.servers;
    return Array.isArray(servers) ? servers : EMPTY_SERVERS;
  });

  const [servers, setServers] = useState(savedServers);
  const [editIndex, setEditIndex] = useState(null); // null = adding a new server
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);

  useEffect(() => {
    setServers(savedServers);
  }, [savedServers]);

  const persistServers = useCallback(
    (nextServers) =>
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: { configuration: { mcp_config: { servers: nextServers } } },
        })
      ),
    [dispatch, params?.id, searchParams?.version]
  );

  const openAddModal = () => {
    setEditIndex(null);
    openModal(MODAL_TYPE.MCP_SERVER_MODAL);
  };

  const openEditModal = (index) => {
    setEditIndex(index);
    openModal(MODAL_TYPE.MCP_SERVER_MODAL);
  };

  const handleModalSave = async (data) => {
    setIsSaving(true);
    try {
      const nextServers =
        editIndex === null ? [...servers, data] : servers.map((item, i) => (i === editIndex ? data : item));
      setServers(nextServers);
      await persistServers(nextServers);
      closeModal(MODAL_TYPE.MCP_SERVER_MODAL);
    } finally {
      setIsSaving(false);
    }
  };

  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE.DELETE_MCP_SERVER_MODAL);

  const openDeleteModal = (index) => {
    setPendingDeleteIndex(index);
    openModal(MODAL_TYPE.DELETE_MCP_SERVER_MODAL);
  };

  const handleConfirmDelete = async () => {
    await executeDelete(async () => {
      const nextServers = servers.filter((_, i) => i !== pendingDeleteIndex);
      setServers(nextServers);
      return persistServers(nextServers);
    });
  };

  const editingServer = editIndex === null ? null : servers[editIndex];

  return (
    <div
      data-testid="mcp-server-list-container"
      id="mcp-server-list-container"
      className="w-full gap-2 flex flex-col px-2 py-2 cursor-default"
    >
      <McpServerModal
        initialData={editingServer}
        isEditing={editIndex !== null}
        onSave={handleModalSave}
        isSaving={isSaving}
      />
      <DeleteModal
        onConfirm={handleConfirmDelete}
        item={pendingDeleteIndex}
        name={servers[pendingDeleteIndex]?.name}
        title="Remove MCP server?"
        description="This will remove the selected MCP server and its tools from this agent."
        buttonTitle="Remove MCP"
        modalType={MODAL_TYPE.DELETE_MCP_SERVER_MODAL}
        loading={isDeleting}
        isAsync={true}
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm whitespace-nowrap">MCP Servers</p>
          <InfoTooltip tooltipContent="Connect MCP servers so this agent can use their tools at runtime.">
            <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
          </InfoTooltip>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-md">
        {servers.length > 0 ? (
          <div className="flex flex-col gap-2">
            {servers.map((config, index) => (
              <div
                key={`${config.name}-${index}`}
                data-testid={`mcp-server-item-${index}`}
                className="group flex w-full items-center border border-base-300 bg-base-100 transition-colors duration-200 min-h-[44px]"
              >
                <div className="p-2 flex-1 flex items-center gap-2 min-w-0">
                  <Server size={16} className="shrink-0 text-base-content/60" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate text-sm font-medium text-base-content">
                      {config.name || `MCP ${index + 1}`}
                    </span>
                    <span className="block truncate text-xs text-base-content/50">{config.url}</span>
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 pr-2 flex-shrink-0">
                    <button
                      type="button"
                      data-testid={`mcp-server-edit-button-${index}`}
                      onClick={() => openEditModal(index)}
                      className="btn btn-ghost btn-sm p-1 hover:bg-base-300"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      data-testid={`mcp-server-delete-button-${index}`}
                      onClick={() => openDeleteModal(index)}
                      className="btn btn-ghost btn-sm p-1 hover:bg-red-100 hover:text-error"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!isReadOnly && (
              <div className="border-2 border-base-200 border-dashed text-center">
                <button
                  type="button"
                  data-testid="mcp-server-add-button"
                  onClick={openAddModal}
                  className="flex items-center justify-center gap-1 p-2 text-base-content/50 hover:text-base-content/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  <Plus className="w-3 h-3" />
                  Add Another MCP
                </button>
              </div>
            )}
          </div>
        ) : !isReadOnly ? (
          <div className="border-2 border-base-200 border-dashed text-center">
            <button
              type="button"
              data-testid="mcp-server-add-button-empty"
              onClick={openAddModal}
              className="flex items-center justify-center gap-1 p-2 text-base-content/50 hover:text-base-content/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              <Plus className="w-3 h-3" />
              Add MCP Configuration
            </button>
          </div>
        ) : (
          <div className="border border-dashed border-base-300 p-4 text-center">
            <p className="text-sm text-base-content/70">No MCP servers configured.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default McpServerList;
