import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to warn user about unsaved changes on navigation away (route change)
 *
 * @param {boolean} hasUnsavedChanges - Flag indicating if there are unsaved changes
 * @param {Function} onConfirmSave - Callback when user confirms to save
 * @param {Function} onConfirmDiscard - Callback when user confirms to discard
 * @param {Object} modalState - Modal state object { isOpen, setIsOpen }
 */
export const useUnsavedChangesWarning = (
  hasUnsavedChanges,
  onConfirmSave,
  onConfirmDiscard,
  modalState
) => {
  const router = useRouter();
  const pendingNavigationRef = useRef(null);
  const routerPushRef = useRef(null);

  // Intercept router.push to show modal on navigation
  useEffect(() => {
    if (!hasUnsavedChanges) {
      // Restore original push if no unsaved changes
      if (routerPushRef.current) {
        router.push = routerPushRef.current;
        routerPushRef.current = null;
      }
      return;
    }

    // Store original push method if not already stored
    if (!routerPushRef.current) {
      routerPushRef.current = router.push.bind(router);
    }

    // Override router.push
    const interceptedPush = (href, options) => {
      pendingNavigationRef.current = { href, options };
      modalState.setIsOpen(true);
      return Promise.resolve();
    };

    router.push = interceptedPush;

    return () => {
      // Cleanup: restore original push
      if (routerPushRef.current) {
        router.push = routerPushRef.current;
      }
    };
  }, [hasUnsavedChanges, modalState, router]);

  // Handle confirmed save
  const handleConfirmSave = useCallback(() => {
    onConfirmSave?.();
    
    if (pendingNavigationRef.current && routerPushRef.current) {
      const { href, options } = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      modalState.setIsOpen(false);
      // Use original router.push to navigate
      routerPushRef.current(href, options);
    } else {
      modalState.setIsOpen(false);
    }
  }, [onConfirmSave, modalState]);

  // Handle confirmed discard
  const handleConfirmDiscard = useCallback(() => {
    onConfirmDiscard?.();
    
    if (pendingNavigationRef.current && routerPushRef.current) {
      const { href, options } = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      modalState.setIsOpen(false);
      // Use original router.push to navigate
      routerPushRef.current(href, options);
    } else {
      modalState.setIsOpen(false);
    }
  }, [onConfirmDiscard, modalState]);

  return {
    handleConfirmSave,
    handleConfirmDiscard,
  };
};
