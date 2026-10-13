"use client";
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { History, Loader2 } from "lucide-react";
import { DIRECT_COMPLETION_PATH } from "@/config/index";
import useDirectAgent from "@/customHooks/useDirectAgent";

const CenteredSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <Loader2 className="animate-spin" />
  </div>
);

// Direct calls are logged under the org's hidden "direct" agent, so their history is the regular
// agent history view. It is rendered here instead of linking to /agents/history/:id, which would
// wrap it in the agent navbar (configure, publish, versions) that has no meaning for direct calls.
const AgentHistoryPage = dynamic(() => import("@/app/org/[org_id]/agents/history/[id]/page"), {
  ssr: false,
  loading: CenteredSpinner,
});

const DirectHistoryTab = ({ orgId, searchParams, onOpenPlayground }) => {
  const { loading, agentId, error } = useDirectAgent();

  // use() in the history page needs a stable promise, so it is memoized on the agent id.
  const historyParams = useMemo(
    () => (agentId ? Promise.resolve({ org_id: orgId, id: agentId }) : null),
    [orgId, agentId]
  );

  if (loading) return <CenteredSpinner />;

  if (!agentId) {
    return (
      <div className="flex h-full items-center justify-center bg-base-200 p-6">
        <div className="flex w-full max-w-sm flex-col items-center border border-base-content/10 bg-base-100 px-6 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center border border-base-content/15 bg-base-200">
            <History size={18} className="text-base-content/60" />
          </span>
          <p className="mt-4 text-base font-semibold text-base-content">
            {error ? "Could not load history" : "No direct calls yet"}
          </p>
          <p className="mt-1 text-sm text-base-content/60">
            {error ? (
              "Something went wrong while loading. Please try again in a moment."
            ) : (
              <>
                Calls from the playground or to <code className="font-mono text-xs">{DIRECT_COMPLETION_PATH}</code> show
                up here.
              </>
            )}
          </p>
          <button type="button" className="btn btn-primary btn-sm mt-5" onClick={onOpenPlayground}>
            Open playground
          </button>
        </div>
      </div>
    );
  }

  return <AgentHistoryPage params={historyParams} searchParams={searchParams} />;
};

export default DirectHistoryTab;
