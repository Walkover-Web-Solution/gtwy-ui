"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";

const UsageLimitModal = ({ data, onConfirm, item }) => {
  const [limit, setLimit] = useState(data?.item_limit);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (data && data.item_limit) {
      setLimit(data.item_limit);
    } else {
      setLimit("");
    }
  }, [data]);

  const handleClose = () => {
    closeModal(MODAL_TYPE.API_KEY_LIMIT_MODAL);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!limit || isNaN(parseFloat(limit)) || parseFloat(limit) < 0) {
      setError("Please enter a valid number for the limit");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onConfirm(data, parseFloat(limit));
      handleClose();
    } catch (err) {
      setError(err.message || "Failed to set API key limit");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.API_KEY_LIMIT_MODAL} onClose={handleClose}>
      <div className="flex items-center justify-center">
        <div
          id="usage-limit-modal-container"
          className="min-w-[25rem] max-w-[50rem] bg-base-100 border border-base-300 rounded-lg p-6 mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <h2 className="text-lg font-semibold text-base-content">Set Usage Limit</h2>
            <p className="text-sm text-base-content flex items-center gap-2">
              {item}: {data?.actualName}
            </p>
          </div>

          <form id="usage-limit-form" onSubmit={handleSubmit} className="mt-4">
            <div className="form-control w-full">
              <input
                id="usage-limit-input"
                type="number"
                placeholder="Enter limit in $"
                className="input input-bordered w-full input-sm"
                value={limit || ""}
                onChange={(e) => setLimit(e.target.value)}
                min="0"
                step="0.0001"
              />
              {error && <p className="text-error text-sm mt-1">{error}</p>}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6">
              <button
                id="usage-limit-cancel-button"
                type="button"
                onClick={handleClose}
                className="btn btn-sm"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                id="usage-limit-save-button"
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Limit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default UsageLimitModal;
