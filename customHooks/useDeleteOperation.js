import { useState, useCallback } from "react";
import { closeModal } from "@/utils/utility";
import { MODAL_TYPE } from "@/utils/enums";

/**
 * Custom hook for managing delete operations with loading state
 * Ensures modal stays open until API completes successfully or fails
 *
 * @param {string} modalType - The modal type to close after successful operation
 * @param {Object} options - Configuration options
 * @param {boolean} options.closeOnSuccess - Whether to close modal on success (default: true)
 * @param {boolean} options.closeOnError - Whether to close modal on error (default: true)
 * @param {function} options.onSuccess - Callback function on successful delete
 * @param {function} options.onError - Callback function on error
 */
const useDeleteOperation = (modalType = MODAL_TYPE.DELETE_MODAL, options = {}) => {
  const { closeOnSuccess = true, closeOnError = true, onSuccess, onError } = options;

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const executeDelete = useCallback(
    async (deleteFunction, ...args) => {
      if (isDeleting) return { success: false, error: "Operation already in progress" };

      setIsDeleting(true);
      setError(null);

      try {
        // Execute the delete function (should return a promise)
        const result = await deleteFunction(...args);

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result);
        }

        // Close modal only after successful completion
        if (closeOnSuccess) {
          closeModal(modalType);
        }

        return { success: true, result };
      } catch (error) {
        console.error("Delete operation failed:", error);
        setError(error);

        // Call error callback if provided
        if (onError) {
          onError(error);
        }

        // Close modal on error if configured to do so
        if (closeOnError) {
          closeModal(modalType);
        }

        return { success: false, error };
      } finally {
        setIsDeleting(false);
      }
    },
    [isDeleting, modalType, closeOnSuccess, closeOnError, onSuccess, onError]
  );

  const resetDeleteState = useCallback(() => {
    setIsDeleting(false);
    setError(null);
  }, []);

  return {
    isDeleting,
    error,
    executeDelete,
    resetDeleteState,
  };
};

export default useDeleteOperation;
