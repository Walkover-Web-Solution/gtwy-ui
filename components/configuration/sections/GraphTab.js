"use client";

import React from "react";
import AgentGraph from "../AgentGraph";
import { useConfigurationContext } from "../ConfigurationContext";
import Protected from "@/components/Protected";

const GraphTab = ({ isPublished }) => {
  const { params, searchParams } = useConfigurationContext();

  return (
    <div data-testid="graph-tab-container" id="graph-tab-container" className="flex flex-col w-full relative">
      <AgentGraph agentId={params?.id} orgId={params?.org_id} versionId={searchParams?.version} />
    </div>
  );
};

export default Protected(GraphTab);
