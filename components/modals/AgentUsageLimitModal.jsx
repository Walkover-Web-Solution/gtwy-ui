"use client";
import React, { useState, useEffect, useMemo } from "react";
import Modal from "../UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { Settings2 } from "lucide-react";
import { updateBridgeAction } from "@/store/action/bridgeAction";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

const UsageProgressDonut = ({ percent, label }) => (
  <div className="relative h-24 w-24 flex-shrink-0">
    <div
      className="h-full w-full rounded-full border border-base-300 bg-base-200/50"
      style={{
        background: `conic-gradient(#3b82f6 ${percent}%, rgba(59,130,246,0.1) ${percent}% 100%)`,
      }}
    />
    <div className="absolute inset-[8px] flex items-center justify-center rounded-full bg-base-100 text-sm font-bold text-base-content/80">
      {label}
    </div>
  </div>
);

const AgentUsageLimitModal = ({ agent, isEmbedUser }) => {
  const dispatch = useDispatch();
  const [limit, setLimit] = useState("");
  const [resetPeriod, setResetPeriod] = useState("daily");
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (agent) {
      const limitVal = agent.bridge_limit !== undefined ? agent.bridge_limit : agent.agent_limit_original;
      setLimit(limitVal || "");
      setResetPeriod(agent.bridge_limit_reset_period || "daily");
    }
  }, [agent]);

  const usageValue = Number(agent?.bridge_usage !== undefined ? agent.bridge_usage : (agent?.agent_usage ?? 0));
  const limitNum = Number(limit || 0);
  const hasLimit = Number.isFinite(limitNum) && limitNum > 0;
  const usagePercent = hasLimit ? Math.min(100, Math.max(0, (usageValue / limitNum) * 100)) : 0;
  const remaining = hasLimit ? Math.max(limitNum - usageValue, 0) : null;

  const isChanged = useMemo(() => {
    const origLimit = agent?.bridge_limit !== undefined ? agent.bridge_limit : agent?.agent_limit_original;
    return String(limit) !== String(origLimit ?? "") || resetPeriod !== (agent?.bridge_limit_reset_period ?? "daily");
  }, [limit, resetPeriod, agent]);

  const handleClose = () => {
    closeModal(MODAL_TYPE.AGENT_USAGE_LIMIT_MODAL);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSend = {
        bridge_limit: limit ? parseFloat(limit) : 0,
        bridge_limit_reset_period: resetPeriod,
      };
      const res = await dispatch(updateBridgeAction({ bridgeId: agent._id, dataToSend }));
      if (res?.success) {
        toast.success("Agent Usage Limit Updated Successfully");
        handleClose();
      } else {
        toast.error("Failed to update agent usage limit");
      }
    } catch (error) {
      toast.error("An error occurred while saving limits", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetUsage = async () => {
    setIsResetting(true);
    try {
      const res = await dispatch(updateBridgeAction({ bridgeId: agent._id, dataToSend: { bridge_usage: 0 } }));
      if (res?.success) {
        toast.success("Agent Usage Reset Successfully");
      } else {
        toast.error("Failed to reset usage");
      }
    } catch (error) {
      toast.error("An error occurred while resetting usage", error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.AGENT_USAGE_LIMIT_MODAL}
      onClose={handleClose}
      title="Agent Usage & Limits"
      description={agent?.actualName ? `Configure limits for ${agent.actualName}` : undefined}
      icon={<Settings2 size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
    >
      <div className="flex flex-col gap-6" id="agent-usage-limit-modal-content">
        <div className="flex items-center gap-6 p-4 bg-base-200/40 rounded-xl border border-base-content/5">
          <UsageProgressDonut
            percent={hasLimit ? usagePercent : 0}
            label={hasLimit ? `${Math.round(usagePercent)}%` : "—"}
          />
          <div className="flex-1 flex flex-col gap-2 text-sm">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-base-content/60">Used</span>
              <span className="font-semibold text-base-content">
                $
                {new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(
                  usageValue
                )}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-t border-base-content/5">
              <span className="text-base-content/60">Remaining</span>
              <span className="font-semibold text-base-content">
                {hasLimit
                  ? `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(remaining)}`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="form-control w-full">
            <label className="label-text mb-1 font-medium text-xs text-base-content/70">Limit (in $)</label>
            <input
              autoComplete="off"
              type="number"
              placeholder="Enter limit in $"
              className="input input-bordered w-full input-sm h-9 px-3 text-sm focus-visible:ring-[3px] border-base-content/20"
              value={limit}
              min="0"
              step="0.0001"
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>

          {!isEmbedUser && (
            <div className="form-control w-full">
              <label className="label-text mb-1 font-medium text-xs text-base-content/70">Reset Period</label>
              <select
                className="select select-bordered w-full select-sm h-9 px-3 text-sm border-base-content/20"
                value={resetPeriod}
                onChange={(e) => setResetPeriod(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>

        {!isEmbedUser && (
          <div className="flex items-center justify-between border-t border-base-content/10 pt-4 mt-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-base-content/70">Reset Current Usage</span>
              <span className="text-[10px] text-base-content/50">Clear all accumulated usage for this period</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-ghost text-xs border border-base-content/10 text-error hover:bg-error/10 hover:border-error/20"
              disabled={isResetting || usageValue === 0}
              onClick={handleResetUsage}
            >
              {isResetting ? "Resetting..." : "Reset Usage"}
            </button>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-base-content/10 pt-4 mt-2">
          <button
            type="button"
            className="btn btn-sm text-xs h-8 px-4 font-normal"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm text-xs h-8 px-4 font-normal"
            onClick={handleSave}
            disabled={isSaving || !isChanged}
          >
            {isSaving ? "Saving..." : "Save Limits"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AgentUsageLimitModal;
