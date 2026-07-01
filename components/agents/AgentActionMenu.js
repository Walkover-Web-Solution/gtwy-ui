"use client";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { ArchiveRestore, MoreVertical, Pause, Play, Settings2, Trash2, Users, Globe } from "lucide-react";
import { archiveBridgeAction, updateBridgeAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import { toast } from "react-toastify";
import ConfigureEnvironmentModal from "../modals/ConfigureEnvironmentModal";

const BRIDGE_STATUS = {
  ACTIVE: 1,
  PAUSED: 0,
};

export const AgentMenuItems = ({
  bridge,
  bridgeStatus,
  isArchived,
  isUpdatingBridge,
  isEmbedUser,
  isAdminOrOwner,
  onClose,
  onDelete,
  onSetSelectedAgent,
  showDeleteAgentOption,
  isTableListPage,
}) => {
  const dispatch = useDispatch();
  const handleManageAccess = useCallback(() => {
    onClose?.();
    if (onSetSelectedAgent) onSetSelectedAgent(bridge);
    setTimeout(() => openModal(MODAL_TYPE.ACCESS_MANAGEMENT_MODAL), 10);
  }, [bridge, onClose, onSetSelectedAgent]);

  const handleUsageLimits = useCallback(() => {
    onClose?.();
    if (onSetSelectedAgent) onSetSelectedAgent(bridge);
    setTimeout(() => openModal(MODAL_TYPE.AGENT_USAGE_LIMIT_MODAL), 10);
  }, [bridge, onClose, onSetSelectedAgent]);

  const handlePauseBridge = useCallback(async () => {
    const newStatus = bridgeStatus === BRIDGE_STATUS.PAUSED ? BRIDGE_STATUS.ACTIVE : BRIDGE_STATUS.PAUSED;
    try {
      await dispatch(updateBridgeAction({ bridgeId: bridge._id, dataToSend: { bridge_status: newStatus } }));
      toast.success(`Agent ${newStatus === BRIDGE_STATUS.ACTIVE ? "resumed" : "paused"} successfully`);
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update agent status");
    }
  }, [dispatch, bridge, bridgeStatus, onClose]);

  const handleDeleteAgent = useCallback(() => {
    onClose?.();
    if (onDelete) {
      onDelete();
    } else {
      openModal(MODAL_TYPE.DELETE_AGENT_MODAL);
    }
  }, [onClose, onDelete]);

  const handleArchive = useCallback(async () => {
    try {
      const result = await dispatch(archiveBridgeAction(bridge._id, isArchived ? 0 : 1));
      toast.success(result === 1 ? "Agent Unarchived Successfully" : "Agent Archived Successfully");
      onClose?.();
    } catch (error) {
      console.error("Failed to archive/unarchive agent", error);
    }
  }, [dispatch, bridge, isArchived, onClose]);

  const handleConfigureEnvironment = useCallback(() => {
    onClose?.();
    if (onSetSelectedAgent) onSetSelectedAgent(bridge);
    setTimeout(() => openModal(MODAL_TYPE.CONFIGURE_ENVIRONMENT_MODAL), 10);
  }, [bridge, onClose, onSetSelectedAgent]);

  return (
    <>
      {!isEmbedUser && !isTableListPage && (
        <button
          data-testid="agent-action-configure-environment"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleConfigureEnvironment();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 cursor-pointer"
        >
          <Globe size={14} />
          Environment
        </button>
      )}
      {isEmbedUser ? (
        <>
          {showDeleteAgentOption && (
            <button
              data-testid="agent-action-delete"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteAgent();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={14} className="text-red-600" />
              Delete Agent
            </button>
          )}
        </>
      ) : (
        <>
          {isAdminOrOwner && (
            <button
              data-testid="agent-action-manage-access"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleManageAccess();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 cursor-pointer"
            >
              <Users size={16} />
              Manage Access
            </button>
          )}

          <button
            data-testid="agent-action-usage-limits"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleUsageLimits(e);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 cursor-pointer"
          >
            <Settings2 size={14} />
            Usage &​ Limits
          </button>

          <button
            data-testid="agent-action-pause-resume"
            onMouseDown={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await handlePauseBridge();
            }}
            disabled={isUpdatingBridge}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 cursor-pointer ${isUpdatingBridge ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {bridgeStatus === BRIDGE_STATUS.PAUSED ? (
              <>
                <Play size={14} className="text-green-600" />
                Resume Agent
              </>
            ) : (
              <>
                <Pause size={14} className="text-red-600" />
                Pause Agent
              </>
            )}
          </button>

          {isAdminOrOwner && (
            <button
              data-testid="agent-action-delete"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteAgent();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={14} className="text-red-600" />
              Delete Agent
            </button>
          )}

          {isArchived && (
            <button
              data-testid="agent-action-unarchive"
              onMouseDown={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await handleArchive();
              }}
              disabled={isUpdatingBridge}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-1 cursor-pointer ${isUpdatingBridge ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <ArchiveRestore size={14} className="text-red-600" />
              Unarchive Agent
            </button>
          )}
        </>
      )}
    </>
  );
};

const AgentActionMenu = (props) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = props.menuRef;

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef?.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu, menuRef]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        data-testid="agent-action-menu-toggle"
        onClick={() => setShowMenu((prev) => !prev)}
        className="p-2 hover:bg-base-200 rounded-md transition-colors"
        title="More options"
      >
        <MoreVertical size={16} />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-base-100 border border-base-300 rounded-lg shadow-xl z-very-high">
          <AgentMenuItems {...props} onClose={() => setShowMenu(false)} />
        </div>
      )}
      <ConfigureEnvironmentModal bridgeId={props.bridgeId} orgId={props.orgId} bridgeData={props.bridgeData} />
    </div>
  );
};

export default AgentActionMenu;
