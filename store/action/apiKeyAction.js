import { deleteApikey, getAllApikey, saveApiKeys, updateApikey } from "@/config/index";
import {
  apikeyDataReducer,
  apikeyDeleteReducer,
  apikeyRollBackReducer,
  apikeyUpdateReducer,
  backupApiKeysReducer,
  createApiKeyReducer,
} from "../reducer/apiKeysReducer";
import { toast } from "react-toastify";
import { trackUserAction } from "@/utils/posthog";

export const saveApiKeysAction = (data, orgId) => async (dispatch) => {
  try {
    const response = await saveApiKeys(data);
    if (response.data?.success) {
      dispatch(createApiKeyReducer({ org_id: orgId, data: response?.data?.api }));
      trackUserAction("api_key_created", {
        org_id: orgId,
        api_key_name: response?.data?.api?.name,
      });
    }
    return response.data.api;
  } catch (error) {
    console.error(error);
  }
};

export const updateApikeyAction = (dataToSend) => async (dispatch) => {
  // Step 1: Create a backup of the current state
  dispatch(backupApiKeysReducer({ org_id: dataToSend.org_id }));

  // Step 2: Perform optimistic update in the UI
  dispatch(
    apikeyUpdateReducer({
      org_id: dataToSend.org_id,
      id: dataToSend.apikey_object_id,
      name: dataToSend.name,
      data: dataToSend.apikey,
      comment: dataToSend.comment,
      apikey_limit: dataToSend.apikey_limit,
      apikey_usage: dataToSend.apikey_usage,
    })
  );

  try {
    // Step 3: Make the actual API call
    const response = await updateApikey(dataToSend);
    if (response.data?.success) {
      dispatch(
        apikeyUpdateReducer({
          org_id: dataToSend.org_id,
          id: dataToSend.apikey_object_id,
          name: dataToSend.name,
          data: response.data.apikey,
          comment: dataToSend.comment,
          apikey_limit: dataToSend.apikey_limit,
          apikey_usage: dataToSend.apikey_usage,
        })
      );
      trackUserAction("api_key_updated", {
        org_id: dataToSend.org_id,
        api_key_id: dataToSend.apikey_object_id,
        api_key_name: dataToSend.name,
      });
      return response.data.success;
    } else {
      dispatch(apikeyRollBackReducer({ org_id: dataToSend.org_id }));
    }
  } catch (error) {
    // API call failed with exception
    console.error(error);
    // Roll back to the original state
    dispatch(apikeyRollBackReducer({ org_id: dataToSend.org_id }));
  }
};

export const deleteApikeyAction =
  ({ org_id, name, id }) =>
  async (dispatch, getState) => {
    // Step 1: Create a backup of the current state
    dispatch(backupApiKeysReducer({ org_id }));
    // Step 2: Optimistically delete from UI immediately
    dispatch(apikeyDeleteReducer({ org_id, name }));
    try {
      // Step 3: Make the API call in the background
      const response = await deleteApikey(id);
      if (response.data?.success) {
        dispatch(apikeyDeleteReducer({ org_id, name }));
        trackUserAction("api_key_deleted", {
          org_id: org_id,
          api_key_id: id,
          api_key_name: name,
        });
      } else {
        dispatch(apikeyRollBackReducer({ org_id }));
      }
    } catch (error) {
      // API call failed with exception
      console.error(error);
      // Roll back to original state
      dispatch(apikeyRollBackReducer({ org_id }));
    }
  };

export const getAllApikeyAction = (org_id) => async (dispatch) => {
  try {
    const response = await getAllApikey({ org_id: org_id });
    if (response.data.success) dispatch(apikeyDataReducer({ org_id, data: response.data.result }));
  } catch (error) {
    console.error(error);
    toast.error(error);
  }
};
