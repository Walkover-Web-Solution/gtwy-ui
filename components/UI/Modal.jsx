import React, { useEffect } from "react";
import ReactDOM from "react-dom";

const Modal = ({ MODAL_ID, children, onClose }) => {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;

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
  }, [MODAL_ID, onClose, mounted]);

  if (!mounted || typeof window === "undefined") return null;

  return ReactDOM.createPortal(
    <dialog id={MODAL_ID} className="modal">
      {children}
    </dialog>,
    document.body
  );
};

export default Modal;
