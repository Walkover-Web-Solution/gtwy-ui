"use client";
import React, { use, useEffect, useState } from "react";
import { useCustomSelector } from "@/customHooks/customSelector";
import IntegrationDetailView from "@/components/integration/IntegrationDetailView";
import { useRouter } from "next/navigation";
import { toggleSidebar } from "@/utils/utility";
import { useDispatch } from "react-redux";
import { getAllIntegrationDataAction, generateEmbedTokenAction } from "@/store/action/integrationAction";
import { clearEmbedToken } from "@/store/reducer/integrationReducer";

export const runtime = "edge";

const IntegrationDetailPage = ({ params }) => {
  const resolvedParams = use(params);
  const router = useRouter();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  // Collapse MainSlider when integration detail page loads
  useEffect(() => {
    const mainSlider = document.getElementById("main-slider");
    if (mainSlider && !mainSlider.classList.contains("-translate-x-full")) {
      toggleSidebar("main-slider", "left");
    }
  }, []);

  const { integrationData, currentUser, embedToken } = useCustomSelector((state) => ({
    integrationData: state?.integrationReducer?.integrationData?.[resolvedParams?.org_id] || [],
    currentUser: state.userDetailsReducer.userDetails,
    embedToken: state?.integrationReducer?.embedTokens?.[resolvedParams?.folder_id],
  }));

  // Find the integration by folder_id from path params
  const selectedIntegration = integrationData.find((item) => item.folder_id === resolvedParams.folder_id);

  // Fetch integration data if Redux state is empty (on page refresh)
  useEffect(() => {
    if (integrationData?.length === 0 && resolvedParams?.org_id) {
      setIsLoading(true);
      dispatch(getAllIntegrationDataAction(resolvedParams.org_id)).finally(() => {
        setIsLoading(false);
      });
    }
  }, [integrationData?.length, resolvedParams?.org_id, dispatch]);

  // Generate embedToken once for both ConfigurationTab and TestingTab
  useEffect(() => {
    const generateToken = async () => {
      if (!embedToken && selectedIntegration && currentUser?.id) {
        try {
          // Pass userId as org_id parameter
          await dispatch(generateEmbedTokenAction(selectedIntegration.folder_id, currentUser.id));
        } catch (error) {
          console.error("Error generating embed token:", error);
        }
      }
    };

    generateToken();
  }, [embedToken, selectedIntegration, currentUser?.id, dispatch]);

  // Cleanup embedToken on unmount
  useEffect(() => {
    return () => {
      if (resolvedParams?.folder_id) {
        dispatch(clearEmbedToken({ folderId: resolvedParams.folder_id }));
      }
    };
  }, [resolvedParams?.folder_id, dispatch]);

  const handleCloseDetailView = () => {
    // Navigate back to integration list
    router.push(`/org/${resolvedParams.org_id}/integration`);
  };

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/70">Loading integration...</p>
        </div>
      </div>
    );
  }

  return <IntegrationDetailView data={selectedIntegration} onClose={handleCloseDetailView} />;
};

export default IntegrationDetailPage;
