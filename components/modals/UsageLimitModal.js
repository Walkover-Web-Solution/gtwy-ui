"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { Activity, Infinity } from "lucide-react";

const UsageLimitModal = ({ data, onConfirm, item }) => {
  const [limit, setLimit] = useState(data?.item_limit);
  const [resetPeriod, setResetPeriod] = useState(data?.item_limit_reset_period || "daily");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const hasSavedLimit = Number(data?.item_limit || 0) > 0;
  const isUnlimited = !(Number(limit || 0) > 0);

  useEffect(() => {
    if (data && data.item_limit) {
      setLimit(data.item_limit);
    } else {
      setLimit("");
    }
    setResetPeriod(data?.item_limit_reset_period || "daily");
  }, [data]);

  const handleClose = () => {
    closeModal(MODAL_TYPE.API_KEY_LIMIT_MODAL);
  };

  const submitLimit = async (limitValue) => {
    setIsLoading(true);
    setError("");

    try {
      await onConfirm(data, limitValue, resetPeriod);
      handleClose();
    } catch (err) {
      setError(err.message || "Failed to set usage limit");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isBlank = limit === "" || limit === null || limit === undefined;
    if (!isBlank && (isNaN(parseFloat(limit)) || parseFloat(limit) < 0)) {
      setError("Please enter a valid number for the limit");
      return;
    }

    await submitLimit(isBlank ? 0 : parseFloat(limit));
  };

  const handleRemoveLimit = () => submitLimit(0);

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.API_KEY_LIMIT_MODAL}
      onClose={handleClose}
      title="Set Usage Limit"
      description={`${item}: ${data?.actualName || ""}`}
      icon={<Activity size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
    >
      <form
        data-testid="usage-limit-modal-container"
        id="usage-limit-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <div className="form-control w-full">
          <label className="label-text mb-1 font-medium">Limit (in $)</label>
          <input
            autoComplete="off"
            data-testid="usage-limit-input"
            id="usage-limit-input"
            type="number"
            placeholder="Enter limit in $"
            className="input input-bordered w-full input-sm"
            value={limit || ""}
            onChange={(e) => setLimit(e.target.value)}
            min="0"
            step="0.0001"
          />
          {isUnlimited && (
            <p className="text-xs text-base-content/60 mt-1 flex items-center gap-1">
              <Infinity size={14} /> Unlimited — usage will not be capped
            </p>
          )}
          {error && <p className="text-error text-sm mt-1">{error}</p>}
        </div>

        <div className="form-control w-full">
          <label className="label-text mb-1 font-medium">Reset Period</label>
          <select
            className="select select-bordered w-full select-sm"
            value={resetPeriod}
            onChange={(e) => setResetPeriod(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-base-content/10">
          {hasSavedLimit && (
            <button
              data-testid="usage-limit-remove-button"
              id="usage-limit-remove-button"
              type="button"
              onClick={handleRemoveLimit}
              className="btn btn-sm btn-ghost text-error mr-auto"
              disabled={isLoading}
            >
              Remove Limit
            </button>
          )}
          <button
            data-testid="usage-limit-cancel-button"
            id="usage-limit-cancel-button"
            type="button"
            onClick={handleClose}
            className="btn btn-sm"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            data-testid="usage-limit-save-button"
            id="usage-limit-save-button"
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Limit"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UsageLimitModal;
