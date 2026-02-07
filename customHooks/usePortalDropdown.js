import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useOutsideClick } from "@/utils/utility";

/**
 * Custom hook for managing portal-based dropdowns with proper positioning and event handling
 * @param {Object} options - Configuration options
 * @param {number} options.offsetX - Horizontal offset for portal positioning (default: -150)
 * @param {number} options.offsetY - Vertical offset for portal positioning (default: 5)
 * @param {number} options.hoverDelay - Delay before closing on mouse leave (default: 100ms)
 * @returns {Object} Portal management functions and components
 */
const usePortalDropdown = (options = {}) => {
  const { offsetX = -150, offsetY = 5, hoverDelay = 100 } = options;

  // Portal state
  const [portalPosition, setPortalPosition] = useState({ top: 0, left: 0 });
  const [showPortal, setShowPortal] = useState(false);
  const [portalContent, setPortalContent] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [portalTriggerElement, setPortalTriggerElement] = useState(null);
  const portalRef = useRef(null);

  // Portal handlers
  const handlePortalOpen = useCallback(
    (triggerElement, content) => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        setHoverTimeout(null);
      }

      const rect = triggerElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate initial position
      let top = rect.bottom + window.scrollY + offsetY;
      let left = rect.left + window.scrollX + offsetX;

      // Adjust horizontal position if dropdown would go off-screen
      const dropdownWidth = 200; // Estimated dropdown width
      if (left + dropdownWidth > viewportWidth) {
        left = rect.right + window.scrollX - dropdownWidth;
      }
      if (left < 0) {
        left = 10; // Minimum margin from left edge
      }

      // Adjust vertical position if dropdown would go off-screen
      const dropdownHeight = 150; // Estimated dropdown height
      if (top + dropdownHeight > viewportHeight + window.scrollY) {
        top = rect.top + window.scrollY - dropdownHeight - offsetY;
      }

      setPortalPosition({ top, left });
      setPortalContent(content);
      setPortalTriggerElement(triggerElement);
      setShowPortal(true);

      if (triggerElement) {
        triggerElement.classList.add("portal-active");
      }
    },
    [hoverTimeout, offsetX, offsetY]
  );

  const handlePortalCloseImmediate = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    if (portalTriggerElement) {
      portalTriggerElement.classList.remove("portal-active");
    }
    setShowPortal(false);
    setPortalContent(null);
    setPortalTriggerElement(null);
  }, [hoverTimeout, portalTriggerElement]);

  const handlePortalMouseEnter = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  }, [hoverTimeout]);

  const handlePortalMouseLeave = useCallback(() => {
    const timeout = setTimeout(() => {
      if (portalTriggerElement) {
        portalTriggerElement.classList.remove("portal-active");
      }
      setShowPortal(false);
      setPortalContent(null);
      setPortalTriggerElement(null);
    }, hoverDelay);
    setHoverTimeout(timeout);
  }, [portalTriggerElement, hoverDelay]);

  // Use utility function for outside click handling
  const { handleClickOutside, handleKeyDown, handleScroll } = useOutsideClick(
    portalRef,
    { current: portalTriggerElement },
    handlePortalCloseImmediate,
    showPortal
  );

  // Event listeners for dropdown auto-close
  useEffect(() => {
    if (showPortal) {
      // Add scroll listeners to window and any scrollable containers
      window.addEventListener("scroll", handleScroll, true);
      document.addEventListener("scroll", handleScroll, true);

      // Add click outside listener
      document.addEventListener("mousedown", handleClickOutside);

      // Add keyboard listener for Escape key
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPortal, handleClickOutside, handleKeyDown, handleScroll]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Portal component
  const PortalDropdown = () => {
    if (!showPortal || !portalContent || typeof document === "undefined") {
      return null;
    }

    return createPortal(
      <div
        ref={portalRef}
        className="fixed bg-base-100 shadow-lg rounded-lg border border-base-300"
        style={{
          top: `${portalPosition.top}px`,
          left: `${portalPosition.left}px`,
          zIndex: 999999999,
          position: "fixed",
          pointerEvents: "auto",
        }}
        onMouseEnter={handlePortalMouseEnter}
        onMouseLeave={handlePortalMouseLeave}
      >
        {portalContent}
      </div>,
      document.body
    );
  };

  // Global styles component
  const PortalStyles = () => (
    <style jsx global>{`
      .portal-active {
        opacity: 1 !important;
        visibility: visible !important;
        z-index: 9999 !important;
      }

      .table-row:hover .portal-active {
        opacity: 1 !important;
      }

      .group:hover .portal-active {
        opacity: 1 !important;
      }

      .portal-active * {
        pointer-events: auto !important;
      }
    `}</style>
  );

  return {
    // State
    showPortal,
    portalContent,
    portalPosition,

    // Handlers
    handlePortalOpen,
    handlePortalCloseImmediate,
    handlePortalMouseEnter,
    handlePortalMouseLeave,

    // Components
    PortalDropdown,
    PortalStyles,

    // Refs (if needed for advanced usage)
    portalRef,
    portalTriggerElement,
  };
};

export default usePortalDropdown;
