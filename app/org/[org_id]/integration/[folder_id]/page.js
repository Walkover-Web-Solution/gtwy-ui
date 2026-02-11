"use client";
import React, { use, useEffect } from "react";
import { useCustomSelector } from "@/customHooks/customSelector";
import IntegrationDetailView from "@/components/integration/IntegrationDetailView";
import { useRouter } from "next/navigation";
import { toggleSidebar } from "@/utils/utility";

export const runtime = "edge";

const IntegrationDetailPage = ({ params }) => {
  const resolvedParams = use(params);
  const router = useRouter();

  // Collapse MainSlider when integration detail page loads
  useEffect(() => {
    const mainSlider = document.getElementById('main-slider');
    if (mainSlider && !mainSlider.classList.contains('-translate-x-full')) {
      toggleSidebar('main-slider', 'left');
    }
  }, []);

  const { integrationData } = useCustomSelector((state) => ({
    integrationData: state?.integrationReducer?.integrationData?.[resolvedParams?.org_id] || [],
  }));
 console.log(integrationData,"hello")
  // Find the integration by folder_id from path params
  const selectedIntegration = integrationData.find(
    (item) => item.folder_id === resolvedParams.folder_id
  );
console.log(selectedIntegration,"selectedIntegration")
  const handleCloseDetailView = () => {
    // Navigate back to integration list
    router.push(`/org/${resolvedParams.org_id}/integration`);
  };

  return <IntegrationDetailView data={selectedIntegration} onClose={handleCloseDetailView} />;
};

export default IntegrationDetailPage;
