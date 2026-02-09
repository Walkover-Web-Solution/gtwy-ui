import React, { useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Protected from "./Protected";

const NotesPanel = ({ isVisible, params, isEmbedUser, onClose, showCloseButton = false }) => {
  const pathname = usePathname();
  const pathParts = pathname.split("?")[0].split("/");
  const bridgeId = pathParts[5] || params?.id;

  const handleScriptLoad = useCallback(() => {
    if (typeof window.sendDataToDocstar === "function") {
      window.sendDataToDocstar({
        parentId: "notes-embed-main",
        page_id: bridgeId,
      });
      window.openTechDoc();
    } else {
      console.warn("sendDataToDocstar is not defined yet.");
    }
  }, [bridgeId]);

  useEffect(() => {
    if (isVisible && !isEmbedUser) {
      setTimeout(() => {
        handleScriptLoad();
      }, 100);
    }
  }, [isVisible, isEmbedUser, handleScriptLoad]);

  if (!isVisible || isEmbedUser) return null;

  return (
    <div id="notes-panel-container" className="h-full bg-base-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-base-300 bg-base-50">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-base-content">Notes</h3>
        </div>

        {showCloseButton && onClose && (
          <button
            id="notes-panel-close-button"
            onClick={onClose}
            className="btn btn-xs btn-error"
            title="Close Prompt Helper"
          >
            Close Helper
          </button>
        )}
      </div>

      {/* Notes Content */}
      <div className="flex-1 pl-2 pt-2 overflow-hidden">
        <div id="notes-embed-main" className="w-full h-full">
          {/* This will be populated by the docstar script */}
        </div>
      </div>
    </div>
  );
};

export default Protected(NotesPanel);
