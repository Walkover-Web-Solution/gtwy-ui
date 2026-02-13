"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import RAGEmbedContent from "@/components/ragEmbed/RAGEmbedContent";
import { generateRagEmbedTokenAction } from "@/store/action/integrationAction";
import { generateAccessKeyAction } from "@/store/action/orgAction";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";

const RAGEmbedGuideSlider = ({ data, handleCloseSlider, params }) => {
  const dispatch = useDispatch();
  const [viewMode, setViewMode] = useState("configuration"); // "preview" or "configuration"
  const [embedToken, setEmbedToken] = useState("");
  const previewFrameRef = useRef(null);

  const access_key = useCustomSelector(
    (state) => state?.userDetailsReducer?.organizations?.[params.org_id]?.meta?.auth_token || ""
  );

  // Generate embed token using API
  useEffect(() => {
    const generateEmbedToken = async () => {
      if (!data?.embed_id) {
        setEmbedToken("");
        return;
      }

      try {
        const response = await dispatch(
          generateRagEmbedTokenAction({
            folder_id: data.embed_id,
            user_id: "preview_user",
          })
        );
        if (response?.data?.embedToken) {
          setEmbedToken(response.data.embedToken);
        } else {
          setEmbedToken("");
        }
      } catch (error) {
        console.error("Failed to generate RAG embed token:", error);
        setEmbedToken("");
      }
    };

    generateEmbedToken();
  }, [data?.embed_id]);

  const closeRagInIframe = () => {
    try {
      const iframe = previewFrameRef.current;
      if (iframe?.contentWindow?.closeRag) {
        iframe.contentWindow.closeRag();
      }
    } catch (error) {
      console.error("Failed to close RAG embed:", error);
    }
  };

  const handleClose = () => {
    closeRagInIframe();
    if (handleCloseSlider) handleCloseSlider();
  };

  const handleGenerateAccessKey = () => {
    dispatch(generateAccessKeyAction(params?.org_id));
  };

  return (
    <aside
      id="rag-embed-guide-slider"
      className="sidebar-container fixed top-0 right-0 w-full md:w-3/4 lg:w-2/3 h-screen bg-base-100 
                 transition-all duration-300 z-[999999] border-l border-base-300 translate-x-full
                 flex flex-col overflow-hidden"
      aria-label="RAG Embed Integration Guide"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-200">
        <div>
          <h2 className="text-lg font-semibold">RAG Embed Integration Guide</h2>
          {data?.name && <p className="text-sm text-base-content/60">{data.name}</p>}
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="join gap-2">
            <button
              className={`btn btn-sm join-item cursor-pointer ${viewMode === "configuration" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setViewMode("configuration")}
              type="button"
            >
              Configuration
            </button>
            <button
              className={`btn btn-sm join-item cursor-pointer ${viewMode === "preview" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setViewMode("preview")}
              type="button"
            >
              Preview
            </button>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Close">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-base-200">
        {viewMode === "configuration" ? (
          <RAGEmbedContent params={params} folderId={data?.embed_id} embedToken={embedToken} />
        ) : (
          <div className="w-full h-full">
            {!access_key ? (
              <div className="flex items-center justify-center h-full border-2 border-dashed border-base-300 rounded-lg m-4">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
                  <p className="text-base-content/70 mb-4">Access Key Required for Preview</p>
                  <button onClick={handleGenerateAccessKey} className="btn btn-primary btn-sm">
                    Generate Access Key
                  </button>
                </div>
              </div>
            ) : embedToken ? (
              <iframe
                ref={previewFrameRef}
                title="RAG Embed Preview"
                srcDoc={previewHtml}
                className="w-full h-full bg-white border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default RAGEmbedGuideSlider;
