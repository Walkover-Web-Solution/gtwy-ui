"use client";
import { getFromCookies } from "@/utils/utility";
import { useEffect } from "react";

export const runtime = "edge";

const page = () => {
  useEffect(() => {
    const configuration = {
      referenceId: process.env.NEXT_PUBLIC_REFERENCEID,
      authToken: getFromCookies("proxy_token") || "",
      type: "organization-details",
      success: (data) => {},
      failure: (error) => {
        console.error("failure reason", error);
      },
    };
    const scriptSrc = document.createElement("script");
    scriptSrc.type = "text/javascript";
    scriptSrc.src = "https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js";

    scriptSrc.onload = () => {
      if (window.initVerification) {
        window.initVerification(configuration);
      } else {
        console.error("initVerification function not found");
      }
    };

    scriptSrc.onerror = (error) => {
      console.error("Failed to load script:", error);
    };

    document.body.appendChild(scriptSrc);

    return () => {
      scriptSrc.parentNode?.removeChild(scriptSrc);
    };
  }, []);

  return <div id="proxyContainer"></div>;
};

export default page;
