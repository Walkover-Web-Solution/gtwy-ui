import { getAllServices } from "@/config/index";
import { fetchServiceReducer } from "../reducer/serviceReducer";

export const getServiceAction = () => async (dispatch) => {
  try {
    const data = await getAllServices();

    if (data && typeof data === "object") {
      const default_model = { ...data?.services };

      const services = Object.keys(data?.services).map((service) => ({
        value: service,
        displayName: data?.services?.[service]?.default_name,
      }));

      dispatch(fetchServiceReducer({ services, default_model }));
    }
  } catch (error) {
    console.error(error);
  }
};
