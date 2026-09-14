import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;

export const getWalletBalance = async () => {
  try {
    const { data } = await axios.get(`${URL}/api/lago/wallet`);
    return data;
  } catch (error) {
    console.error("getWalletBalance failed:", error);
    throw error;
  }
};
export const getMyPlan = async () => {
  try {
    const { data } = await axios.get(`${URL}/api/lago/plan/org/me`);
    return data;
  } catch (error) {
    console.error("getMyPlan failed:", error);
    throw error;
  }
};

export const getPlans = async () => {
  try {
    const { data } = await axios.get(`${URL}/api/billing-plans/org/public`);
    return data;
  } catch (error) {
    console.error("getPlans failed:", error);
    throw error;
  }
};
