import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, Edit, Check, X } from "lucide-react";
import Modal from "../UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";

const PrebuiltToolsConfigModal = ({ initialDomains = [], onSave }) => {
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [editingIndex, setEditingIndex] = useState(-1);

  // Use ref instead of state for editing value to avoid unnecessary re-renders
  const editingValueRef = useRef("");

  // Derived state
  const isEditing = editingIndex !== -1;

  // Initialize domains when modal opens
  useEffect(() => {
    setDomains(initialDomains.length > 0 ? [...initialDomains] : []);
  }, [initialDomains]);

  // Validate Domain only (no HTTP/HTTPS URLs allowed)
  const isValidDomain = (input) => {
    const trimmedInput = input.trim();

    // Reject if input is too short or contains spaces
    if (trimmedInput.length < 3 || trimmedInput.includes(" ")) {
      return false;
    }

    // Reject if input starts with http:// or https://
    if (trimmedInput.startsWith("http://") || trimmedInput.startsWith("https://")) {
      return false;
    }

    // Domain regex pattern (without protocol) - must have at least one dot and valid TLD
    // Allows domains like: example.com, www.example.com, subdomain.example.com
    const domainPattern =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

    return domainPattern.test(trimmedInput);
  };

  // Add new domain
  const handleAddDomain = async () => {
    const trimmedDomain = newDomain.trim();

    if (!trimmedDomain) {
      setValidationError("Please enter a domain");
      return;
    }

    if (!isValidDomain(trimmedDomain)) {
      setValidationError("Please enter a valid domain");
      return;
    }

    if (domains.includes(trimmedDomain)) {
      setValidationError("This domain already exists");
      return;
    }

    const updatedDomains = [...domains, trimmedDomain];
    setDomains(updatedDomains);
    setNewDomain("");
    setValidationError(""); // Clear error on success

    // Save immediately to API
    setIsLoading(true);
    try {
      await onSave(updatedDomains);
    } catch (error) {
      console.error("Error saving domain:", error);
      // Revert the change if API call fails
      setDomains(domains);
      setValidationError("Failed to save domain. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    setNewDomain(e.target.value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError("");
    }
  };

  // Handle Enter key press in input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDomain();
    }
  };

  // Remove domain at specific index
  const handleRemoveDomain = async (index) => {
    const updatedDomains = domains.filter((_, i) => i !== index);
    setDomains(updatedDomains);

    // Cancel edit if the domain being edited is removed
    if (editingIndex === index) {
      setEditingIndex(-1);
      editingValueRef.current = "";
      setValidationError("");
    }

    // Save immediately to API
    setIsLoading(true);
    try {
      await onSave(updatedDomains);
    } catch (error) {
      console.error("Error removing domain:", error);
      // Revert the change if API call fails
      setDomains(domains);
      setValidationError("Failed to remove domain. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing a domain
  const handleEditDomain = (index) => {
    setEditingIndex(index);
    editingValueRef.current = domains[index];
    setValidationError(""); // Clear any existing validation errors
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingIndex(-1);
    editingValueRef.current = "";
    setValidationError("");
  };

  // Save edited domain
  const handleSaveEdit = async () => {
    const trimmedValue = editingValueRef.current.trim();

    if (!trimmedValue) {
      setValidationError("Please enter a domain");
      return;
    }

    if (!isValidDomain(trimmedValue)) {
      setValidationError("Please enter a valid domain");
      return;
    }

    // Check if the edited domain already exists (excluding the current one)
    const existingIndex = domains.findIndex((domain, index) => domain === trimmedValue && index !== editingIndex);

    if (existingIndex !== -1) {
      setValidationError("This domain already exists");
      return;
    }

    // Update the domain
    const originalDomains = [...domains];
    const updatedDomains = [...domains];
    updatedDomains[editingIndex] = trimmedValue;
    setDomains(updatedDomains);

    // Reset edit state
    setEditingIndex(-1);
    editingValueRef.current = "";
    setValidationError("");

    // Save immediately to API
    setIsLoading(true);
    try {
      await onSave(updatedDomains);
    } catch (error) {
      console.error("Error updating domain:", error);
      // Revert the change if API call fails
      setDomains(originalDomains);
      setValidationError("Failed to update domain. Please try again.");
      // Re-enter edit mode
      setEditingIndex(editingIndex);
      editingValueRef.current = trimmedValue;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit input change
  const handleEditInputChange = useCallback(
    (e) => {
      editingValueRef.current = e.target.value;
      // Clear validation error when user starts typing (only if editing)
      if (isEditing && validationError) {
        setValidationError("");
      }
    },
    [isEditing, validationError]
  );

  // Handle Enter key press in edit input
  const handleEditKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // Handle close
  const handleClose = () => {
    // Cancel any ongoing edit before closing
    if (isEditing) {
      setEditingIndex(-1);
      editingValueRef.current = "";
      setValidationError("");
    }
    closeModal(MODAL_TYPE.PREBUILT_TOOLS_CONFIG_MODAL);
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.PREBUILT_TOOLS_CONFIG_MODAL} onClose={handleClose}>
      <div className="fixed max-w-11/12 inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-low-medium overflow-auto h-auto bg-base-100">
        {/* Header */}
        <div
          id="prebuilt-tools-config-modal-container"
          className="bg-base-100 mb-auto mt-auto rounded-lg shadow-2xl flex flex-col p-6 transition-all duration-300 ease-in-out animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-base-300">
            <h3 className="font-bold text-xl mb-4">Configure Web Search</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="form-control">
                <label className="label !px-0">
                  <span className="label-text font-medium text-md">Allowed Domains</span>
                </label>
                <p className="text-xs text-base-content/60 mb-3">
                  Add domains to filter Web Search. Leave empty to allow all domains.
                </p>
              </div>

              {/* Add New Domain Input */}
              <div className="form-control mb-4">
                <label className="label !px-0">
                  <span className="label-text text-sm font-medium">Add New Domain</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="prebuilt-tools-config-domain-input"
                    type="text"
                    name="domain"
                    value={newDomain}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter domain"
                    className={`input input-bordered input-sm flex-1 focus:ring-1 ring-primary/40 ${
                      !isEditing && validationError ? "input-error border-error" : ""
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    id="prebuilt-tools-config-add-domain-button"
                    type="button"
                    onClick={handleAddDomain}
                    className="btn btn-primary btn-sm"
                    disabled={isLoading || !newDomain.trim()}
                    title="Add domain"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
                {!isEditing && validationError && (
                  <div className="label">
                    <span className="label-text-alt text-error">{validationError}</span>
                  </div>
                )}
              </div>

              {/* Domain List */}
              {domains.length > 0 && (
                <div id="prebuilt-tools-config-domains-list" className="space-y-2 mb-4">
                  <label className="label !px-0">
                    <span className="label-text text-sm font-medium">Current Domains ({domains.length})</span>
                  </label>
                  {domains.map((domain, index) => (
                    <div id={`prebuilt-tools-config-domain-item-${index}`} key={index} className="space-y-1">
                      <div className="group flex items-center gap-2 bg-base-200 rounded-lg p-3 border border-base-300 hover:bg-base-300 transition-colors duration-200">
                        <div className="flex-1">
                          {isEditing && editingIndex === index ? (
                            <input
                              id={`prebuilt-tools-config-edit-input-${index}`}
                              type="text"
                              defaultValue={editingValueRef.current}
                              onChange={handleEditInputChange}
                              onKeyPress={handleEditKeyPress}
                              className={`input input-bordered input-sm w-full focus:ring-1 ring-primary/40 ${
                                isEditing && validationError ? "input-error border-error" : ""
                              }`}
                              placeholder="Enter domain"
                              autoFocus
                              disabled={isLoading}
                            />
                          ) : (
                            <span className="text-sm text-base-content font-medium">{domain}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isEditing && editingIndex === index ? (
                            <>
                              <button
                                id={`prebuilt-tools-config-save-edit-button-${index}`}
                                type="button"
                                onClick={handleSaveEdit}
                                className="btn btn-ghost btn-xs p-1 hover:bg-green-100 hover:text-success"
                                title="Save changes"
                                disabled={isLoading}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                id={`prebuilt-tools-config-cancel-edit-button-${index}`}
                                type="button"
                                onClick={handleCancelEdit}
                                className="btn btn-ghost btn-xs p-1 hover:bg-gray-100 hover:text-base-content"
                                title="Cancel editing"
                                disabled={isLoading}
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                id={`prebuilt-tools-config-edit-button-${index}`}
                                type="button"
                                onClick={() => handleEditDomain(index)}
                                className="btn btn-ghost btn-xs p-1 hover:bg-blue-100 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 tooltip"
                                data-tip="Edit"
                                disabled={isLoading || isEditing}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                id={`prebuilt-tools-config-delete-button-${index}`}
                                type="button"
                                onClick={() => handleRemoveDomain(index)}
                                className="btn btn-ghost btn-xs p-1 hover:bg-red-100 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity duration-200 tooltip"
                                data-tip="Remove"
                                disabled={isLoading || isEditing}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Show validation error directly below this specific domain when editing */}
                      {isEditing && editingIndex === index && validationError && (
                        <div className="px-3">
                          <span className="text-xs text-error">{validationError}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                id="prebuilt-tools-config-close-button"
                type="button"
                className="btn btn-sm hover:text-base-content"
                onClick={handleClose}
                disabled={isLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PrebuiltToolsConfigModal;
