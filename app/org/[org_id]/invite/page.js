"use client";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { getFromCookies } from "@/utils/utility";
import Protected from "@/components/Protected";

export const runtime = "edge";

function UserManagementPage({ params }) {
  // MSG91 Proxy Auth Token
  const PROXY_AUTH_TOKEN = getFromCookies("proxy_token");

  // Initialize MSG91 proxy auth configuration
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Configuration for MSG91 Proxy Auth
      const configuration = {
        authToken: PROXY_AUTH_TOKEN,
        pass: true,
        type: "user-management",
        success: (data) => {
          // get verified token in response
          console.log("MSG91 Auth success response", data);
          toast.success("Authentication verified successfully!");
        },
        failure: (error) => {
          // handle error
          console.log("MSG91 Auth failure reason", error);
          toast.error("Authentication failed. Please try again.");
        },
      };

      // Load MSG91 Proxy Auth Script
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js";
      script.onload = function () {
        if (typeof initVerification === "function") {
          initVerification(configuration);
        }
      };
      document.head.appendChild(script);

      // Cleanup function to remove script on unmount
      return () => {
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, []);

  return <div id="userProxyContainer"></div>;
}

export default Protected(UserManagementPage);
