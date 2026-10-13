import { useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { usePathname } from "next/navigation";
import { getServiceAction } from "@/store/action/serviceAction";
import { getModelAction } from "@/store/action/modelAction";
import { userDetails } from "@/store/action/userDetailsAction";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getBlockedOrgs } from "@/config/organizationApi";
import { setBlockedOrgs } from "@/store/reducer/userDetailsReducer";
import Protected from "../Protected";

const ServiceInitializer = ({ isEmbedUser }) => {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const SERVICES = useCustomSelector((state) => state.serviceReducer.services);
  const MODELS = useCustomSelector((state) => state.modelReducer.serviceModels);
  const isOrgPage = pathname === "/org" || pathname.endsWith("/org");

  // Stable key of service values so the models effect only re-runs when the actual set of services changes,
  // not on every new SERVICES array reference or MODELS update (which caused a fetch loop on the org page)
  const serviceKeys = useMemo(
    () =>
      Array.isArray(SERVICES)
        ? SERVICES.map((service) => service?.value)
            .filter(Boolean)
            .join(",")
        : "",
    [SERVICES]
  );

  useEffect(() => {
    if (isEmbedUser) {
      // Embed users: always refetch services on every load, ignoring cached redux/localStorage data
      dispatch(getServiceAction());
    } else if (isOrgPage) {
      dispatch(userDetails());
      dispatch(getServiceAction());
      getBlockedOrgs()
        .then((response) => {
          dispatch(setBlockedOrgs(response?.data?.data || []));
        })
        .catch((error) => {
          console.error("Failed to fetch blocked organizations", error);
        });
    } else {
      const hasServices = Array.isArray(SERVICES) && SERVICES.length > 0;
      if (!hasServices) {
        dispatch(getServiceAction());
      }
    }
  }, [dispatch, isOrgPage, isEmbedUser]);

  // Fetch models per-service (runs once per page load for a given set of services):
  // - embed users: always re-fetch on every refresh, even if cached
  // - org page: re-fetch all models once
  // - non-org pages: only fetch if model data is missing from redux
  useEffect(() => {
    if (!serviceKeys) return;

    const getModelData = () => {
      serviceKeys.split(",").forEach((serviceValue) => {
        const serviceModels = MODELS?.[serviceValue];
        const hasModelData =
          serviceModels && typeof serviceModels === "object" && Object.keys(serviceModels).length > 0;

        if (isEmbedUser || isOrgPage || !hasModelData) {
          dispatch(getModelAction({ service: serviceValue }));
        }
      });
    };

    const timer = setTimeout(getModelData, 1000);
    return () => clearTimeout(timer);
    // MODELS is intentionally excluded: including it re-triggers this effect after every model fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceKeys, isOrgPage, isEmbedUser]);

  return null;
};

export default Protected(ServiceInitializer);
