import { toast } from "react-toastify";
import { store } from "@/store/store";
import { addErrorLog } from "@/store/reducer/errorLogsReducer";

/**
 * Push an error entry into the redux error-logs slice (session only).
 * Safe to call from anywhere — swallows its own failures so it never
 * masks the original error.
 */
export const logErrorToStore = (error, extra = {}) => {
  try {
    const message = getErrorMessage(error);
    store.dispatch(
      addErrorLog({
        message,
        status: error?.response?.status ?? null,
        url: error?.config?.url || error?.request?.responseURL || null,
        method: error?.config?.method ? String(error.config.method).toUpperCase() : null,
        source: extra.source || "api",
        details:
          error?.response?.data && typeof error.response.data === "object"
            ? error.response.data
            : error?.response?.data
              ? String(error.response.data).slice(0, 500)
              : null,
      })
    );
  } catch {
    // never let logging break the app
  }
};

/**
 * Safely extracts error message from axios error or network error
 * @param {Error} error - The error object
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  // Network error (no response from server)
  if (error?.isNetworkError || !error?.response) {
    return error?.message || "Connection lost. Please check your internet connection.";
  }

  // Server error with response
  return (
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

/**
 * Shows a toast error for network/connection issues
 * @param {Error} error - The error object
 * @param {string} fallbackMessage - Optional fallback message
 */
export const handleApiError = (error, fallbackMessage = "Something went wrong") => {
  const isNetworkError = error?.isNetworkError || !error?.response;
  const message = getErrorMessage(error);

  // Always record in the redux error log for the debug slider
  logErrorToStore(error, { source: "handleApiError" });

  if (isNetworkError) {
    toast.error(message);
  } else {
    toast.error(message || fallbackMessage);
  }
};

/**
 * Checks if error is a network error
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export const isNetworkError = (error) => {
  return error?.isNetworkError || !error?.response;
};
