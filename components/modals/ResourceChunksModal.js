"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { getResourceChunks } from "@/config/knowledgeBaseApi";
import { CloseIcon } from "@/components/Icons";

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
    <Modal MODAL_ID={MODAL_TYPE.RESOURCE_CHUNKS_MODAL} onClose={handleClose}>
      <div className="modal-box w-11/12 max-w-5xl border-2 border-base-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-base-300">
          <div>
            <h3 className="font-bold text-lg">Resource Chunks</h3>
            {resourceName && <p className="text-sm text-gray-500 mt-1">Resource Name : {resourceName}</p>}
          </div>
          <button onClick={handleClose} className="btn btn-sm btn-circle btn-ghost">
            <CloseIcon size={16} />
          </button>
        </div>

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
                <div key={chunk._id || index} className="collapse collapse-arrow bg-base-100 border border-base-300">
                  <input type="checkbox" defaultChecked />
                  <div className="collapse-title font-medium flex items-center gap-2">
                    <span className="badge badge-primary badge-sm">#{index + 1}</span>
                    <span className="text-sm">Chunk {index + 1}</span>
                  </div>
                  <div className="collapse-content">
                    <div className="p-4 bg-base-200 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm font-mono text-base-content leading-relaxed">
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
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-base-300">
            <span className="text-sm text-gray-500">Total chunks: {chunks.length}</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ResourceChunksModal;
