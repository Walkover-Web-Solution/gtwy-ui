import { useEffect, useRef } from "react";
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
  const hasCalledAPIs = useRef(false);

  // Always run on org page - initial data fetch
  useEffect(() => {
    if (isOrgPage && !isEmbedUser) {
      dispatch(userDetails());
      dispatch(getServiceAction());
    }
  }, [dispatch, isOrgPage]);

  useEffect(() => {
    if (!isOrgPage && !hasCalledAPIs.current) {
      const hasServices = Array.isArray(SERVICES) && SERVICES.length > 0;
      const hasModels = MODELS && Object.keys(MODELS).length > 0;
      if (!hasServices || !hasModels) {
        hasCalledAPIs.current = true;
        dispatch(getServiceAction());
      }
    }
  }, [dispatch, isOrgPage, SERVICES, MODELS]);
  // Fetch models for each service and retry if models are missing
  useEffect(() => {
    const getModelData = async () => {
      if ((Array.isArray(SERVICES) && SERVICES.length > 0 && !Object.entries(MODELS).length) || isOrgPage) {
        SERVICES.forEach((service) => {
          const serviceValue = service?.value;
          if (serviceValue) {
            const serviceModels = MODELS?.[serviceValue];

            if (!serviceModels || !Array.isArray(serviceModels) || serviceModels.length === 0) {
              dispatch(getModelAction({ service: serviceValue }));
            }
          }
        });
      }
    };
    setTimeout(() => {
      getModelData();
    }, 1000);
  }, [SERVICES, MODELS, isOrgPage]);
  // This component doesn't render anything
  return null;
};

export default Protected(ServiceInitializer);
