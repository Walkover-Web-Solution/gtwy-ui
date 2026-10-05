import { getWalletBalance } from "@/config/walletApi";
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
