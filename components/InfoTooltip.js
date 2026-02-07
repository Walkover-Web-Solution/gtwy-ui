import React, { useState, useRef, useEffect } from "react";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import { createPortal } from "react-dom";
import Tutorial from "./Tutorial";
import { ExternalLinkIcon } from "./Icons";
import SmartLink from "./SmartLink";

const InfoTooltip = ({ video = "", children, tooltipContent, docLink }) => {
  const [open, setOpen] = useState(false); // for hover state
  const [showTutorial, setShowTutorial] = useState(false);
  const delayTimeout = useRef(null);

  const { refs, floatingStyles, update } = useFloating({
    placement: "top",
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const handleOpenWithDelay = () => {
    clearTimeout(delayTimeout.current);
    delayTimeout.current = setTimeout(() => {
      setOpen(true);
    }, 300);
  };

  const handleClose = () => {
    clearTimeout(delayTimeout.current);
    delayTimeout.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  useEffect(() => {
    if (open && refs.reference.current && refs.floating.current) {
      const cleanup = autoUpdate(refs.reference.current, refs.floating.current, update);
      return () => cleanup();
    }
  }, [open, update, refs.reference, refs.floating]);

  return (
    <>
      <div
        id="info-tooltip-trigger"
        ref={refs.setReference}
        onMouseEnter={handleOpenWithDelay}
        onMouseLeave={handleClose}
        className="inline-block"
      >
        {children}

        {open && (
          <div
            id="info-tooltip-content"
            ref={refs.setFloating}
            style={floatingStyles}
            onMouseEnter={() => {
              clearTimeout(delayTimeout.current);
              setOpen(true);
            }}
            onMouseLeave={handleClose}
            className="
              z-low-medium w-64 p-3 ml-3 bg-base-300 text-base-content text-primary-foreground
              rounded-md shadow-xl text-xs animate-in fade-in zoom-in
              border border-base-300 space-y-2 pointer-events-auto
            "
          >
            <p className="whitespace-pre-line">
              {tooltipContent}
              {docLink && (
                <SmartLink href={docLink}>
                  <span className="inline-flex  items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300  font-medium group">
                    Learn more
                  </span>
                  <ExternalLinkIcon size={12} />
                </SmartLink>
              )}
            </p>
            {video !== "" && (
              <button
                id="info-tooltip-video-button"
                onClick={() => setShowTutorial(true)}
                className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pointer-events-auto"
              >
                Watch Video <span aria-hidden>↗</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showTutorial &&
        typeof window !== "undefined" &&
        createPortal(<Tutorial video={video} setShowTutorial={setShowTutorial} />, document.body)}
    </>
  );
};

export default InfoTooltip;
