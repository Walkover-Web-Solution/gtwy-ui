"use client";
import CreateOrg from "@/components/CreateNewOrg";
import Protected from "@/components/Protected";
import OrganizationHeader from "@/components/organization/OrganizationHeader";
import OrganizationGrid from "@/components/organization/OrganizationGrid";
import { ThemeManager } from "@/customHooks/useThemeManager";
import ServiceInitializer from "@/components/organization/ServiceInitializer";
import { switchOrg, switchUser } from "@/config/index";
import { useCustomSelector } from "@/customHooks/customSelector";
import { setCurrentOrgIdAction } from "@/store/action/orgAction";
import { setInCookies, getFromCookies } from "@/utils/utility";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import LoadingSpinner from "@/components/LoadingSpinner";

/**
 * The organizations page that displays all the organizations
 * the current user is a member of.
 */
function Page() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const dispatch = useDispatch();
  const route = useRouter();
  const searchParams = useSearchParams();
  const organizations = useCustomSelector((state) => state.userDetailsReducer.organizations);
  const currentUserId = useCustomSelector((state) => state.userDetailsReducer.userDetails?.id);
  const [displayedOrganizations, setDisplayedOrganizations] = useState([]);

  const handleSwitchOrg = useCallback(
    async (id, name) => {
      try {
        const response = await switchOrg(id);
        const localToken = await switchUser({ orgId: id, orgName: name });
        setInCookies("local_token", localToken.token);
        route.push(`/org/${id}/agents`);
        dispatch(setCurrentOrgIdAction(id));
        if (response.status === 200) {
        } else {
          console.error("Failed to switch organization", response.data);
        }
      } catch (error) {
        console.error("Error switching organization", error);
      }
    },
    [dispatch, route]
  );

  const organizationsArray = useMemo(() => {
    return organizations ? Object.values(organizations) : [];
  }, [organizations]);

  useEffect(() => {
    const redirectPreviousUrl = searchParams.get("redirect_previous_url");
    if (redirectPreviousUrl === "true") {
      setIsRedirecting(true);
      const currentOrgId = getFromCookies("current_org_id");
      setInCookies("unlimited_access", true);
      if (currentOrgId) {
        route.push(`/org/${currentOrgId}/agents`);
        return;
      } else {
        setIsRedirecting(false);
      }
    }
  }, [searchParams, route]);

  // Initialize displayed organizations when organizations data changes
  useEffect(() => {
    setDisplayedOrganizations(organizationsArray);
  }, [organizationsArray]);

  // Show loader if redirecting
  if (isRedirecting) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col justify-start items-center min-h-screen bg-base-100 px-2 md:px-0">
      <ServiceInitializer />
      <ThemeManager userType="default" />
      <div className="w-full max-w-4xl mt-4 flex flex-col gap-3">
        <OrganizationHeader
          organizationsArray={organizationsArray}
          setDisplayedOrganizations={setDisplayedOrganizations}
        />
        <OrganizationGrid
          displayedOrganizations={displayedOrganizations}
          handleSwitchOrg={handleSwitchOrg}
          currentUserId={currentUserId}
        />
        <CreateOrg handleSwitchOrg={handleSwitchOrg} />
      </div>
    </div>
  );
}

export default Protected(Page);
