import React, { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { queryKnowledgeBase } from "@/config/knowledgeBaseApi";
import { toast } from "react-toastify";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";

const QueryKnowledgeBaseModal = ({ resource, orgId }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!query.trim()) {
      toast.error("Please enter a query");
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const payload = {
        query: query.trim(),
        resource_id: resource._id,
      };

      const response = await queryKnowledgeBase(payload);
      setResults(response?.text);
      toast.success("Query executed successfully");
    } catch (error) {
      console.error("Query error:", error);
      toast.error("Failed to execute query");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setQuery("");
    setResults(null);
    closeModal(MODAL_TYPE.QUERY_KNOWLEDGE_BASE_MODAL);
  };

  return (
    <dialog id={MODAL_TYPE.QUERY_KNOWLEDGE_BASE_MODAL} className="modal">
      <div className="modal-box max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Test Knowledge Base</h3>
          <button onClick={handleClose} className="btn btn-sm btn-circle btn-ghost" disabled={isLoading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Query</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="Enter your query to test the knowledge base..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={handleClose} className="btn btn-ghost" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Querying...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Query
                </>
              )}
            </button>
          </div>
        </form>

        {results && (
          <div className="mt-6">
            <div className="divider">Results</div>
            <div className="bg-base-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap break-words">{JSON.stringify(results, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
};

export default QueryKnowledgeBaseModal;
