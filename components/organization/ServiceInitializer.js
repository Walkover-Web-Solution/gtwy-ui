import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { usePathname } from "next/navigation";
import { getServiceAction } from "@/store/action/serviceAction";
import { getModelAction } from "@/store/action/modelAction";
import { userDetails } from "@/store/action/userDetailsAction";
import { useCustomSelector } from "@/customHooks/customSelector";
import Protected from "../Protected";

const ServiceInitializer = ({ isEmbedUser }) => {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const SERVICES = useCustomSelector((state) => state.serviceReducer.services);
  const MODELS = useCustomSelector((state) => state.modelReducer.serviceModels);
  const isOrgPage = pathname === "/org" || pathname.endsWith("/org");

  useEffect(() => {
    if (isOrgPage && !isEmbedUser) {
      dispatch(userDetails());
      dispatch(getServiceAction());
    } else if (!isOrgPage) {
      const hasServices = Array.isArray(SERVICES) && SERVICES.length > 0;
      if (!hasServices) {
        dispatch(getServiceAction());
      }
    }
  }, [dispatch, isOrgPage]);

  // Fetch models per-service:
  // - org page: always re-fetch all models
  // - non-org pages: only fetch if model data is missing from redux
  useEffect(() => {
    if (!Array.isArray(SERVICES) || SERVICES.length === 0) return;

    const getModelData = () => {
      SERVICES.forEach((service) => {
        const serviceValue = service?.value;
        if (!serviceValue) return;

        const serviceModels = MODELS?.[serviceValue];
        const hasModelData =
          serviceModels && typeof serviceModels === "object" && Object.keys(serviceModels).length > 0;

        if (isOrgPage || !hasModelData) {
          dispatch(getModelAction({ service: serviceValue }));
        }
      });
    };

    const timer = setTimeout(getModelData, 1000);
    return () => clearTimeout(timer);
  }, [SERVICES, isOrgPage]);

  return null;
};

export default Protected(ServiceInitializer);
