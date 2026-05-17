import { toast } from "react-toastify";

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
