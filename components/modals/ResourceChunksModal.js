"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { getResourceChunks } from "@/config/knowledgeBaseApi";
import { Layers } from "lucide-react";

const ResourceChunksModal = ({ resourceId, resourceName }) => {
  const [chunks, setChunks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChunks = async () => {
      if (!resourceId) {
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const response = await getResourceChunks(resourceId);
        if (response?.success && response?.data?.chunks) {
          setChunks(response.data.chunks);
        } else {
          setChunks([]);
        }
      } catch (err) {
        console.error("ResourceChunksModal: Error fetching chunks:", err);
        setError(err.message || "Failed to fetch chunks");
        setChunks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChunks();
  }, [resourceId]);

  const handleClose = () => {
    closeModal(MODAL_TYPE.RESOURCE_CHUNKS_MODAL);
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.RESOURCE_CHUNKS_MODAL}
      onClose={handleClose}
      title="Resource Chunks"
      description={resourceName ? `Resource: ${resourceName}` : "View all chunks for this resource"}
      icon={<Layers size={16} className="text-trace-gold" />}
      widthClass="w-[min(900px,92vw)]"
    >
      <div className="flex flex-col gap-4">
        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="text-sm text-gray-500 mt-4">Loading chunks...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          ) : chunks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No chunks found for this resource</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chunks.map((chunk, index) => (
                <div
                  key={chunk._id || index}
                  data-testid={`resource-chunk-item-${index}`}
                  id={`resource-chunk-item-${index}`}
                  className="collapse collapse-arrow bg-base-100 border border-base-300"
                >
                  <input autoComplete="off" type="checkbox" defaultChecked />
                  <div className="collapse-title font-medium flex items-center gap-2">
                    <span className="badge badge-primary badge-sm">#{index + 1}</span>
                    <span className="text-sm">Chunk {index + 1}</span>
                  </div>
                  <div className="collapse-content">
                    <div className="p-4 bg-base-200 rounded-lg">
                      <pre className="whitespace-pre-wrap break-words text-sm font-mono text-base-content leading-relaxed">
                        {chunk.data || "No content"}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && chunks.length > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-base-content/10">
            <span className="text-sm text-gray-500">Total chunks: {chunks.length}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ResourceChunksModal;
