"use client";
import { MODAL_TYPE } from "@/utils/enums";
import { allowedAttributes, openModal, closeModal } from "@/utils/utility";
import { CloseCircleIcon } from "@/components/Icons";
import { useEffect } from "react";
import Modal from "@/components/UI/Modal";

const ChatDetails = ({ selectedItem, setIsSliderOpen, isSliderOpen, params }) => {
  useEffect(() => {
    if (isSliderOpen) {
      openModal(MODAL_TYPE.CHAT_DETAILS_MODAL);
    } else {
      closeModal(MODAL_TYPE.CHAT_DETAILS_MODAL);
    }
  }, [isSliderOpen]);

  return (
    <Modal MODAL_ID={MODAL_TYPE.CHAT_DETAILS_MODAL} onClose={() => setIsSliderOpen(false)}>
      {selectedItem && (
        <div
          className="fixed inset-0 z-low-medium flex min-h-[100vh] min-w-[100vw] items-center justify-center overflow-auto bg-black/60 py-8"
          onClick={() => setIsSliderOpen(false)}
        >
          <div
            id="chat-details-modal-container"
            data-testid="chat-details-modal"
            className="relative flex w-[min(640px,92vw)] max-h-[88vh] flex-col overflow-hidden rounded-xl border border-base-content/10 shadow-2xl bg-base-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-base-content/10 px-5 py-4 bg-base-200">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-semibold text-base-content">Chat Details</h3>
              </div>
              <button
                type="button"
                data-testid="chat-details-close-button"
                id="chat-details-close-button"
                className="rounded-md p-1.5 text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-base-content"
                onClick={() => setIsSliderOpen(false)}
              >
                <CloseCircleIcon size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 pb-6 space-y-6">
              {/* Latency Section */}
              {selectedItem.latency !== undefined && (
                <div>
                  <div className="text-xs font-semibold text-base-content/70 mb-2 uppercase tracking-wide">Latency</div>
                  <div className="bg-base-200 p-4 rounded-lg border border-base-content/10 flex items-center justify-between">
                    <span className="text-sm font-medium text-base-content">Response Time</span>
                    <span className="text-sm font-semibold text-primary">
                      {(() => {
                        if (typeof selectedItem.latency === "object" && selectedItem.latency !== null) {
                          const time = selectedItem.latency.over_all_time ?? selectedItem.latency.model_execution_time;
                          return time != null ? `${parseFloat(time).toFixed(2)}s` : "0.00s";
                        }
                        const latStr = selectedItem.latency?.toString() || "";
                        return latStr.endsWith("s") ? latStr : `${parseFloat(latStr || 0).toFixed(2)}s`;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {/* Optional Details Section */}
              <div>
                <div className="text-xs font-semibold text-base-content/70 mb-2 uppercase tracking-wide">
                  Optional Details
                </div>
                <div className="border border-base-content/10 rounded-lg overflow-hidden bg-base-100 divide-y divide-base-content/10">
                  {allowedAttributes.optional
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([key, displayKey]) => {
                      // Handle nested keys like "batch_data.batch_id"
                      const keys = key.includes(".") ? key.split(".") : [key];
                      let value = selectedItem;
                      for (const k of keys) {
                        value = value?.[k];
                      }
                      if (value === undefined) return null;

                      // If the value is an object (but not a Date or array), render each property as separate rows
                      if (typeof value === "object" && value !== null && key !== "createdAt" && !Array.isArray(value)) {
                        return Object.entries(value).map(([objKey, objValue]) => (
                          <div
                            key={`${key}-${objKey}`}
                            className="bg-base-100 transition-colors duration-150 flex px-4 py-3"
                          >
                            <div className="text-xs font-semibold capitalize w-1/2 text-base-content/85">
                              {objKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </div>
                            <div className="w-1/2 text-xs text-base-content">
                              <span className="break-words font-medium">{objValue?.toString()}</span>
                            </div>
                          </div>
                        ));
                      }

                      // Regular single value display
                      return (
                        <div key={key} className="bg-base-100 transition-colors duration-150 flex px-4 py-3">
                          <div className="text-xs font-semibold capitalize w-1/2 text-base-content/85">
                            {displayKey}
                          </div>
                          <div className="w-1/2 text-xs text-base-content">
                            <span className="break-words font-medium">
                              {key === "createdAt" ? new Date(value).toLocaleString() : value?.toString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ChatDetails;
