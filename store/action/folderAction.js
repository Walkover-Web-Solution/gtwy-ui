import { getAllFolders, createFolder, updateFolder, deleteFolder } from "@/config/index";
import {
  setLoading,
  setError,
  fetchFoldersReducer,
  createFolderReducer,
  updateFolderReducer,
  deleteFolderReducer,
} from "../reducer/folderReducer";
import { toast } from "react-toastify";
import { getErrorMessage } from "@/utils/errorHandler";

export const getAllFoldersAction =
  (forceRefresh = false) =>
  async (dispatch, getState) => {
    try {
      const { folderReducer } = getState();
      if (!forceRefresh && (folderReducer?.loading || folderReducer?.fetched)) {
        return;
      }
      dispatch(setLoading(true));
      const response = await getAllFolders();
      if (response?.success) {
        dispatch(fetchFoldersReducer(response.data));
      } else {
        dispatch(setError(response?.message || "Failed to fetch folders"));
      }
    } catch (error) {
      console.error("Error in getAllFoldersAction:", error);
      dispatch(setError(getErrorMessage(error)));
    }
  };

export const createFolderAction = (data) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await createFolder(data);
    if (response?.success) {
      dispatch(createFolderReducer(response.data));
      toast.success("Folder created successfully");
      return response.data;
    } else {
      dispatch(setError(response?.message || "Failed to create folder"));
      toast.error(response?.message || "Failed to create folder");
    }
  } catch (error) {
    console.error("Error in createFolderAction:", error);
    const errorMessage = getErrorMessage(error);
    dispatch(setError(errorMessage));
    toast.error(errorMessage);
  }
};

export const updateFolderAction = (data) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await updateFolder(data);
    if (response?.success) {
      dispatch(updateFolderReducer(response.data));
      toast.success("Folder updated successfully");
      return response.data;
    } else {
      dispatch(setError(response?.message || "Failed to update folder"));
      toast.error(response?.message || "Failed to update folder");
    }
  } catch (error) {
    console.error("Error in updateFolderAction:", error);
    const errorMessage = getErrorMessage(error);
    dispatch(setError(errorMessage));
    toast.error(errorMessage);
  }
};

export const deleteFolderAction = (folderId) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await deleteFolder(folderId);
    if (response?.success) {
      dispatch(deleteFolderReducer(folderId));
      toast.success("Folder deleted successfully");
      return true;
    } else {
      dispatch(setError(response?.message || "Failed to delete folder"));
      toast.error(response?.message || "Failed to delete folder");
    }
  } catch (error) {
    console.error("Error in deleteFolderAction:", error);
    const errorMessage = getErrorMessage(error);
    dispatch(setError(errorMessage));
    toast.error(errorMessage);
  }
};
