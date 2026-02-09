// PageHeader.js
import React from "react";
import { ExternalLinkIcon } from "./Icons";
import SmartLink from "./SmartLink";

/**
 * Reusable page header component
 * @param {string} title - The page title
 * @param {string} description - The page description
 * @param {string} docLink - The link to the documentation page
 * @returns {JSX.Element}
 */
const PageHeader = ({ title, description, docLink }) => {
  return (
    <div id="page-header-container" className="mb-6">
      <h1 className="text-2xl font-bold mb-1">{title}</h1>
      {description && (
        <p className="text-base text-base-content opacity-80">
          {description}
          <SmartLink id="page-header-learn-more-link" href={docLink}>
            <span className="inline-flex mb-4 ml-1 items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors font-medium group">
              Learn more <ExternalLinkIcon size={16} />
            </span>
          </SmartLink>
        </p>
      )}
    </div>
  );
};

export default PageHeader;
