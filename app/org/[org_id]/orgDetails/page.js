"use client";
import { PROXY_SCRIPT_SRC } from "@/utils/enums";
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
    if (typeof window.initVerification === "function") {
      window.initVerification(configuration);
      return;
    }

    const scriptSrc = document.createElement("script");
    scriptSrc.type = "text/javascript";
    scriptSrc.src = PROXY_SCRIPT_SRC;

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

  return <div id="userProxyContainer"></div>;
};

export default page;
