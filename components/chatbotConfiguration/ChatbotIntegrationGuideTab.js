"use client";

import React from "react";
import PrivateFormSection from "./FirstStep";
import SecondStep from "./SecondStep";
import { useCustomSelector } from "@/customHooks/customSelector";
import PageHeader from "@/components/Pageheader";

const ChatbotIntegrationGuideTab = ({ params, chatBotId }) => {
  const { slugName, prompt, descriptions, linksData } = useCustomSelector((state) => {
    const chatBotConfig = state?.ChatBot?.ChatBotMap?.[chatBotId];
    return {
      slugName: chatBotConfig?.slugName || "",
      prompt: chatBotConfig?.prompt || "",
      descriptions: state.flowDataReducer.flowData?.descriptionsData?.descriptions || {},
      linksData: state.flowDataReducer.flowData.linksData || [],
    };
  });

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="chatbot-integration-guide-tab">
      <PageHeader
        title="Chatbot Integration Guide"
        description={
          descriptions?.["Chatbot Setup"] ||
          "Follow these steps to integrate your chatbot into your website or application."
        }
        docLink={linksData?.find((link) => link.title === "Chatbot Configuration")?.blog_link}
      />

      <div className="space-y-6">
        <PrivateFormSection params={params} ChooseChatbot={true} />
        <SecondStep slugName={slugName} prompt={prompt} />
      </div>
    </div>
  );
};

export default ChatbotIntegrationGuideTab;
