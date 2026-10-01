import React from "react";

/**
 * Main layout component that wraps page content with consistent structure
 * @param {ReactNode} children - The page content
 * @param {boolean} withPadding - Whether to add padding to the content area
 * @returns {JSX.Element}
 */
const MainLayout = ({ children, withPadding = true }) => {
  return (
    <div data-testid="main-layout-container" id="main-layout-container" className="flex flex-col">
      {/* Main content area */}
      <div className={`flex-grow text-base-content ${withPadding ? "pt-4" : ""}`}>{children}</div>
    </div>
  );
};

export default MainLayout;
