import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Generic Slider Utility Component
 * @param {Object} props - Slider configuration
 * @param {boolean} props.isOpen - Whether the slider is open
 * @param {Function} props.onClose - Function to close the slider
 * @param {string} props.title - Slider title
 * @param {string} props.url - URL to display in iframe
 * @param {string} props.maxWidth - Maximum width of slider (default: '4xl')
 * @param {boolean} props.addSourceParam - Whether to add ?source=single to URL (default: true)
 * @param {Object} props.iframeProps - Additional iframe properties
 * @param {Object} props.customStyles - Custom styling overrides
 */
export const GenericSlider = ({
  isOpen,
  onClose,
  title,
  url,
  maxWidth = "4xl",
  addSourceParam = true,
  iframeProps = {},
  customStyles = {},
}) => {
  // Handle ESC key to close slider
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, onClose]);

  if (!isOpen || typeof window === "undefined") return null;

  const finalUrl = addSourceParam && url ? `${url}?source=single` : url;

  const defaultIframeProps = {
    className: "w-full h-full border-0",
    title: "External Content",
    sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox",
    ...iframeProps,
  };

  const sliderStyles = {
    backdrop: "fixed inset-0 bg-black bg-opacity-50 transition-opacity",
    panel: `relative ml-auto w-full max-w-${maxWidth} bg-base-100 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col`,
    header: "flex items-center justify-between p-4 border-b border-base-300 bg-base-200 flex-shrink-0",
    title: "text-lg font-semibold text-base-content truncate flex-1 mr-4",
    closeButton: "btn btn-sm btn-ghost btn-circle",
    content: "flex-1 w-full overflow-hidden",
    ...customStyles,
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex">
      {/* Backdrop */}
      <div className={sliderStyles.backdrop} onClick={onClose} />

      {/* Drawer Panel */}
      <div className={sliderStyles.panel}>
        {/* Header */}
        <div className={sliderStyles.header}>
          <h3 className={sliderStyles.title}>{title}</h3>
          <button onClick={onClose} className={sliderStyles.closeButton} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className={sliderStyles.content}>
          <iframe src={finalUrl} {...defaultIframeProps} />
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Hook for managing slider state
 * @param {Object} initialState - Initial slider state
 * @returns {Object} Slider state and controls
 */
export const useSlider = (initialState = { isOpen: false, url: "", title: "" }) => {
  const [sliderState, setSliderState] = React.useState(initialState);

  const openSlider = React.useCallback((url, title, additionalData = {}) => {
    setSliderState({
      isOpen: true,
      url,
      title,
      ...additionalData,
    });
  }, []);

  const closeSlider = React.useCallback(() => {
    setSliderState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const resetSlider = React.useCallback(() => {
    setSliderState(initialState);
  }, [initialState]);

  return {
    sliderState,
    openSlider,
    closeSlider,
    resetSlider,
    setSliderState,
  };
};

/**
 * Utility function to create a slider configuration
 * @param {Object} config - Slider configuration
 * @returns {Object} Complete slider configuration
 */
export const createSliderConfig = (config) => {
  return {
    maxWidth: "4xl",
    addSourceParam: true,
    iframeProps: {},
    customStyles: {},
    ...config,
  };
};

export default GenericSlider;
