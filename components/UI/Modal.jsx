import React from "react";

const Modal = ({ MODAL_ID, children, onClose }) => {
  React.useEffect(() => {
    const modalElement = document.getElementById(MODAL_ID);

    const handleDialogClose = (event) => {
      // Call onClose callback when modal closes (ESC, backdrop click, etc.)
      if (onClose && typeof onClose === "function") {
        onClose();
      }
    };

    if (modalElement) {
      modalElement.addEventListener("close", handleDialogClose);
    }

    return () => {
      if (modalElement) {
        modalElement.removeEventListener("close", handleDialogClose);
      }
    };
  }, [MODAL_ID, onClose]);

  return (
    <dialog id={MODAL_ID} className="modal">
      {children}
    </dialog>
  );
};

export default Modal;
