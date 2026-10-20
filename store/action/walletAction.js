import {
  getWalletBalance,
  getCreditPacks,
  buyCredits,
  getMyPlan,
  getPlans,
  getRecentInvoices,
} from "@/config/walletApi";
import { fetchWalletReducer } from "../reducer/walletReducer";

export const getWalletAction = () => async (dispatch) => {
  try {
    const { data } = await getWalletBalance();
    dispatch(fetchWalletReducer(data ?? null));
    return data ?? null;
  } catch (error) {
    console.error(error);
    dispatch(fetchWalletReducer(null));
    return null;
  }
};

// Pass-through thunks: call the API and return its response unchanged (errors propagate to the caller).
export const getWalletBalanceAction = () => async () => getWalletBalance();
export const getCreditPacksAction = () => async () => getCreditPacks();
export const buyCreditsAction = (usd) => async () => buyCredits(usd);
export const getMyPlanAction = () => async () => getMyPlan();
export const getPlansAction = () => async () => getPlans();
export const getRecentInvoicesAction = () => async () => getRecentInvoices();
