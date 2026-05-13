"use client";
import ChatbotConfigDetailView from "@/components/chatbotConfiguration/ChatbotConfigDetailView";
import Protected from "@/components/Protected";
import React, { use, useEffect } from "react";
import { collapseMainSlider } from "@/utils/utility";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { generateChatbotTokenAction } from "@/store/action/integrationAction";
import { clearEmbedToken } from "@/store/reducer/integrationReducer";

const Page = ({ params }) => {
  const resolvedParams = use(params);
  const dispatch = useDispatch();

  const { chatbots, currentUser, embedTokens } = useCustomSelector((state) => ({
    chatbots: state?.ChatBot?.org?.[resolvedParams?.org_id] || [],
    currentUser: state.userDetailsReducer.userDetails,
    embedTokens: state?.integrationReducer?.embedTokens,
  }));

  const chatBotId = chatbots?.[0]?._id;

  const embedToken = embedTokens?.[chatBotId];

  // Collapse MainSlider when chatbot config page loads
  useEffect(() => {
    collapseMainSlider();
  }, []);

  // Generate embed token for chatbot preview
  useEffect(() => {
    if (!embedToken && chatBotId && currentUser?.id) {
      dispatch(generateChatbotTokenAction(chatBotId, currentUser.id));
    }
  }, [chatBotId, currentUser?.id, embedToken]);

  // Cleanup embedToken on unmount
  useEffect(() => {
    return () => {
      if (chatBotId) {
        dispatch(clearEmbedToken({ folderId: chatBotId }));
      }
    };
  }, [chatBotId]);

  return <ChatbotConfigDetailView params={resolvedParams} embedToken={embedToken} />;
};

export default Protected(Page);
