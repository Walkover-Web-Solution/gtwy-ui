import React, { useState } from "react";
import { createPortal } from "react-dom";
import Protected from "./Protected";
import { X } from "lucide-react";

const SmartLink = ({ href, children, isEmbedUser }) => {
  const [isSliderOpen, setIsSliderOpen] = useState(false);

  const handleClick = (e) => {
    if (isEmbedUser) {
      e.preventDefault();
      setIsSliderOpen(true);
    }
  };

  const closeSlider = () => {
    setIsSliderOpen(false);
  };

  if (isEmbedUser) {
    return (
      <>
        <button
          id="smart-link-embed-button"
          onClick={handleClick}
          className="text-primary hover:text-primary-focus underline cursor-pointer bg-transparent border-none p-0 font-inherit"
        >
          {children}
        </button>

        {/* Portal for Custom Drawer */}
        {isSliderOpen &&
          typeof window !== "undefined" &&
          createPortal(
            <div id="smart-link-drawer-overlay" className="fixed inset-0 z-[9999] flex">
              {/* Backdrop */}
              <div
                id="smart-link-drawer-backdrop"
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={closeSlider}
              />

              {/* Drawer Panel */}
              <div
                id="smart-link-drawer-panel"
                className="relative ml-auto w-full max-w-4xl bg-base-100 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-base-300 bg-base-200 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-base-content truncate flex-1 mr-4">{"Gtwy Blog Page"}</h3>
                  <button
                    id="smart-link-drawer-close-button"
                    onClick={closeSlider}
                    className="btn btn-sm btn-ghost btn-circle"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 w-full overflow-hidden">
                  <iframe
                    id="smart-link-drawer-iframe"
                    src={href + "?source=single"}
                    className="w-full h-full border-0"
                    title="External Content"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  />
                </div>
              </div>
            </div>,
            document.body
          )}
      </>
    );
  }

  // Normal behavior for non-embed users
  return (
    <a id="smart-link-external-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
};

export default Protected(SmartLink);
