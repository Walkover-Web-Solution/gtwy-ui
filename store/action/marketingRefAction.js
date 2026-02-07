import { storeMarketingRefUser } from "@/config/index";

export const storeMarketingRefUserAction = (data) => async (dispatch) => {
  try {
    const response = await storeMarketingRefUser(data);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};
