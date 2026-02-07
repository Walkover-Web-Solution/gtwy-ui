import React from "react";

function LoadingSpinner({ height = "100vh", width = "100vw", marginLeft = "0px", marginTop = "0px", margin = "auto" }) {
  return (
    <div
      className="fixed inset-0 bg-base-100 flex flex-col justify-center items-center z-very-high"
      style={{ height, width, margin, marginLeft, marginTop }}
    >
      {/* Spinner Circle with darker and larger border */}
      <div className="relative w-8 h-8 mb-3">
        <div className="absolute inset-0 w-8 h-8 border-4 border-base-200 rounded-full"></div>
        <div className="absolute inset-0 w-8 h-8 border-4 border-transparent border-t-base-content rounded-full animate-spin"></div>
        {/* Subtle inner glow */}
        <div className="absolute inset-1 w-8 h-8 bg-gradient-to-br from-white/20 to-transparent rounded-full pointer-events-none"></div>
      </div>

      {/* Loading Text with subtle animation */}
      <div className="fixed inset-0 bg-base-100 flex flex-col justify-center items-center z-50 transition-colors">
        <div className="relative w-10 h-10 mb-4">
          <div className="absolute inset-0 w-10 h-10 border-4 border-base-300 rounded-full"></div>
          <div className="absolute inset-0 w-10 h-10 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        </div>
        <span className="text-base-content text-sm font-medium animate-pulse">Loading...</span>
      </div>
    </div>
  );
}
export default LoadingSpinner;
