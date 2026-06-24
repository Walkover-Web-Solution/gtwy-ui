import React, { useState } from "react";
import { Folder, FolderOpen, Plus, Edit2, Check, X, FileMinus, Trash2 } from "lucide-react";
import { useFolderContext } from "./FolderContext";
import InfoTooltip from "../InfoTooltip";

const TruncatedFolderText = ({ name }) => {
  const maxLength = 16;
  const isTooLong = name.length > maxLength;
  const displayName = isTooLong ? `${name.substring(0, maxLength)}...` : name;

  if (isTooLong) {
    return (
      <InfoTooltip tooltipContent={name}>
        <span className="text-sm font-medium truncate">{displayName}</span>
      </InfoTooltip>
    );
  }

  return <span className="text-sm font-medium truncate">{name}</span>;
};

export const FolderTabs = ({
  folders = [],
  resourceType,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveResource,
  showTrashTab = false,
  deletedCount = 0,
  folderCounts = {},
}) => {
  const { activeFolderId, setActiveFolderId, draggedResourceId } = useFolderContext();
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreating(false);
    }
  };

  const handleRename = async (folderId) => {
    if (editFolderName.trim()) {
      await onRenameFolder(folderId, editFolderName.trim());
      setEditingFolderId(null);
      setEditFolderName("");
    }
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e, folderId) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const resourceId = e.dataTransfer.getData("resourceId") || draggedResourceId;
    if (resourceId && onMoveResource) {
      await onMoveResource(resourceId, folderId);
    }
  };

  return (
    <div className="w-full px-4 pb-3 pt-1 select-none flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 py-1">
        {/* All Items Tab */}
        <div
          onClick={() => setActiveFolderId(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-all duration-200 shrink-0 text-sm font-medium border ${
            activeFolderId === null
              ? "bg-primary text-primary-content border-primary shadow-sm"
              : "bg-base-200 hover:bg-base-300 text-base-content/80 border-transparent"
          }`}
        >
          {activeFolderId === null ? <FolderOpen size={15} /> : <Folder size={15} />}
          <span>All {folderCounts.all !== undefined ? `(${folderCounts.all})` : ""}</span>
        </div>

        {/* Dynamic Folder Tabs */}
        {folders.map((folder) => {
          const isSelected = activeFolderId === folder._id;
          const isEditing = editingFolderId === folder._id;
          const isDragOver = dragOverFolderId === folder._id;

          return (
            <div
              key={folder._id}
              onClick={() => !isEditing && setActiveFolderId(folder._id)}
              onDragOver={(e) => handleDragOver(e, folder._id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder._id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-sm cursor-pointer transition-all duration-200 shrink-0 text-sm font-medium border ${
                isSelected
                  ? "bg-primary text-primary-content border-primary shadow-sm"
                  : "bg-base-200 hover:bg-base-300 text-base-content/80 border-transparent"
              }`}
              style={{
                borderStyle: isDragOver ? "dashed" : "solid",
                borderWidth: isDragOver ? "2px" : "1px",
                borderColor: isDragOver
                  ? "var(--fallback-p,oklch(var(--p)/1))"
                  : isSelected
                    ? "transparent"
                    : undefined,
              }}
            >
              {isSelected ? <FolderOpen size={15} className="shrink-0" /> : <Folder size={15} className="shrink-0" />}
              {isEditing ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    maxLength={24}
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    onBlur={() => handleRename(folder._id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(folder._id);
                      if (e.key === "Escape") setEditingFolderId(null);
                    }}
                    className="input input-xs input-bordered w-32 text-base-content text-xs h-6 py-0 px-1"
                    autoFocus
                  />
                  <button
                    onClick={() => handleRename(folder._id)}
                    className="btn btn-square btn-xs btn-primary h-6 w-6"
                  >
                    <Check size={10} />
                  </button>
                  <button onClick={() => setEditingFolderId(null)} className="btn btn-square btn-xs btn-ghost h-6 w-6">
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <TruncatedFolderText name={folder.name} />
                  {folderCounts[folder._id] !== undefined && (
                    <span
                      className={`text-[11px] font-semibold opacity-80 ${isSelected ? "text-primary-content" : "text-base-content/60"}`}
                    >
                      ({folderCounts[folder._id]})
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolderId(folder._id);
                        setEditFolderName(folder.name);
                      }}
                      className="btn btn-ghost btn-xs btn-circle p-0 h-5 w-5 hover:bg-base-100/30 text-current"
                      title="Rename"
                    >
                      <Edit2 size={11} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorized Tab */}
        <div
          onClick={() => setActiveFolderId("uncategorized")}
          className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-all duration-200 shrink-0 text-sm font-medium border ${
            activeFolderId === "uncategorized"
              ? "bg-primary text-primary-content border-primary shadow-sm"
              : "bg-base-200 hover:bg-base-300 text-base-content/80 border-transparent"
          }`}
          onDragOver={(e) => handleDragOver(e, "uncategorized")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "uncategorized")}
          style={{
            borderStyle: dragOverFolderId === "uncategorized" ? "dashed" : "solid",
            borderWidth: dragOverFolderId === "uncategorized" ? "2px" : "1px",
            borderColor: dragOverFolderId === "uncategorized" ? "var(--fallback-p,oklch(var(--p)/1))" : "transparent",
          }}
        >
          <FileMinus size={15} />
          <span>Uncategorized {folderCounts.uncategorized !== undefined ? `(${folderCounts.uncategorized})` : ""}</span>
        </div>

        {/* Trash Tab (UI only) */}
        {showTrashTab && (
          <div
            onClick={() => setActiveFolderId("trash")}
            className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-all duration-200 shrink-0 text-sm font-medium border ${
              activeFolderId === "trash"
                ? "bg-error/15 text-error border-error/30 shadow-sm"
                : "bg-base-200 hover:bg-base-300 text-base-content/80 border-transparent"
            }`}
            data-testid="folder-tab-trash"
          >
            <Trash2 size={15} />
            <span>Trash ({deletedCount})</span>
          </div>
        )}

        {/* Inline Create Tab / Add Button at the end */}
        {isCreating ? (
          <form
            onSubmit={handleCreate}
            className="flex items-center gap-1 bg-base-200 px-2 py-1 shrink-0 border border-base-300"
          >
            <input
              type="text"
              maxLength={24}
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="input input-xs input-bordered w-32 h-6 text-xs"
              autoFocus
            />
            <button type="submit" className="btn btn-square btn-xs btn-primary h-6 w-6">
              <Check size={10} />
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="btn btn-square btn-xs btn-ghost h-6 w-6"
            >
              <X size={10} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-all duration-200 shrink-0 text-sm font-medium border border-dashed border-base-content/30 hover:border-primary/50 text-base-content/60 hover:text-primary bg-transparent"
          >
            <Plus size={15} />
            <span>Add Folder</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default FolderTabs;
