import {
  createKnowledgeBaseEntry,
  createResource,
  deleteKnowBaseData,
  deleteResource,
  getAllKnowBaseData,
  getKnowledgeBaseToken,
  updateKnowledgeBaseEntry,
  updateResource,
} from "@/config/index";

import { toast } from "react-toastify";
import {
  addKnowbaseDataReducer,
  backupKnowledgeBaseReducer,
  deleteKnowledgeBaseReducer,
  fetchAllKnowlegdeBaseData,
  knowledgeBaseRollBackReducer,
  updateKnowledgeBaseReducer,
} from "../reducer/knowledgeBaseReducer";
import { trackKnowledgeBaseEvent } from "@/utils/posthog";

export const createKnowledgeBaseEntryAction = (data, orgId) => async (dispatch) => {
  try {
    const response = await createKnowledgeBaseEntry(data);
    if (response.data) {
      toast.success(response?.data?.message);
      dispatch(
        addKnowbaseDataReducer({
          orgId,
          data: response?.data,
          _id: response?.data?._id,
        })
      );

      trackKnowledgeBaseEvent("created", {
        id: response?.data?._id,
        org_id: orgId,
        type: response?.data?.type,
      });

      return response?.data;
    }
  } catch (error) {
    console.error(error);
  }
};
export const getKnowledgeBaseTokenAction = (orgId) => async (dispatch) => {
  try {
    const response = await getKnowledgeBaseToken();
    if (response) {
      return { response };
    }
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};
export const getAllKnowBaseDataAction = (orgId) => async (dispatch) => {
  try {
    const response = await getAllKnowBaseData();
    if (response) {
      dispatch(fetchAllKnowlegdeBaseData({ data: response, orgId }));
    }
  } catch (error) {
    toast.error("something went wrong");
    console.error(error);
  }
};

export const deleteKnowBaseDataAction =
  ({ data }) =>
  async (dispatch) => {
    try {
      // Step 1: Create a backup of the current state
      dispatch(backupKnowledgeBaseReducer({ orgId: data?.orgId }));
      dispatch(deleteKnowledgeBaseReducer({ id: data?.id, orgId: data?.orgId }));
      const response = await deleteKnowBaseData(data);
      if (response) {
        toast.success(response.message);

        trackKnowledgeBaseEvent("deleted", {
          id: data?.id,
          org_id: data?.orgId,
        });
      }
    } catch (error) {
      dispatch(knowledgeBaseRollBackReducer({ orgId: data?.orgId }));
      console.error(error);
    }
  };

export const updateKnowledgeBaseAction = (data, orgId) => async (dispatch) => {
  try {
    dispatch(backupKnowledgeBaseReducer({ orgId }));
    dispatch(
      updateKnowledgeBaseReducer({
        orgId,
        data: data,
        _id: data?._id,
      })
    );
    const response = await updateKnowledgeBaseEntry(data);
    if (response.data) {
      toast.success(response?.data?.message);
      dispatch(
        updateKnowledgeBaseReducer({
          orgId,
          data: response?.data?.data,
          _id: response?.data?.data?._id,
        })
      );

      trackKnowledgeBaseEvent("updated", {
        id: response?.data?.data?._id,
        org_id: orgId,
        type: response?.data?.data?.type,
      });
    }
  } catch (error) {
    dispatch(knowledgeBaseRollBackReducer({ orgId }));
    console.error(error);
  }
};

export const createResourceAction = (data, orgId) => async (dispatch) => {
  try {
    const response = await createResource(data);
    if (response.data) {
      toast.success(response?.data?.message);
      dispatch(
        addKnowbaseDataReducer({
          orgId,
          data: response?.data,
          _id: response?.data?._id,
        })
      );
    }
    return response?.data;
  } catch (error) {
    console.error(error);
  }
};

export const updateResourceAction = (resourceId, payload, orgId) => async (dispatch) => {
  try {
    const response = await updateResource(resourceId, payload);
    if (response?.success) {
      dispatch(
        updateKnowledgeBaseReducer({
          orgId,
          _id: resourceId,
          data: response.data || payload,
        })
      );
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error("Error updating resource:", error);
    return { success: false };
  }
};

export const deleteResourceAction =
  ({ data }) =>
  async (dispatch) => {
    try {
      const response = await deleteResource(data?.id);
      if (response?.success) {
        dispatch(
          deleteKnowledgeBaseReducer({
            orgId: data?.orgId,
            id: data?.id,
          })
        );
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error("Error deleting resource:", error);
      return { success: false };
    }
  };
