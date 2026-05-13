import React, { useEffect, useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Protected from "./Protected";
import { useCustomSelector } from "@/customHooks/customSelector";

const NotesPanel = ({ isVisible, params, isEmbedUser, onClose, showCloseButton = false }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathParts = pathname.split("?")[0].split("/");
  const bridgeId = pathParts[5] || params?.id;
  const { versions, publishedVersionId } = useCustomSelector((state) => ({
    versions: Array.isArray(state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.versions)
      ? state.bridgeReducer.allBridgesMap[bridgeId].versions
      : [],
    publishedVersionId: state?.bridgeReducer?.allBridgesMap?.[bridgeId]?.published_version_id || null,
  }));

  const urlVersion = searchParams?.get("version") || params?.version || null;
  const [selectedVersion, setSelectedVersion] = useState(urlVersion);

  useEffect(() => {
    setSelectedVersion(urlVersion);
  }, [urlVersion]);

  const loadNotesForVersion = useCallback(
    (versionId) => {
      if (typeof window.sendDataToDocstar === "function") {
        // If versionId is null/undefined, use just bridgeId (old notes)
        const pageId = versionId ? `${bridgeId}_${versionId}` : bridgeId;
        const container = document.getElementById("notes-embed-main");
        if (container) container.innerHTML = "";
        window.sendDataToDocstar({
          parentId: "notes-embed-main",
          page_id: pageId,
        });
        window.openTechDoc();
      } else {
        console.warn("sendDataToDocstar is not defined yet.");
      }
    },
    [bridgeId]
  );

  useEffect(() => {
    if (isVisible && !isEmbedUser) {
      setTimeout(() => {
        loadNotesForVersion(selectedVersion);
      }, 100);
    }
  }, [isVisible, isEmbedUser, loadNotesForVersion, selectedVersion]);

  // null represents the base bridgeId tab (old notes)
  const handleTabClick = (versionId) => {
    setSelectedVersion(versionId);
  };

  if (!isVisible || isEmbedUser) return null;

  return (
    <div data-testid="notes-panel-container" id="notes-panel-container" className="h-full bg-base-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-base-300 bg-base-50">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-base-content">Notes</h3>
        </div>

        {showCloseButton && onClose && (
          <button
            data-testid="notes-panel-close-button"
            id="notes-panel-close-button"
            onClick={onClose}
            className="btn btn-xs btn-error"
            title="Close Prompt Helper"
          >
            Close Helper
          </button>
        )}
      </div>

      {/* Version Tabs */}
      <div className="flex gap-1 px-2 pt-2 border-b border-base-300 overflow-x-auto">
        {/* Base tab — always shown, uses raw bridgeId for old notes */}
        <button
          data-testid="notes-version-tab-base"
          id="notes-version-tab-base"
          onClick={() => handleTabClick(null)}
          className={`btn btn-xs rounded-b-none flex-shrink-0 ${
            selectedVersion === null ? "btn-primary" : "btn-ghost"
          }`}
        >
          Old Notes
        </button>

        {/* Version tabs */}
        {versions.map((versionId, index) => (
          <button
            key={versionId}
            data-testid={`notes-version-tab-${versionId}`}
            id={`notes-version-tab-${versionId}`}
            onClick={() => handleTabClick(versionId)}
            className={`btn btn-xs rounded-b-none flex-shrink-0 ${
              selectedVersion === versionId ? "btn-primary" : "btn-ghost"
            }`}
          >
            V{index + 1}
            {publishedVersionId === versionId && (
              <span
                className="ml-1 inline-block h-2 w-2 rounded-full bg-success"
                title="Published version"
                aria-label="Published version"
              />
            )}
          </button>
        ))}
      </div>

      {/* Notes Content */}
      <div className="flex-1 pl-2 pt-2 overflow-hidden">
        <div data-testid="notes-embed-main" id="notes-embed-main" className="w-full h-full">
          {/* This will be populated by the docstar script */}
        </div>
      </div>
    </div>
  );
};

export default Protected(NotesPanel);
