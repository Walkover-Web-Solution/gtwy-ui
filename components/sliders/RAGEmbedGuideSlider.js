"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";
import RAGEmbedContent from "@/components/ragEmbed/RAGEmbedContent";
import { SignJWT } from "jose";
import { useCustomSelector } from "@/customHooks/customSelector";
import { generateAccessKeyAction } from "@/store/action/orgAction";
import { useDispatch } from "react-redux";

const RAGEmbedGuideSlider = ({ data, handleCloseSlider, params }) => {
  const dispatch = useDispatch();
  const [viewMode, setViewMode] = useState("configuration"); // "preview" or "configuration"
  const [embedToken, setEmbedToken] = useState("");
  const previewFrameRef = useRef(null);

  const access_key = useCustomSelector(
    (state) => state?.userDetailsReducer?.organizations?.[params.org_id]?.meta?.auth_token || ""
  );

  // Generate embed token by signing payload with access_key using jose
  useEffect(() => {
    const generateEmbedToken = async () => {
      if (!access_key || !params?.org_id) {
        setEmbedToken("");
        return;
      }

      try {
        const payload = {
          org_id: parseInt(params.org_id),
          user_id: "preview_user",
        };

        // Add folder_id if available
        if (data?.embed_id) {
          payload.folder_id = data.embed_id;
        }

        // Convert secret to Uint8Array for jose
        const secret = new TextEncoder().encode(access_key);

        // Sign with HS256 using jose
        const token = await new SignJWT(payload).setProtectedHeader({ alg: "HS256", typ: "JWT" }).sign(secret);

        setEmbedToken(token);
      } catch (error) {
        console.error("Failed to generate RAG embed token:", error);
        setEmbedToken("");
      }
    };

    generateEmbedToken();
  }, [access_key, params?.org_id, data?.embed_id]);

  // Generate preview HTML with dynamic data
  const previewHtml = useMemo(() => {
    const scriptSrc = process.env.NEXT_PUBLIC_KNOWLEDGEBASE_SCRIPT_SRC || "https://dev-chatbot.gtwy.ai/rag-local.js";

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; overflow: hidden; }
      body { font-family: Arial, sans-serif; background: #ffffff; }
      #rag-container { width: 100%; height: 100%; position: relative; }
    </style>
  </head>
  <body>
    <div id="rag-container"></div>
    <script
      id="rag-main-script"
      embedToken="${embedToken || ""}"
      src="${scriptSrc}"
      parentId="rag-container"
      theme="light"
      defaultOpen="true"
    ></script>
    <script>
      window.addEventListener("message", (event) => {
        if (event.data?.type === "rag") {
          console.log("✅ Preview RAG event:", event.data);
        }
      });

      // Auto-open RAG when script loads
      function tryOpenRag() {
        if (window.openRag) {
          window.openRag();
        } else {
          setTimeout(tryOpenRag, 100);
        }
      }
      
      // Wait for script to load then open
      setTimeout(tryOpenRag, 500);
    </script>
  </body>
</html>`;
  }, [embedToken]);

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
          <RAGEmbedContent params={params} folderId={data?.embed_id} />
        ) : (
          <div className="w-full h-full">
            {access_key ? (
              <iframe
                ref={previewFrameRef}
                title="RAG Embed Preview"
                srcDoc={previewHtml}
                className="w-full h-full bg-white border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="flex items-center justify-center h-full border-2 border-dashed border-base-300 rounded-lg m-4">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
                  <p className="text-base-content/70 mb-4">Access Key Required for Preview</p>
                  <button onClick={handleGenerateAccessKey} className="btn btn-primary btn-sm">
                    Generate Access Key
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default RAGEmbedGuideSlider;
