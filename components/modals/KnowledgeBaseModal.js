"use client";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE, MIME_EXTENSION_MAP } from "@/utils/enums";
import { closeModal, RequiredItem } from "@/utils/utility";
import { createResourceAction, updateResourceAction } from "@/store/action/knowledgeBaseAction";
import { uploadImage } from "@/config/utilityApi";
import { toast } from "react-toastify";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
const KnowledgeBaseModal = ({
  params,
  selectedResource,
  setSelectedResource = () => {},
  addToVersion = false,
  knowbaseVersionData = [],
  searchParams,
}) => {
  const dispatch = useDispatch();
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [inputType, setInputType] = useState("url"); // 'url', 'file', 'content'
  const [chunkingType, setChunkingType] = useState("recursive");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showQuerySettings, setShowQuerySettings] = useState(false);
  React.useEffect(() => {
    if (selectedResource?.settings?.chunkingType) {
      setChunkingType(selectedResource.settings.chunkingType);
    } else {
      setChunkingType("recursive");
    }

    // Detect input type based on existing resource data
    if (selectedResource) {
      if (selectedResource.url) {
        setInputType("url");
      } else if (selectedResource.content && selectedResource.url === "") {
        setInputType("content");
      } else {
        setInputType("url"); // Default for edit mode
      }
    } else {
      setInputType("url"); // Default for create mode
    }
  }, [selectedResource]);

  const isAllowedFile = (file) => {
    if (!file || typeof file.name !== "string") {
      return false;
    }

    const nameParts = file.name.split(".");
    let ext = "";

    if (nameParts.length > 1) {
      const lastPart = nameParts[nameParts.length - 1];
      if (lastPart) {
        ext = "." + lastPart.toLowerCase();
      }
    }

    const mimeType = typeof file.type === "string" ? file.type.toLowerCase() : "";
    const expectedExt = MIME_EXTENSION_MAP[mimeType];
    // Both MIME type and file extension must be allowed and consistent
    return Boolean(expectedExt) && ext === expectedExt;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ✅ Only PDF + TXT allowed
    if (!isAllowedFile(file)) {
      toast.error("Only PDF or TXT files are allowed.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await uploadImage(formData, true);
      const fileUrl = response.url || response.file_url || response.data?.url;

      setUploadedFile({
        name: file.name,
        url: fileUrl,
        type: file.type,
        size: file.size,
      });

      toast.success(`Successfully uploaded ${file.name}`);
    } catch (error) {
      toast.error(`Failed to upload ${file.name}: ${error.message}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
  };

  const handleChunkSizeInput = (e) => {
    const value = parseInt(e.target.value);
    if (value > 4000) {
      e.target.value = 4000;
      toast.warning("Chunk size cannot exceed 4000");
    } else if (value < 1 && e.target.value !== "") {
      e.target.value = 1;
    }
  };

  const handleChunkOverlapInput = (e) => {
    const value = parseInt(e.target.value);
    if (value > 200) {
      e.target.value = 200;
      toast.warning("Chunk overlap cannot exceed 200");
    } else if (value < 0 && e.target.value !== "") {
      e.target.value = 0;
    }
  };

  const handleCreateResource = async (event) => {
    event.preventDefault();
    setIsCreatingResource(true);
    const formData = new FormData(event.target);

    // Get query access type from form
    const collection_details = formData.get("queryAccessType") || "fastest";
    let settings = {};
    let content = "";
    let resourceUrl = "";

    settings.strategy = chunkingType;
    if (formData?.get("chunkSize")) {
      settings.chunkSize = formData?.get("chunkSize");
    }
    if (formData?.get("chunkingOverlap") && chunkingType === "semantic") {
      settings.chunkOverlap = formData?.get("chunkingOverlap");
    }
    if (inputType === "file") {
      if (uploadedFile) {
        // Use uploaded file URL
        resourceUrl = uploadedFile.url;
        content = uploadedFile.url;
      } else {
        // Fallback to local file reading (existing behavior)
        const file = formData.get("file");
        if (file) {
          try {
            content = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = (e) => reject(e);
              reader.readAsText(file);
            });
            resourceUrl = file.name;
          } catch (error) {
            console.error("Error reading file:", error);
            setIsCreatingResource(false);
            return;
          }
        }
      }
    } else if (inputType === "content") {
      content = (formData.get("content") || "").trim();
      // No resourceUrl needed for content input
    } else {
      resourceUrl = (formData.get("url") || "").trim();
      content = resourceUrl;
    }

    const payload = {
      title: (formData.get("title") || "").trim(),
      description: (formData.get("description") || "").trim(),
      settings: settings,
    };

    // Only add content if there's actual content data (not just URL)
    if (content && content !== resourceUrl && content.trim() !== "") {
      payload.content = content;
    } else {
      payload.url = resourceUrl;
    }
    payload.collection_details = collection_details;
    const result = await dispatch(createResourceAction(payload, params?.org_id));
    if (result) {
      closeModal(MODAL_TYPE.KNOWLEDGE_BASE_MODAL);
      event.target.reset();
      setInputType("url");
      setUploadedFile(null);
      setIsUploading(false);
      if (params?.org_id && searchParams?.version && addToVersion) {
        dispatch(
          updateBridgeVersionAction({
            orgId: params?.org_id,
            bridgeId: params?.bridge_id,
            versionId: searchParams?.version,
            dataToSend: {
              doc_ids: [
                ...(knowbaseVersionData || {}),
                { resource_id: result._id, collection_id: result.collectionId, description: result.description },
              ],
            },
          })
        );
      }
    }
    setIsCreatingResource(false);
  };

  const handleUpdateResource = async (event) => {
    event.preventDefault();
    if (!selectedResource?._id) return;

    setIsCreatingResource(true);
    const formData = new FormData(event.target);

    const payload = {
      title: (formData.get("title") || "").trim(),
      description: (formData.get("description") || "").trim(),
    };

    // Add content if the resource has content and it's being updated
    const updatedContent = (formData.get("content") || "").trim();
    if (selectedResource?.content && updatedContent) {
      payload.content = updatedContent;
    }

    const result = await dispatch(updateResourceAction(selectedResource._id, payload, params?.org_id));
    if (result) {
      closeModal(MODAL_TYPE.KNOWLEDGE_BASE_MODAL);
      setSelectedResource(null);
      event.target.reset();
    }
    setIsCreatingResource(false);
  };

  const handleClose = () => {
    closeModal(MODAL_TYPE.KNOWLEDGE_BASE_MODAL);
    setSelectedResource(null);
    setInputType("url");
    setChunkingType("recursive");
    setUploadedFile(null);
    setShowQuerySettings(false);
    setIsUploading(false);
  };
  const formatFileSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.KNOWLEDGE_BASE_MODAL} onClose={handleClose}>
      <div className="modal-box w-11/12 max-w-xl border-2 border-base-300">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-base-300">
          <h3 className="font-bold text-lg">{selectedResource ? "Edit" : "Create"} Knowledge Base</h3>
          <button
            id="knowledgebase-modal-close-button"
            onClick={handleClose}
            className="btn btn-circle btn-ghost btn-sm"
            disabled={isCreatingResource}
          >
            ✕
          </button>
        </div>

        <form onSubmit={selectedResource ? handleUpdateResource : handleCreateResource} className="space-y-4">
          {/* Name Field */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">
                Name <RequiredItem />
              </span>
            </label>
            <input
              id="knowledgebase-name-input"
              type="text"
              name="title"
              className="input input-bordered input-sm"
              placeholder="Knowledge Base name"
              defaultValue={selectedResource?.title || ""}
              key={selectedResource?._id || "new"}
              required
              disabled={isCreatingResource}
            />
          </div>

          {/* Description Field */}
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm font-medium">
                Description <RequiredItem />
              </span>
            </label>
            <textarea
              id="knowledgebase-description-textarea"
              name="description"
              className="textarea textarea-bordered textarea-sm"
              placeholder="Brief description of the knowledge base content"
              defaultValue={selectedResource?.description || ""}
              key={`desc-${selectedResource?._id || "new"}`}
              rows="3"
              required
              disabled={isCreatingResource}
            />
          </div>
          {!selectedResource && (
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="knowledgebase-input-type-url"
                  type="radio"
                  name="inputType"
                  className="radio radio-primary radio-sm"
                  checked={inputType === "url"}
                  onChange={() => setInputType("url")}
                />
                <span className="text-sm font-medium">URL</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="knowledgebase-input-type-file"
                  type="radio"
                  name="inputType"
                  className="radio radio-primary radio-sm"
                  checked={inputType === "file"}
                  onChange={() => setInputType("file")}
                />
                <span className="text-sm font-medium">Upload File</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="knowledgebase-input-type-content"
                  type="radio"
                  name="inputType"
                  className="radio radio-primary radio-sm"
                  checked={inputType === "content"}
                  onChange={() => setInputType("content")}
                />
                <span className="text-sm font-medium">Content</span>
              </label>
            </div>
          )}
          {/* Content Input Based on Type */}
          {inputType === "file" && !selectedResource ? (
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium">
                  File <RequiredItem />
                </span>
              </label>

              {/* Show upload button only if no file is uploaded */}
              {!uploadedFile && (
                <>
                  <input
                    id="knowledgebase-file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    className="file-input file-input-bordered file-input-sm w-full"
                    disabled={isCreatingResource || isUploading}
                    accept=".pdf,.txt"
                  />
                  {isUploading && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      <span className="text-sm text-gray-600">Uploading file...</span>
                    </div>
                  )}
                  <span className="label-text-alt text-gray-400 mt-1">Supported formats: .pdf, .txt</span>
                </>
              )}

              {/* Display uploaded file only */}
              {uploadedFile && (
                <div className="mt-1">
                  <div className="flex items-center justify-between bg-base-200 p-3 rounded text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate font-medium">{uploadedFile.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(uploadedFile.size)})</span>
                    </div>
                    <button
                      id="knowledgebase-remove-file-button"
                      type="button"
                      onClick={removeUploadedFile}
                      className="btn btn-ghost btn-xs text-error hover:bg-error hover:text-white"
                      disabled={isCreatingResource}
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : inputType === "content" && !selectedResource ? (
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium">
                  Content <RequiredItem />
                </span>
              </label>
              <textarea
                id="knowledgebase-content-textarea-create"
                name="content"
                className="textarea textarea-bordered textarea-sm w-full h-32"
                placeholder="Enter content here..."
                key={selectedResource?._id || "new-content"}
                required
                disabled={isCreatingResource}
              ></textarea>
            </div>
          ) : selectedResource ? (
            // Edit mode - only show content field if content key exists, otherwise show disabled URL
            selectedResource?.content && !selectedResource?.url ? (
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm font-medium">
                    Content <RequiredItem />
                  </span>
                </label>
                <textarea
                  id="knowledgebase-content-textarea-edit"
                  name="content"
                  className="textarea textarea-bordered textarea-sm w-full h-32"
                  placeholder="Enter content here..."
                  required
                  disabled={isCreatingResource}
                  defaultValue={selectedResource.content}
                  key={selectedResource._id}
                ></textarea>
              </div>
            ) : selectedResource?.url ? (
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm font-medium">URL</span>
                </label>
                <input
                  id="knowledgebase-url-input-edit"
                  type="url"
                  name="url"
                  className="input input-bordered input-sm bg-gray-100"
                  placeholder="https://example.com/resource"
                  disabled={true}
                  defaultValue={selectedResource.url}
                  key={selectedResource._id}
                  readOnly
                />
                <span className="label-text-alt text-gray-400 mt-1">URL cannot be edited</span>
              </div>
            ) : null
          ) : (
            // Create mode - URL input
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm font-medium">
                  URL <RequiredItem />
                </span>
              </label>
              <input
                id="knowledgebase-url-input-create"
                type="url"
                name="url"
                className="input input-bordered input-sm"
                placeholder="https://example.com/resource"
                key={selectedResource?._id || "new-url"}
                required={inputType === "url"}
                disabled={isCreatingResource}
              />
            </div>
          )}
          {/* Chunking Settings Section */}
          {!selectedResource && (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-sm font-medium">Chunking Type</span>
                </label>
                <select
                  id="knowledgebase-chunking-type-select"
                  name="chunkingType"
                  className="select select-bordered select-sm"
                  value={chunkingType}
                  onChange={(e) => setChunkingType(e.target.value)}
                  disabled={isCreatingResource}
                >
                  <option value="agentic">Agentic</option>
                  <option value="recursive">Recursive</option>
                  <option value="semantic">Semantic</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {chunkingType === "custom" ? (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-sm font-medium">Chunking URL</span>
                  </label>
                  <input
                    id="knowledgebase-chunking-url-input"
                    type="url"
                    name="chunkingUrl"
                    className="input input-bordered input-sm"
                    placeholder="https://example.com/chunking-service"
                    disabled={isCreatingResource}
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-sm font-medium">Chunk Size</span>
                    </label>
                    <input
                      id="knowledgebase-chunk-size-input"
                      type="number"
                      name="chunkSize"
                      className="input input-bordered input-sm"
                      min={1}
                      max={4000}
                      required
                      defaultValue={
                        selectedResource?.settings?.chunkSize
                          ? Math.min(selectedResource.settings.chunkSize, 4000)
                          : 4000
                      }
                      onInput={handleChunkSizeInput}
                      disabled={isCreatingResource}
                    />
                  </div>

                  {chunkingType === "semantic" && (
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-sm font-medium">Chunk Overlap</span>
                      </label>
                      <input
                        id="knowledgebase-chunk-overlap-input"
                        type="number"
                        name="chunkingOverlap"
                        className="input input-bordered input-sm"
                        min={0}
                        max={200}
                        defaultValue={
                          selectedResource?.settings?.chunkOverlap
                            ? Math.min(selectedResource.settings.chunkOverlap, 200)
                            : 200
                        }
                        onInput={handleChunkOverlapInput}
                        disabled={isCreatingResource}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Query Settings Accordion */}
          {!selectedResource && (
            <div className="collapse collapse-arrow border border-base-300 bg-base-100">
              <input
                id="knowledgebase-advanced-settings-toggle"
                type="checkbox"
                checked={showQuerySettings}
                onChange={(e) => setShowQuerySettings(e.target.checked)}
                disabled={isCreatingResource}
              />
              <div className="collapse-title text-sm font-medium">Advanced Settings</div>
              <div className="collapse-content">
                <div className="">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-sm font-medium">Query Access Type</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="knowledgebase-query-type-fastest"
                          type="radio"
                          name="queryAccessType"
                          value="fastest"
                          className="radio radio-primary radio-sm"
                          defaultChecked
                          disabled={isCreatingResource}
                        />
                        <span className="text-sm">Fastest</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="knowledgebase-query-type-moderate"
                          type="radio"
                          name="queryAccessType"
                          value="moderate"
                          className="radio radio-primary radio-sm"
                          disabled={isCreatingResource}
                        />
                        <span className="text-sm">Moderate</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="knowledgebase-query-type-high-accuracy"
                          type="radio"
                          name="queryAccessType"
                          value="high_accuracy"
                          className="radio radio-primary radio-sm"
                          disabled={isCreatingResource}
                        />
                        <span className="text-sm">High Accuracy</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              id="knowledgebase-cancel-button"
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClose}
              disabled={isCreatingResource}
            >
              Cancel
            </button>
            <button
              id="knowledgebase-submit-button"
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isCreatingResource}
            >
              {isCreatingResource
                ? selectedResource
                  ? "Updating..."
                  : "Adding..."
                : selectedResource
                  ? "Update Resource"
                  : "Add Resource"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default KnowledgeBaseModal;
