"use client";

import OrgPageGuard from "@/components/OrgPageGuard";
import PanelFeedbackModal from "@/components/feedback/PanelFeedbackModal";

export default function OrgLayout({ children }) {
  return (
    <OrgPageGuard>
      {children}
      <PanelFeedbackModal />
    </OrgPageGuard>
  );
}
