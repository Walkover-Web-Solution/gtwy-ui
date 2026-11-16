"use client";

import OrgPageGuard from "@/components/OrgPageGuard";
import PanelFeedbackModal from "@/components/feedback/PanelFeedbackModal";
import { isStewardPanelFeedbackEnabled } from "@/utils/stewardFeedbackApi";

export default function OrgLayout({ children }) {
  return (
    <OrgPageGuard>
      {children}
      {isStewardPanelFeedbackEnabled() ? <PanelFeedbackModal /> : null}
    </OrgPageGuard>
  );
}
