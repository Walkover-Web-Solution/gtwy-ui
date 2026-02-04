import { setEmbedUserDetails, clearEmbedThemeDetails } from "../reducer/appInfoReducer";

// Action creators for embed user details
export const setEmbedUserDetailsAction = (embedUserData) => (dispatch) => {
  try {
    dispatch(setEmbedUserDetails(embedUserData));
  } catch (error) {
    console.error("Error setting embed user details:", error);
  }
};

export const clearEmbedThemeDetailsAction = () => (dispatch) => {
  try {
    dispatch(clearEmbedThemeDetails());
  } catch (error) {
    console.error("Error clearing embed user details:", error);
  }
};
