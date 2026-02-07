"use client";
import { getFromCookies } from "@/utils/utility";
import { useEffect } from "react";

export const runtime = "edge";

const page = () => {
  useEffect(() => {
    // Check if script is already loaded
    if (document.querySelector('script[src="https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js"]')) {
      return;
    }

    const configuration = {
      authToken: getFromCookies("proxy_token") || "",
      success: (data) => {},
      failure: (error) => {
        console.error("failure reason", error);
      },
    };

    const scriptSrc = document.createElement("script");
    scriptSrc.type = "text/javascript";
    scriptSrc.src = "https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js";

    // Add configuration to window object
    window.proxyAuthConfig = configuration;

    // Add onload handler directly to script element
    scriptSrc.onload = () => {
      if (window.initVerification) {
        window.initVerification(configuration);
      } else {
        console.error("initVerification function not found");
      }
    };

    // Add error handling
    scriptSrc.onerror = (error) => {
      console.error("Failed to load script:", error);
    };

    document.body.appendChild(scriptSrc);

    return () => {
      const existingScript = document.querySelector(
        'script[src="https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js"]'
      );
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      delete window.proxyAuthConfig;
    };
  }, []);

  return <div id="proxyContainer"></div>;
};

export default page;
