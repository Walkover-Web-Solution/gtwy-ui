"use client";

import React from "react";
import { Lock } from "lucide-react";
import { useParams } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
export const runtime = "edge";

const WebhookPage = () => {
  const params = useParams();
  const { orgRole } = useCustomSelector((state) => ({
    orgRole: state?.userDetailsReducer?.organizations?.[params.org_id]?.role_name || "Viewer",
  }));

  if (orgRole === "Viewer")
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <Lock size={48} className="text-error mb-4" />
          <h2 className="text-xl font-bold text-center">Access Restricted</h2>
          <p className="text-center mt-2">This page is locked for viewers</p>
        </div>
      </div>
    );
  return <div className="w-full h-screen flex flex-col " id="alert-embed-parent"></div>;
};

export default WebhookPage;
