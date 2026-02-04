import { userdetails } from "@/config/index";
import { fetchUserDetails } from "../reducer/userDetailsReducer";
import posthog, { trackAuthEvent } from "@/utils/posthog";

export const userDetails = () => async (dispatch, getState) => {
  try {
    const data = await userdetails();
    dispatch(fetchUserDetails(data.data.data[0]));
    if (data?.data?.data[0]) {
      const userData = data.data.data[0];
      posthog.identify(userData.id, {
        email: userData.email,
        created_at: userData.created_at,
        user_id: userData.id,
        name: userData.name,
        total_organizations: userData.c_companies?.length || 0,
      });

      // Track user details fetched
      trackAuthEvent("user_details_fetched", {
        user_id: userData.id,
        has_organizations: (userData.c_companies?.length || 0) > 0,
      });
    }
    return data.data.data[0];
  } catch (error) {
    console.error(error);
  }
};
