import { useEffect, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllFoldersAction,
  createFolderAction,
  updateFolderAction,
  deleteFolderAction,
} from "@/store/action/folderAction";
import { updateBridgeAction, updateFuntionApiAction } from "@/store/action/bridgeAction";
import { updateApikeyAction } from "@/store/action/apiKeyAction";
import { FolderContext } from "@/components/folders/FolderContext";

export const useFolders = (resourceType, orgId, passedIsEmbedUser) => {
  const dispatch = useDispatch();
  const foldersStateRaw = useSelector((state) => state.folderReducer?.folders);
  const foldersState = Array.isArray(foldersStateRaw) ? foldersStateRaw : [];
  const folderContext = useContext(FolderContext);
  const clearSelection = folderContext?.clearSelection || (() => {});

  useEffect(() => {
    if (!passedIsEmbedUser) {
      try {
        dispatch(getAllFoldersAction());
      } catch (err) {
        console.error("Failed to dispatch getAllFoldersAction:", err);
      }
    }
  }, [dispatch, passedIsEmbedUser]);

  // Filter folders by resourceType
  const folders = foldersState.filter((f) => f && f.type === resourceType);

  const handleCreateFolder = async (name) => {
    if (!name) return;
    try {
      return await dispatch(createFolderAction({ name, type: resourceType, config: {} }));
    } catch (err) {
      console.error("Failed to dispatch createFolderAction:", err);
    }
  };

  const handleRenameFolder = async (folderId, name) => {
    if (!folderId || !name) return;
    try {
      const folder = foldersState.find((f) => f && f._id === folderId);
      return await dispatch(
        updateFolderAction({
          folder_id: folderId,
          name,
          type: resourceType,
          config: folder?.config || {},
        })
      );
    } catch (err) {
      console.error("Failed to dispatch updateFolderAction (rename):", err);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!folderId) return;
    try {
      // If knowledgebase, we don't need to do extra cleanup since deleting the folder deletes the config containing resourceIds
      return await dispatch(deleteFolderAction(folderId));
    } catch (err) {
      console.error("Failed to dispatch deleteFolderAction:", err);
    }
  };

  // Helper to associate a resource with a folder
  const moveResource = async (resourceId, targetFolderId) => {
    if (!resourceId) return;
    try {
      // targetFolderId can be a MongoDB folder ID, "uncategorized", or null
      const finalFolderId = targetFolderId === "uncategorized" || targetFolderId === null ? null : targetFolderId;

      if (resourceType === "agent") {
        await dispatch(
          updateBridgeAction({
            bridgeId: resourceId,
            dataToSend: { folder_id: finalFolderId },
          })
        );
      } else if (resourceType === "apikey") {
        await dispatch(
          updateApikeyAction({
            apikey_object_id: resourceId,
            folder_id: finalFolderId,
            org_id: orgId,
          })
        );
      } else if (resourceType === "tools") {
        await dispatch(
          updateFuntionApiAction({
            function_id: resourceId,
            dataToSend: { folder_id: finalFolderId },
          })
        );
      } else if (resourceType === "knowledgebase") {
        // 1. Find previous folder containing this resource ID
        const prevFolder = foldersState.find(
          (f) => f && f.type === "knowledgebase" && f.config?.resourceIds?.includes(resourceId)
        );

        // 2. Remove from previous folder
        if (prevFolder && prevFolder._id) {
          const updatedResourceIds = (prevFolder.config?.resourceIds || []).filter((id) => id !== resourceId);
          await dispatch(
            updateFolderAction({
              folder_id: prevFolder._id,
              name: prevFolder.name,
              type: "knowledgebase",
              config: { ...prevFolder.config, resourceIds: updatedResourceIds },
            })
          );
        }

        // 3. Add to target folder
        if (finalFolderId) {
          const targetFolder = foldersState.find((f) => f && f._id === finalFolderId);
          if (targetFolder && targetFolder._id) {
            const updatedResourceIds = [...(targetFolder.config?.resourceIds || []), resourceId];
            await dispatch(
              updateFolderAction({
                folder_id: targetFolder._id,
                name: targetFolder.name,
                type: "knowledgebase",
                config: { ...targetFolder.config, resourceIds: updatedResourceIds },
              })
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to move resource:", err);
    }
  };

  const bulkMoveResources = async (resourceIds, targetFolderId) => {
    if (!Array.isArray(resourceIds)) return;
    try {
      for (const id of resourceIds) {
        if (id) {
          await moveResource(id, targetFolderId);
        }
      }
      if (typeof clearSelection === "function") {
        clearSelection();
      }
    } catch (err) {
      console.error("Failed to bulk move resources:", err);
    }
  };

  return {
    folders,
    createFolder: handleCreateFolder,
    renameFolder: handleRenameFolder,
    deleteFolder: handleDeleteFolder,
    moveResource,
    bulkMoveResources,
  };
};
export default useFolders;
