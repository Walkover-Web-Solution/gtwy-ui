import {
  createOrg,
  generateAccessKey,
  generateGtwyAccessTokenApi,
  getAllOrg,
  getUsers,
  updateOrganizationData,
  updateUser,
} from "@/config/index";
import { organizationCreated, organizationsFetched, setCurrentOrgId, usersFetched } from "../reducer/orgReducer";
import { updateGtwyAccessToken, updateToken, updateUserDetails, updateUserMeta } from "../reducer/userDetailsReducer";
import { trackOrganizationEvent } from "@/utils/posthog";

export const createOrgAction = (dataToSend, onSuccess, onError) => async (dispatch) => {
  try {
    const data = await createOrg(dataToSend);
    onSuccess(data.data.data);
    dispatch(organizationCreated(data));
    if (data?.data?.data) {
      trackOrganizationEvent("created", {
        org_id: data.data.data.id,
        name: data.data.data.name,
      });
    }
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

export const generateGtwyAccessTokenAction = (orgId) => async (dispatch) => {
  try {
    const response = await generateGtwyAccessTokenApi();
    if (response) {
      dispatch(updateGtwyAccessToken({ orgId, gtwyAccessToken: response?.data?.gtwyAccessToken }));
    }
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
    console.error("Error fetching users:", error);
  }
};
