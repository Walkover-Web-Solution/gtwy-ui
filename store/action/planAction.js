import { getMyPlan } from "@/config/walletApi";
import { fetchPlanReducer } from "../reducer/planReducer";

export const getPlanAction = () => async (dispatch) => {
  try {
    const { data } = await getMyPlan();
    if (data) {
      dispatch(fetchPlanReducer(data));
    }
  } catch (error) {
    console.error(error);
  }
};
