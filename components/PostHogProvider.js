"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog, { trackOrganizationEvent } from "@/utils/posthog";
import { useCustomSelector } from "@/customHooks/customSelector";

export default function PostHogProvider({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathRef = useRef(null);

  const userInfo = useCustomSelector((state) => state.userDetailsReducer.userInfo);
  const currentOrg = useCustomSelector((state) => state.orgReducer.currentOrgId);
  const organizations = useCustomSelector((state) => state.userDetailsReducer.userInfo?.c_companies);

  useEffect(() => {
    if (pathname) {
      const url = window.origin + pathname;
      if (searchParams.toString()) {
        const fullUrl = `${url}?${searchParams.toString()}`;
        posthog.capturePageview({
          $current_url: fullUrl,
        });
      } else {
        posthog.capturePageview({
          $current_url: url,
        });
      }
      previousPathRef.current = pathname;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (userInfo && userInfo.id) {
      posthog.identify(userInfo.id, {
        email: userInfo.email,
        name: userInfo.name,
        created_at: userInfo.created_at,
        user_id: userInfo.id,
        user_type: userInfo.user_type || "standard",
        total_organizations: organizations?.length || 0,
      });
    }
  }, [userInfo, organizations]);

  useEffect(() => {
    if (currentOrg && organizations) {
      const currentOrgData = organizations.find((org) => org.id === currentOrg);

      if (currentOrgData) {
        posthog.group("organization", currentOrg, {
          name: currentOrgData.name,
          org_id: currentOrg,
          created_at: currentOrgData.created_at,
        });

        posthog.setPersonProperties({
          current_org_id: currentOrg,
          current_org_name: currentOrgData.name,
        });

        trackOrganizationEvent("switched", {
          org_id: currentOrg,
          name: currentOrgData.name,
        });
      }
    }
  }, [currentOrg, organizations]);

  return <>{children}</>;
}
