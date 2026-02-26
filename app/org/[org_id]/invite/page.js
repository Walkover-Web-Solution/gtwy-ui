"use client";
import { useEffect } from "react";
import Protected from "@/components/Protected";

export const runtime = "edge";

function UserManagementPage({ params }) {
  // MSG91 Proxy Auth Token
  useEffect(() => {
    const handleOpenDialog = () => {
      window.dispatchEvent(new CustomEvent("showUserManagement"));
    };

    window.addEventListener("openAddUserDialog", handleOpenDialog);

    return () => {
      window.removeEventListener("openAddUserDialog", handleOpenDialog);
    };
  }, []);

  return <div id="userProxyContainer"></div>;
}

export default Protected(UserManagementPage);
