import React from "react";
import { AlertCircle } from "lucide-react";

const FEATURE_MESSAGES = {
  "System Prompt": {
    title: "Prompt not available for this model",
    description: "Prompt isn't available for the selected model. Please choose a different model.",
  },
  Connectors: {
    title: "Connectors not available for this model",
    description: "The selected model does not support external connectors. Please choose a different model.",
  },
  Memory: {
    title: "Memory not available for this model",
    description: "The selected model does not support memory. Please choose a different model.",
  },
  Settings: {
    title: "Settings not available for this model",
    description: "The selected model does not support these settings. Please choose a different model.",
  },
};

const UnsupportedFeatureOverlay = ({ featureName = "feature" }) => {
  const { title, description } = FEATURE_MESSAGES[featureName] || {
    title: `${featureName} not available for this model`,
    description: "This feature isn't available for the selected model. Please choose a different model.",
  };

  return (
    <div
      className="absolute inset-0 z-30 bg-base-100/55 backdrop-blur-sm flex items-start justify-center px-4 pb-4 pt-[220px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-base-200 border border-base-300 rounded-lg p-6 shadow-lg max-w-md w-full text-center">
        <AlertCircle className="w-12 h-12 text-warning mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-base-content mb-2">{title}</h3>
        <p className="text-sm text-base-content/70">{description}</p>
      </div>
    </div>
  );
};

export default UnsupportedFeatureOverlay;
