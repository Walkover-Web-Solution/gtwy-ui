"use client";
import React from "react";
import { X } from "lucide-react";
import RAGEmbedContent from "@/components/ragEmbed/RAGEmbedContent";

const RAGEmbedGuideSlider = ({ data, handleCloseSlider, params }) => {
  const handleClose = () => {
    if (handleCloseSlider) handleCloseSlider();
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
        <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-base-200">
        <RAGEmbedContent params={params} folderId={data?.embed_id} />
      </div>
    </aside>
  );
};

export default RAGEmbedGuideSlider;
