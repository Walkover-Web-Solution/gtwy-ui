"use client";
import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { ArchiveRestore, MoreVertical, Pause, Play, Settings2, Trash2, Users } from "lucide-react";
import { archiveBridgeAction, updateBridgeAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import { toast } from "react-toastify";
import { UsageSummaryPopover } from "@/app/org/[org_id]/agents/page";

const BRIDGE_STATUS = {
  ACTIVE: 1,
  PAUSED: 0,
};

export const AgentMenuItems = ({
  bridge,
  bridgeData,
  bridgeStatus,
  isArchived,
  isUpdatingBridge,
  isEmbedUser,
  isAdminOrOwner,
  orgId,
  onClose,
  onDelete,
  onSetSelectedAgent,
  handlePortalOpen,
  handlePortalCloseImmediate,
}) => {
  const dispatch = useDispatch();

  const getUsageStatsForRow = (row) => {
    const limitValue = Number(row?.agent_limit_original ?? row?.bridge_limit ?? 0);
    const usageValue = Number(row?.agent_usage ?? row?.bridge_usage ?? 0);
    const totalTokens = Number(row?.totalTokens ?? row?.total_tokens ?? 0);
    const hasLimit = Number.isFinite(limitValue) && limitValue > 0;
    const usagePercent = hasLimit ? Math.min(100, Math.max(0, (usageValue / limitValue) * 100)) : 0;
    const remaining = hasLimit ? Math.max(limitValue - usageValue, 0) : null;
    return { limitValue, usageValue, totalTokens, hasLimit, usagePercent, remaining };
  };

  const handleUpdateBridgeLimit = async (bridgeItem, limit) => {
    const res = await dispatch(updateBridgeAction({ bridgeId: bridgeItem._id, dataToSend: { bridge_limit: limit } }));
    if (res?.success) toast.success("Agent Usage Limit Updated Successfully");
  };

  const resetUsage = async (bridgeItem) => {
    const res = await dispatch(updateBridgeAction({ bridgeId: bridgeItem._id, dataToSend: { bridge_usage: 0 } }));
    if (res?.success) toast.success("Agent Usage Reset Successfully");
  };

  const handleManageAccess = useCallback(() => {
    onClose?.();
    if (onSetSelectedAgent) onSetSelectedAgent(bridge);
    setTimeout(() => openModal(MODAL_TYPE.ACCESS_MANAGEMENT_MODAL), 10);
  }, [bridge, onClose, onSetSelectedAgent]);

  const handleUsageLimits = useCallback(
    (e) => {
      const usageContent = (
        <UsageSummaryPopover
          stats={getUsageStatsForRow(bridgeData || bridge)}
          item={bridge}
          isEmbedUser={isEmbedUser}
          onSetLimit={(bridgeItem, limit) => {
            handlePortalCloseImmediate?.();
            handleUpdateBridgeLimit(bridgeItem, limit);
          }}
          onResetUsage={() => {
            handlePortalCloseImmediate?.();
            resetUsage(bridge);
          }}
        />
      );
      onClose?.();
      handlePortalOpen?.(e.currentTarget, usageContent);
    },
    [bridge, bridgeData, isEmbedUser, handlePortalOpen, handlePortalCloseImmediate, onClose]
  );

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

  return (
    <>
      {!isEmbedUser && isAdminOrOwner && (
        <button
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
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleUsageLimits(e);
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 cursor-pointer"
      >
        <Settings2 size={14} />
        Usage &​amp; Limits
      </button>

      <button
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
  );
};

const AgentActionMenu = (props) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = props.menuRef;

  return (
    <div className="relative" ref={menuRef}>
      <button
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
    </div>
  );
};

export default AgentActionMenu;
