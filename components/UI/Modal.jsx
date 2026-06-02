import React from "react";

const Modal = ({ MODAL_ID, children, onClose }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const modalElement = document.getElementById(MODAL_ID);

    const handleDialogOpen = () => {
      setIsOpen(true);
    };

    const handleDialogClose = () => {
      setIsOpen(false);
      // Call onClose callback when modal closes (ESC, backdrop click, etc.)
      if (onClose && typeof onClose === "function") {
        onClose();
      }
    };

    if (modalElement) {
      // Use MutationObserver to detect when the 'open' attribute is added/removed
      const observer = new MutationObserver(() => {
        if (modalElement.hasAttribute("open")) {
          handleDialogOpen();
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
    }
  }, [MODAL_ID, onClose]);

  return (
    <dialog
      data-testid={MODAL_ID}
      id={MODAL_ID}
      className="modal"
      style={{ pointerEvents: isOpen ? undefined : "none" }}
    >
      {isOpen ? children : null}
    </dialog>
  );
};

export default Modal;
