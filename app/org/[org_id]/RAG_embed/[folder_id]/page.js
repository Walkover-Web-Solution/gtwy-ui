"use client";
import React, { use, useEffect, useState } from "react";
import { useCustomSelector } from "@/customHooks/customSelector";
import RAGEmbedDetailView from "@/components/ragEmbed/RAGEmbedDetailView";
import { useRouter } from "next/navigation";
import { toggleSidebar } from "@/utils/utility";
import { useDispatch } from "react-redux";
import { getAllIntegrationDataAction, generateRagEmbedTokenAction } from "@/store/action/integrationAction";
import { clearEmbedToken } from "@/store/reducer/integrationReducer";

export const runtime = "edge";

const RAGEmbedDetailPage = ({ params }) => {
  const resolvedParams = use(params);
  const router = useRouter();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  // Collapse MainSlider when RAG embed detail page loads
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

  // Find the RAG embed by folder_id from path params
  const selectedRAGEmbed = integrationData.find(
    (item) => item.folder_id === resolvedParams.folder_id && item.type === "rag_embed"
  );

  // Fetch integration data if Redux state is empty (on page refresh)
  useEffect(() => {
    if (integrationData?.length === 0 && resolvedParams?.org_id) {
      setIsLoading(true);
      dispatch(getAllIntegrationDataAction(resolvedParams.org_id)).finally(() => {
        setIsLoading(false);
      });
    }
  }, [integrationData?.length, resolvedParams?.org_id, dispatch]);

  // Generate embedToken once using GTWY embed token API
  useEffect(() => {
    const generateToken = async () => {
      if (!embedToken && selectedRAGEmbed && currentUser?.id) {
        try {
          // Use same API as GTWY embed - pass userId as org_id parameter
          await dispatch(generateRagEmbedTokenAction(selectedRAGEmbed.folder_id, currentUser.id));
        } catch (error) {
          console.error("Error generating RAG embed token:", error);
        }
      }
    };

    generateToken();
  }, [embedToken, selectedRAGEmbed, currentUser?.id, dispatch]);

  // Cleanup embedToken on unmount
  useEffect(() => {
    return () => {
      if (resolvedParams?.folder_id) {
        dispatch(clearEmbedToken({ folderId: resolvedParams.folder_id }));
      }
    };
  }, [resolvedParams?.folder_id, dispatch]);

  const handleCloseDetailView = () => {
    // Navigate back to RAG embed list
    router.push(`/org/${resolvedParams.org_id}/RAG_embed`);
  };

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/70">Loading RAG embed...</p>
        </div>
      </div>
    );
  }

  return <RAGEmbedDetailView data={selectedRAGEmbed} onClose={handleCloseDetailView} />;
};

export default RAGEmbedDetailPage;
