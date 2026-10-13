import { useEffect, useState } from "react";
import { getDirectAgentId } from "@/config/index";

// Resolves the org's hidden direct agent, under which direct calls are logged. agentId stays
// null until the org's first direct call creates it. Fetched on every mount, since that first
// call may have happened since the last fetch.
export default function useDirectAgent() {
  const [state, setState] = useState({ loading: true, agentId: null, error: false });

  useEffect(() => {
    let cancelled = false;
    getDirectAgentId()
      .then((agentId) => !cancelled && setState({ loading: false, agentId, error: false }))
      .catch(() => !cancelled && setState({ loading: false, agentId: null, error: true }));
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
