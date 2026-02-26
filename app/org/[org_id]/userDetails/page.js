"use client";
import { getFromCookies, openModal } from "@/utils/utility";
import { useEffect } from "react";
import { MODAL_TYPE } from "@/utils/enums";

export const runtime = "edge";

const PROXY_SCRIPT_SRC = "https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js";

const removeProxyScript = () => {
  const existing = document.querySelector(`script[src="${PROXY_SCRIPT_SRC}"]`);
  if (existing) existing.parentNode.removeChild(existing);
};

const loadProxyScript = (config, appendTo = document.body) => {
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

  useEffect(() => {
    const handleOpenDialog = () => openModal(MODAL_TYPE.INVITE_USER);
    window.addEventListener("openAddUserDialog", handleOpenDialog);
    return () => window.removeEventListener("openAddUserDialog", handleOpenDialog);
  }, []);

  return <div id="proxyContainer"></div>;
};

export default page;
