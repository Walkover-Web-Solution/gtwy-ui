"use client";
import { loginUser, switchOrg, switchUser } from "@/config/index";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useLayoutEffect, useState } from "react";
import { userDetails } from "@/store/action/userDetailsAction";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import ErrorPage from "@/app/not-found";
import { getFromCookies, removeCookie, setInCookies } from "@/utils/utility";
import { trackAuthEvent } from "@/utils/posthog";

const handleUserDetailsAndSwitchOrg = async (url, dispatch, userDetails) => {
  const userDetailsData = await dispatch(userDetails());
  const companyRefId = extractCompanyRefId(url);
  if (companyRefId) {
    const company = userDetailsData?.c_companies?.find((company) => company.id == companyRefId);
    await switchOrg(companyRefId);
    const localToken = await switchUser({ orgId: companyRefId, orgName: company.name });
    setInCookies("local_token", localToken.token);
    return url;
  } else {
    const companyId = userDetailsData?.currentCompany?.id;
    await switchOrg(companyId);
    const localToken = await switchUser({ orgId: companyId, orgName: userDetailsData?.currentCompany?.name });
    setInCookies("local_token", localToken.token);
    return `/org/${companyId}/agents`;
  }
};

const extractCompanyRefId = (url) => {
  const regex = /\/org\/(\d+)\//; // This assumes the company_ref_id is between '/org/' and another '/'
  const match = url.match(regex);
  return match ? match[1] : null;
};

const WithAuth = (Children) => {
  return (props) => {
    const router = useRouter();
    const dispatch = useDispatch();
    const pathName = usePathname();
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const proxy_auth_token = searchParams.get("proxy_auth_token");
    // This effect is called only once when the component is mounted
    // It checks if the user has already logged in or not
    // If the user has logged in, it will redirect the user to the bridges page
    // If the user has not logged in, it will redirect the user to the login page

    const isEmbedUser = useCustomSelector((state) => state.appInfoReducer.embedUserDetails.isEmbedUser);

    useLayoutEffect(() => {
      const runEffect = async (isEmbedUser) => {
        const proxyToken = getFromCookies("proxy_token");
        const proxyAuthToken = proxy_auth_token;
        let redirectionUrl = getFromCookies("previous_url") || "/org";
        if (isEmbedUser) {
          const proxy_auth_token = sessionStorage.getItem("proxy_token");
          const org_id = sessionStorage.getItem("gtwy_org_id");
          if (proxy_auth_token && org_id) {
            router.replace(`/org/${org_id}/agents`);
            return;
          } else {
            setLoading(false);
            <ErrorPage />;
            return;
          }
        }
        if (proxyToken) {
          router.replace("/org");
          return;
        }

        if (proxyAuthToken) {
          setLoading(true);
          setInCookies("proxy_token", proxyAuthToken);

          const localToken = await loginUser({
            userId: searchParams.get("user_ref_id"),
            orgId: searchParams.get("company_ref_id"),
            userName: "",
            orgName: "",
          });
          setInCookies("local_token", localToken.token);

          const finalRedirectUrl = await handleUserDetailsAndSwitchOrg(redirectionUrl, dispatch, userDetails);

          trackAuthEvent("user_logged_in", {
            user_id: searchParams.get("user_ref_id"),
            org_id: searchParams.get("company_ref_id"),
          });
          router.replace(finalRedirectUrl);
          removeCookie("previous_url");
          return;
        } else {
          setLoading(false);
        }

        const configuration = {
          referenceId: process.env.NEXT_PUBLIC_REFERENCEID,
          addInfo: {
            redirect_path: "/login",
          },
          success: (data) => {
            console.dir("success response", data);
          },
          failure: (error) => {
            console.error("failure reason", error);
          },
        };

        // Load the login script from msg91
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.onload = () => {
          const checkInitVerification = setInterval(() => {
            if (typeof initVerification === "function") {
              clearInterval(checkInitVerification);
              initVerification(configuration); // Initialize the login process
            }
          }, 100);
        };
        script.src = "https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js";
        document.body.appendChild(script); // Add the script to the page
      };

      runEffect(isEmbedUser);
    }, [isEmbedUser, pathName, proxy_auth_token]);

    return <Children {...props} loading={loading} />;
  };
};

export default WithAuth;
