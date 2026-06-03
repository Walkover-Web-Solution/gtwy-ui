import React from "react";
import StarterQuestionToggle from "./configurationComponent/StarterQuestion";
import { useConfigurationContext } from "./ConfigurationContext";

const ChatbotConfigSection = ({ isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const { params, searchParams, bridgeType, modelType } = useConfigurationContext();

  // Only show for chatbot bridge type
  if (bridgeType !== "chatbot" || modelType === "image") {
    return null;
  }

  return (
    <div className="z-very-low mt-2 text-base-content w-full max-w-md cursor-pointer" tabIndex={0}>
      <StarterQuestionToggle
        params={params}
        searchParams={searchParams}
        isPublished={isPublished}
        isEditor={isEditor}
      />
    </div>
  );
};

export default React.memo(ChatbotConfigSection);
