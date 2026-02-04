import React, { useState } from "react";
import PrivateFormSection from "./FirstStep";
import FormSection from "./FormSection";
import SecondStep from "./SecondStep";

function ChatbotGuide({ params }) {
  const [chatbotId, setChatBotId] = useState("");
  return (
    <>
      <div className="">
        <PrivateFormSection params={params} ChooseChatbot={true} setChatBotIdFucntion={setChatBotId} />
        <FormSection params={params} chatbotId={chatbotId} />
        <SecondStep />
      </div>
    </>
  );
}

export default ChatbotGuide;
