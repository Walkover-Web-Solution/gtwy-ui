import React from "react";
import StarterQuestionToggle from "./configurationComponent/StarterQuestion";

const ChatbotConfigView = ({ params, searchParams, isPublished }) => {
  return (
    <>
      <StarterQuestionToggle params={params} searchParams={searchParams} isPublished={isPublished} />
    </>
  );
};

export default React.memo(ChatbotConfigView);
