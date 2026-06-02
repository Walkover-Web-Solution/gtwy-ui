"use client";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  ArchiveRestore,
  MessageSquareOff,
  MoreVertical,
  Pause,
  Play,
  Settings2,
  Trash2,
  Users,
  Globe,
} from "lucide-react";
import { archiveBridgeAction, updateBridgeAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import { toast } from "react-toastify";
import { UsageSummaryPopover } from "@/app/org/[org_id]/agents/page";
import ConfigureEnvironmentModal from "../modals/ConfigureEnvironmentModal";

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
  showDeleteAgentOption,
  statelessConversation,
  onStatelessToggle,
  isStatelessReadOnly,
  bridgeType,
  isTableListPage,
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

  const handleUpdateBridgeLimit = async (bridgeItem, limit, resetPeriod) => {
    const dataToSend = { bridge_limit: limit };
    if (resetPeriod) {
      dataToSend.bridge_limit_reset_period = resetPeriod;
    }
    const res = await dispatch(updateBridgeAction({ bridgeId: bridgeItem._id, dataToSend }));
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
          onSetLimit={(bridgeItem, limit, resetPeriod) => {
            handlePortalCloseImmediate?.();
            handleUpdateBridgeLimit(bridgeItem, limit, resetPeriod);
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

  const handleStatelessToggle = useCallback(async () => {
    if (isStatelessReadOnly) return;

    const nextValue = !statelessConversation;
    if (onStatelessToggle) {
      onStatelessToggle(nextValue);
      return;
    }

    try {
      await dispatch(
        updateBridgeAction({
          bridgeId: bridge._id,
          dataToSend: { settings: { stateless_conversation: nextValue } },
        })
      );
      toast.success(`Stateless conversation ${nextValue ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to update stateless conversation", error);
      toast.error("Failed to update stateless conversation");
    }
  }, [dispatch, bridge, isStatelessReadOnly, onStatelessToggle, statelessConversation]);

  const handleConfigureEnvironment = useCallback(() => {
    onClose?.();
    if (onSetSelectedAgent) onSetSelectedAgent(bridge);
    setTimeout(() => openModal(MODAL_TYPE.CONFIGURE_ENVIRONMENT_MODAL), 10);
  }, [bridge, onClose, onSetSelectedAgent]);

  return (
    <>
      {bridgeType !== "chatbot" && !isEmbedUser && !isTableListPage && (
        <div
          data-testid="agent-action-stateless-conversation"
          title="When enabled, the agent responds without carrying previous conversation context forward."
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          className="w-full px-4 py-2 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <MessageSquareOff size={14} className="flex-shrink-0" />
            <span className="text-sm">Stateless</span>
          </div>
          <label
            className="label cursor-pointer gap-1 p-0"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <span className="text-xs font-semibold">{statelessConversation ? "On" : "Off"}</span>
            <input
              data-testid="stateless-conversation-toggle"
              type="checkbox"
              disabled={isStatelessReadOnly}
              className="toggle toggle-xs"
              checked={!!statelessConversation}
              onMouseDown={(e) => {
                e.stopPropagation();
                // Use mouse down to trigger toggle because click/change may be swallowed by parent handlers
                handleStatelessToggle();
              }}
            />
          </label>
        </div>
      )}
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
