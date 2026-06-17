import React from "react";
import { Folder, FileMinus } from "lucide-react";

export const MoveToFolderMenu = ({ folders, onMove, currentFolderId }) => {
  const cleanFolderId = (fid) => {
    if (!fid) return "";
    if (typeof fid === "string") return fid;
    if (typeof fid === "object") {
      if (fid.$oid) return String(fid.$oid);
      if (fid._id) return String(fid._id);
      if (typeof fid.toString === "function" && fid.toString() !== "[object Object]") {
        return fid.toString();
      }
    }
    return String(fid);
  };

  const isUncategorized =
    currentFolderId === "uncategorized" || currentFolderId === null || currentFolderId === undefined;

  const filteredFolders = (folders || []).filter((folder) => {
    if (!folder) return false;
    return cleanFolderId(folder._id) !== cleanFolderId(currentFolderId);
  });

  return (
    <div className="bg-base-100 rounded-box w-48 shadow-lg border border-base-300 flex flex-col max-h-72">
      {!isUncategorized && (
        <>
          <ul className="menu menu-xs p-1 pb-0 shrink-0">
            <li className="menu-title text-[10px] uppercase font-bold tracking-wider text-base-content/40">
              Move to Folder
            </li>
            <li>
              <button
                data-testid="move-to-uncategorized-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove("uncategorized");
                }}
                className="flex items-center gap-2 py-1.5 px-2 hover:bg-base-200"
              >
                <FileMinus size={14} className="opacity-70 shrink-0" />
                <span>Uncategorized</span>
              </button>
            </li>
          </ul>
          <div className="divider my-0.5 opacity-50 shrink-0"></div>
        </>
      )}
      <div className="overflow-y-auto max-h-44 scrollbar-thin">
        <ul className="menu menu-xs p-1 pt-0">
          {isUncategorized && (
            <li className="menu-title text-[10px] uppercase font-bold tracking-wider text-base-content/40 shrink-0">
              Move to Folder
            </li>
          )}
          {filteredFolders.length === 0 ? (
            <li className="disabled text-base-content/40 text-[11px] py-1 px-2 italic text-center">
              No other folders available
            </li>
          ) : (
            filteredFolders.map((folder) => (
              <li key={folder._id}>
                <button
                  data-testid={`move-to-folder-btn-${folder._id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(folder._id);
                  }}
                  className="flex items-center gap-2 py-1.5 px-2 hover:bg-base-200"
                >
                  <Folder size={14} className="text-primary opacity-70 shrink-0" />
                  <span className="truncate max-w-[130px] block" title={folder.name}>
                    {folder.name}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
export default MoveToFolderMenu;
