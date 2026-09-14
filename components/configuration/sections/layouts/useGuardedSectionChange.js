"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import unsavedPromptGuard from "@/utils/unsavedPromptGuard";
import { openModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";

// Shared "leaving the Prompt section with unsaved changes" guard, used by the
// non-tab layouts (accordion/stepper) the same way TabsLayout.js guards its
// own tab switch. Also keeps the `?tab=` URL param in sync.
const useGuardedSectionChange = (activeTab, onTabChange) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingTabRef = useRef(null);

  const doTabChange = (tabId) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("tab", tabId);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${window.location.pathname}${query}`, { scroll: false });
    onTabChange(tabId);
  };

  const requestTabChange = (tabId) => {
    if (activeTab === "prompt" && tabId !== "prompt" && unsavedPromptGuard.hasUnsavedChanges) {
      pendingTabRef.current = tabId;
      openModal(MODAL_TYPE.UNSAVED_CHANGES_TAB_MODAL);
      return;
    }
    doTabChange(tabId);
  };

  return { requestTabChange, doTabChange, pendingTabRef };
};

export default useGuardedSectionChange;
