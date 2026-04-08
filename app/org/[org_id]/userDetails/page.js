"use client";
import { PROXY_SCRIPT_SRC } from "@/utils/enums";
import { getFromCookies } from "@/utils/utility";
import { useEffect } from "react";

export const runtime = "edge";

const removeProxyScript = () => {
  const existing = document.querySelector(`script[src="${PROXY_SCRIPT_SRC}"]`);
  if (existing) existing.parentNode.removeChild(existing);
};

const loadProxyScript = (config, appendTo = document.body) => {
  if (typeof window.initVerification === "function") {
    window.initVerification(config);
    return;
  }
  removeProxyScript();
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = PROXY_SCRIPT_SRC;
  script.onload = () => {
    if (typeof window.initVerification === "function") {
      window.initVerification(config);
    } else {
      console.error("initVerification function not found");
    }
  };
  script.onerror = (error) => console.error("Failed to load proxy script:", error);
  appendTo.appendChild(script);
};

const page = () => {
  useEffect(() => {
    loadProxyScript({
      authToken: getFromCookies("proxy_token") || "",
      type: "user-profile",
      success: () => {},
      failure: (error) => console.error("failure reason", error),
    });

    return () => {
      loadProxyScript(
        {
          authToken: getFromCookies("proxy_token") || "",
          pass: true,
          type: "user-management",
          exclude_role_ids: process.env.NEXT_PUBLIC_PROXY_USER_ROLE_ID,
          success: () => {},
          failure: () => {},
        },
        document.head
      );
    };
  }, []);

  return <div id="userProxyContainer"></div>;
};

export default page;
