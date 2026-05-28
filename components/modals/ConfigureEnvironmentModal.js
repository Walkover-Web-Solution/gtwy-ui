"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { X, Plus, AlertCircle } from "lucide-react";
import { useDispatch } from "react-redux";
import { updateBridgeAction } from "@/store/action/bridgeAction";

const ConfigureEnvironmentModal = ({ bridgeId, bridgeData }) => {
  const dispatch = useDispatch();
  const [environments, setEnvironments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableVersions, setAvailableVersions] = useState([]);

  useEffect(() => {
    if (bridgeData) {
      const existingConfig = bridgeData?.settings?.environment_config || {};
      const environmentsArray = Object.entries(existingConfig).map(([when, versionId]) => ({
        when,
        do: versionId,
      }));
      setEnvironments(environmentsArray.length > 0 ? environmentsArray : [{ when: "", do: "" }]);

      const versions = bridgeData?.versions || [];
      setAvailableVersions([
        ...versions.map((v, index) => ({
          value: v._id || v,
          label: `Version ${index + 1}`,
        })),
      ]);
    }
  }, [bridgeData]);

  const handleClose = () => {
    closeModal(MODAL_TYPE.CONFIGURE_ENVIRONMENT_MODAL);
  };

  const handleAddEnvironment = () => {
    setEnvironments([...environments, { when: "", do: "" }]);
  };

  const handleRemoveEnvironment = (index) => {
    setEnvironments(environments.filter((_, i) => i !== index));
  };

  const handleEnvironmentChange = (index, field, value) => {
    const updated = [...environments];
    updated[index][field] = value;
    setEnvironments(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (environments.some((env) => !env.when || !env.do)) {
      setError("Please fill in all environment fields");
      return;
    }

    if (!bridgeId) {
      setError("No agent selected");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const environmentConfig = {};
      environments.forEach((env) => {
        environmentConfig[env.when] = env.do;
      });

      const dataToSend = {
        settings: {
          environment_config: environmentConfig,
        },
      };

      await dispatch(updateBridgeAction({ bridgeId, dataToSend }));
      handleClose();
    } catch (err) {
      setError(err.message || "Failed to save environment configuration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.CONFIGURE_ENVIRONMENT_MODAL} onClose={handleClose}>
      <div className="flex items-center justify-center">
        <div
          data-testid="configure-environment-modal-container"
          id="configure-environment-modal-container"
          className="min-w-[30rem] max-w-[60rem] bg-base-100 border border-base-300 rounded-lg p-6 mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col space-y-2">
            <h2 className="text-lg font-semibold text-base-content">Configure Environment</h2>
            <p className="text-sm text-base-content/70">
              Map environments to specific agent versions for different deployment scenarios.
            </p>
            {!bridgeId && (
              <div className="flex items-start gap-2 mt-2 p-3 bg-warning/10 border border-warning/30 rounded-md">
                <AlertCircle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm text-warning">Please open this modal from an agent to configure environments.</p>
              </div>
            )}
          </div>

          <form id="configure-environment-form" onSubmit={handleSubmit} className="mt-6">
            <div
              className="space-y-4"
              style={{ opacity: !bridgeId ? 0.5 : 1, pointerEvents: !bridgeId ? "none" : "auto" }}
            >
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-base-300">
                <div>
                  <label className="label-text font-semibold text-sm">When</label>
                </div>
                <div>
                  <label className="label-text font-semibold text-sm">Do</label>
                </div>
              </div>

              {environments.map((env, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 items-end">
                  <div className="form-control w-full">
                    <input
                      autoComplete="off"
                      data-testid={`environment-when-input-${index}`}
                      type="text"
                      placeholder="e.g., Production, Testing, Staging"
                      className="input input-bordered w-full input-sm"
                      value={env.when}
                      onChange={(e) => handleEnvironmentChange(index, "when", e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="form-control w-full">
                      <select
                        data-testid={`environment-do-select-${index}`}
                        className="select select-bordered w-full select-sm"
                        value={env.do}
                        onChange={(e) => handleEnvironmentChange(index, "do", e.target.value)}
                      >
                        <option value="">Select version</option>
                        {availableVersions.length > 0 ? (
                          availableVersions.map((version) => (
                            <option key={version.value} value={version.value}>
                              {version.label}
                            </option>
                          ))
                        ) : (
                          <option disabled>No versions available</option>
                        )}
                      </select>
                    </div>
                    {environments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEnvironment(index)}
                        className="btn btn-ghost btn-sm"
                        title="Remove environment"
                      >
                        <X size={16} className="text-error" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {error && <p className="text-error text-sm mt-2">{error}</p>}
            </div>

            <button type="button" onClick={handleAddEnvironment} className="btn btn-ghost btn-sm mt-4 gap-2">
              <Plus size={14} />
              Add Environment
            </button>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-8">
              <button
                data-testid="configure-environment-cancel-button"
                id="configure-environment-cancel-button"
                type="button"
                onClick={handleClose}
                className="btn btn-sm"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                data-testid="configure-environment-save-button"
                id="configure-environment-save-button"
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isLoading || !bridgeId}
              >
                {isLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default ConfigureEnvironmentModal;
