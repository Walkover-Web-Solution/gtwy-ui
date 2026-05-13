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

  // Always run on org page - fetches fresh service list (picks up new services from backend)
  useEffect(() => {
    if (isOrgPage && !isEmbedUser) {
      dispatch(userDetails());
      dispatch(getServiceAction());
      // Reset so non-org pages re-check after returning from org
      hasCalledAPIs.current = false;
    }
  }, [dispatch, isOrgPage]);

  // On non-org pages: fetch services only if missing from redux
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

  // Fetch models per-service:
  // - org page: always re-fetch all models (picks up new/updated services from backend)
  // - other pages: only fetch models missing from redux
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
