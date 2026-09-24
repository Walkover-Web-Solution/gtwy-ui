import { createOrg, generateAccessKey, getAllOrg, getUsers, updateOrganizationData, updateUser } from "@/config/index";
import { organizationCreated, organizationsFetched, setCurrentOrgId, usersFetched } from "../reducer/orgReducer";
import { updateToken, updateUserDetails, updateUserMeta } from "../reducer/userDetailsReducer";
import { trackOrganizationEvent } from "@/utils/posthog";
import { handleApiError, isNetworkError } from "@/utils/errorHandler";

export const createOrgAction = (dataToSend, onSuccess, onError) => async (dispatch) => {
  try {
    const data = await createOrg(dataToSend);
    if (data instanceof Error || data?.data?.success === false || !data?.data?.data?.org_id) {
      throw data instanceof Error ? data : new Error(data?.data?.message || "Failed to create organization");
    }
    const { org_id, organization, billing } = data.data.data;
    const name = organization?.name || organization?.company?.name || dataToSend?.company?.name || "";
    if (billing && billing.provisioned === false) {
      console.error(
        "Organization created but billing provisioning failed; it will be retried automatically.",
        billing.error
      );
    }
    onSuccess({ id: org_id, name });
    dispatch(organizationCreated({ id: org_id, name }));
    trackOrganizationEvent("created", { org_id, name });
  } catch (error) {
    console.error(error);
    if (onError) {
      onError(error);
    }
  }
};

export const getAllOrgAction = () => async (dispatch, getState) => {
  try {
    const response = await getAllOrg();
    dispatch(organizationsFetched(response.data));
  } catch (error) {
    console.error(error);
  }
};

export const setCurrentOrgIdAction = (orgId) => (dispatch) => {
  try {
    dispatch(setCurrentOrgId(orgId));
  } catch (error) {
    console.error(error);
  }
};

export const updateOrgTimeZone = (orgId, orgDetails) => async (dispatch) => {
  try {
    const response = await updateOrganizationData(orgId, orgDetails);
    dispatch(updateUserDetails({ orgId, updatedUserDetails: response?.data?.data?.company }));
  } catch (error) {
    console.error("Error updating organization timezone:", error);
    throw error;
  }
};
export const updateUserMetaOnboarding = (userId, user) => async (dispatch) => {
  try {
    const response = await updateUser({ user_id: userId, user });
    dispatch(updateUserMeta({ userId, user: response?.data?.data?.user }));
    return response;
  } catch (error) {
    console.error("error updating user meta");
    throw error;
  }
};

export const generateAccessKeyAction = (orgId) => async (dispatch) => {
  try {
    const response = await generateAccessKey();
    dispatch(updateToken({ orgId, auth_token: response?.data?.auth_token }));
  } catch (error) {
    console.error("Error updating organization timezone:", error);
    throw error;
  }
};

export const updateOrgMetaAction = (orgId, orgDetails) => async (dispatch) => {
  try {
    const response = await updateOrganizationData(orgId, orgDetails);
    dispatch(updateUserDetails({ orgId, updatedUserDetails: response?.data?.data?.company }));
    return response;
  } catch (error) {
    console.error("Error updating organization meta:", error);
    throw error;
  }
};

export const getUsersAction = () => async (dispatch) => {
  try {
    const response = await getUsers();
    dispatch(usersFetched(response.data));
    return response;
  } catch (error) {
    if (isNetworkError(error)) {
      handleApiError(error, "Failed to load users");
    }
    console.error("Error fetching users:", error);
  }
};
