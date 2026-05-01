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
  const MODELS = useCustomSelector((state) => state.modelReducer.serviceModels);
  const isOrgPage = pathname === "/org" || pathname.endsWith("/org");
  const hasCalledAPIs = useRef(false);

  useEffect(() => {
    if (hasCalledAPIs.current) return;
    hasCalledAPIs.current = true;

    const fetchServicesAndModels = async () => {
      if (isOrgPage && !isEmbedUser) {
        dispatch(userDetails());
      }

      const services = await dispatch(getServiceAction());

      if (!Array.isArray(services) || services.length === 0) return;

      services.forEach((service) => {
        const serviceValue = service?.value;
        if (serviceValue) {
          const serviceModels = MODELS?.[serviceValue];
          if (!serviceModels || !Array.isArray(serviceModels) || serviceModels.length === 0) {
            dispatch(getModelAction({ service: serviceValue }));
          }
        }
      });
    };

    fetchServicesAndModels();
  }, [isOrgPage]);
  // This component doesn't render anything
  return null;
};

export default Protected(ServiceInitializer);
