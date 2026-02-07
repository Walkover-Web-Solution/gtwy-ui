import React from "react";
import UserRefernceForRichText from "./configurationComponent/UserRefernceForRichText";
import StarterQuestionToggle from "./configurationComponent/StarterQuestion";
import ActionList from "./configurationComponent/ActionList";

const ChatbotConfigView = ({ params, searchParams, isPublished }) => {
  return (
    <>
      <UserRefernceForRichText params={params} searchParams={searchParams} isPublished={isPublished} />
      <StarterQuestionToggle params={params} searchParams={searchParams} isPublished={isPublished} />
      <ActionList params={params} searchParams={searchParams} isPublished={isPublished} />
    </>
  );
};

export default React.memo(ChatbotConfigView);
