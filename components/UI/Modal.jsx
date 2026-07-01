import React, { useEffect } from "react";
import { X } from "lucide-react";

const Modal = ({
  MODAL_ID,
  children,
  onClose,
  title,
  description,
  icon,
  widthClass = "w-[min(720px,92vw)]",
  footer,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const onCloseRef = React.useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const modalElement = document.getElementById(MODAL_ID);
    if (!modalElement) return;

    const handleDialogClose = () => {
      setIsOpen(false);
      if (typeof onCloseRef.current === "function") {
        onCloseRef.current();
      }
    };

    if (modalElement.hasAttribute("open")) {
      setIsOpen(true);
    }
    const observer = new MutationObserver(() => {
      if (modalElement.hasAttribute("open")) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    });
    observer.observe(modalElement, { attributes: true, attributeFilter: ["open"] });
    modalElement.addEventListener("close", handleDialogClose);

    return () => {
      observer.disconnect();
      modalElement.removeEventListener("close", handleDialogClose);
    };
  }, [MODAL_ID]);

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    } else {
      const modalElement = document.getElementById(MODAL_ID);
      if (modalElement) {
        if (modalElement.close) {
          modalElement.close();
        }
        modalElement.removeAttribute("open");
      }
    }
  };

  if (!isOpen) {
    return <dialog data-testid={MODAL_ID} id={MODAL_ID} className="modal" style={{ pointerEvents: "none" }} />;
  }

  // Premium modal presentation if title is supplied
  if (title) {
    return (
      <dialog
        data-testid={MODAL_ID}
        id={MODAL_ID}
        className="modal open"
        style={{ display: "flex", pointerEvents: "auto" }}
      >
        <div
          className="fixed inset-0 z-low-medium flex min-h-[100vh] min-w-[100vw] items-center justify-center overflow-auto bg-black/60 py-8 backdrop-blur-[2px]"
          onClick={handleClose}
        >
          <div
            id={`${MODAL_ID}-container`}
            className={`relative flex ${widthClass} max-h-[88vh] flex-col overflow-hidden rounded-xl border border-base-content/10 shadow-2xl animate-scaleIn`}
            style={{ background: "var(--ai-config-container-bg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Static Header */}
            <div
              className="flex shrink-0 items-center justify-between border-b border-base-content/10 px-5 py-4"
              style={{ background: "var(--ai-config-header-bg)" }}
            >
              <div className="flex items-center gap-2.5">
                {icon}
                <div className="flex flex-col text-left">
                  <h3 className="text-base font-semibold text-base-content">{title}</h3>
                  {description && <p className="text-xs text-base-content/70 mt-0.5">{description}</p>}
                </div>
              </div>
              <button
                type="button"
                data-testid={MODAL_ID ? `${MODAL_ID}-close-button` : "modal-close-button"}
                data-test-id={MODAL_ID ? `${MODAL_ID}-close-button` : "modal-close-button"}
                className="rounded-md p-1.5 text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-base-content"
                onClick={handleClose}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {/* Static Footer */}
            {footer && (
              <div
                className="flex shrink-0 items-center justify-end gap-3 border-t border-base-content/10 px-5 py-3"
                style={{ background: "var(--ai-config-header-bg)" }}
              >
                {footer}
              </div>
            )}
          </div>
        </div>
      </dialog>
    );
  }

  return (
    <dialog data-testid={MODAL_ID} id={MODAL_ID} className="modal" style={{ pointerEvents: "auto" }}>
      {children}
    </dialog>
  );
};

export default Modal;
