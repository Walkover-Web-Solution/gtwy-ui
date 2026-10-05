"use client";
import { useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { useCustomSelector } from "@/customHooks/customSelector";
import { createNewAuthData } from "@/store/action/authkeyAction";
import { buildGtwySkillPrompt, selectActiveAgents } from "@/utils/gtwySkill";

const CODING_AGENT_KEY_NAME = "Coding agent";

/**
 * Copies the GTWY coding-agent prompt for this org.
 * @param {string} orgId
 * @param {string} [agentId] Only this agent goes in the prompt; omit for every active agent in the org.
 */
export default function useGtwySkillPrompt(orgId, agentId) {
  const dispatch = useDispatch();
  const [isCopying, setIsCopying] = useState(false);
  const { bridges, orgName, authData, isViewer } = useCustomSelector((state) => ({
    bridges: agentId
      ? [state.bridgeReducer.allBridgesMap?.[agentId]].filter(Boolean)
      : state.bridgeReducer.org?.[orgId]?.orgs || [],
    orgName: state.userDetailsReducer.organizations?.[orgId]?.name || "",
    authData: state.authDataReducer?.authData || [],
    isViewer: state.userDetailsReducer.organizations?.[orgId]?.role_name === "Viewer",
  }));

  // Reuse the org's first pauthkey; create one if the org has none yet. Viewers
  // can't read or create keys, so their prompt asks for one instead.
  const resolvePauthkey = async () => {
    const existing = authData?.[0]?.authkey;
    if (existing || isViewer) return existing || "";
    try {
      const created = await dispatch(
        createNewAuthData({
          name: CODING_AGENT_KEY_NAME,
          throttle_limit: "60:800",
          temporary_throttle_limit: "60:600",
          temporary_throttle_time: "30",
        })
      );
      return created?.data?.authkey || "";
    } catch {
      toast.error("Couldn't create a pauthkey. The prompt will ask for one.");
      return "";
    }
  };

  const copyPrompt = async () => {
    setIsCopying(true);
    try {
      const pauthkey = await resolvePauthkey();
      const agents = selectActiveAgents(bridges).map((a) => (agentId ? { ...a, id: agentId } : a));
      await navigator.clipboard.writeText(buildGtwySkillPrompt({ orgId, orgName, agents, pauthkey }));
      toast.success("Prompt copied. Paste it into your coding agent.");
    } catch {
      toast.error("Failed to copy");
    } finally {
      setIsCopying(false);
    }
  };

  return { copyPrompt, isCopying };
}
