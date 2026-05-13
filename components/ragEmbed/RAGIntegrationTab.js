"use client";

import React, { useMemo } from "react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useParams } from "next/navigation";
import RAGEmbedContent from "./RAGEmbedContent";

const RAGIntegrationTab = ({ data }) => {
  const params = useParams();

  const embedToken = useCustomSelector((state) => state?.integrationReducer?.embedTokens?.[data?.folder_id] || "");

  // Prepare params object for RAGEmbedContent
  const contentParams = useMemo(
    () => ({
      org_id: params.org_id || data?.org_id,
    }),
    [params.org_id, data?.org_id]
  );

  return (
    <div className="overflow-y-auto h-full">
      <RAGEmbedContent params={contentParams} folderId={data?.folder_id} embedToken={embedToken} />
    </div>
  );
};

export default RAGIntegrationTab;
