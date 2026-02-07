import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AddIcon, CloseIcon, BotIcon, ArrowUpIcon, ChartIcon } from "@/components/Icons";
import { useCustomSelector } from "@/customHooks/customSelector";
import { addorRemoveBridgeInChatBotAction } from "@/store/action/chatBotAction";
import { useDispatch } from "react-redux";

const ChatBotList = ({ params }) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { bridgeType, chatbotData, chatBotList } = useCustomSelector((state) => ({
    bridgeType: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType,
    chatbotData: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.chatbotData,
    chatBotList: state?.ChatBot?.org?.[params?.org_id] || [],
  }));
  const handleAddChatbotClick = () => {
    setIsSliderOpen(!isSliderOpen);
  };
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const handleChatbotSelect = (chatBotId, type) => {
    dispatch(addorRemoveBridgeInChatBotAction(params.org_id, chatBotId, params.id, type));
  };

  return (
    bridgeType === "chatbot" && (
      <div id="chatbot-list-container" className="form-control">
        <p className="text-xl font-medium text-base-content">ChatBot</p>
        <div id="chatbot-cards-wrapper" className="flex flex-wrap gap-4">
          {chatbotData?.map((chatBot, index) => (
            <div
              id={`chatbot-card-${chatBot._id}`}
              key={index}
              onClick={() => router.push(`/org/${params.org_id}/chatbot/configure/${chatBot._id}`)}
              className="flex max-w-xs flex-col items-center rounded-md border border-base-300 md:flex-row cursor-pointer transform transition duration-150 ease-in-out hover:bg-base-200"
            >
              <div>
                <div className="p-4">
                  <h1 className="inline-flex items-center text-lg font-semibold text-base-content">
                    {chatBot.title}
                    <ArrowUpIcon className="ml-2 h-4 w-4" />
                  </h1>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button id="add-chatbot-button" className="btn btn-outline btn-sm mt-4 w-fit" onClick={handleAddChatbotClick}>
          <AddIcon size={16} /> Add ChatBot
        </button>

        {isSliderOpen && (
          <aside
            id="chatbot-slider"
            className="absolute right-0 top-0 z-high flex h-full w-1/3 flex-col overflow-y-auto bg-base-100 px-5 py-8 shadow-lg "
          >
            <div className="flex items-center justify-between ">
              <h1 className="text-xl font-medium flex items-center gap-2 text-base-content">
                <BotIcon /> Chat Bot list
              </h1>
              <button
                id="chatbot-slider-close-button"
                className="btn btn-outline btn-circle btn-sm"
                onClick={handleAddChatbotClick}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="mt-6 flex flex-1 flex-col justify-between">
              <nav className="-mx-3 space-y-6 ">
                <div id="chatbot-list-items" className="space-y-3 ">
                  {chatBotList?.map((chatBot, index) => (
                    <a
                      id={`chatbot-list-item-${chatBot._id}`}
                      onClick={(e) => {
                        e.preventDefault(); // Prevent the default anchor action
                        // Toggle the checkbox's checked status programmatically
                        const checkbox = document.getElementById(`chatbot-${chatBot._id}`);
                        checkbox.click(); // Programmatically click the checkbox
                        // No need to manually call handleChatbotSelect here since clicking the checkbox will trigger its onClick event
                      }}
                      key={index} // Keep the key for list rendering
                      className="flex transform items-center justify-between rounded-lg px-3 py-2 text-base-content transition-colors duration-300 hover:bg-base-200 hover:text-base-content"
                      href="#"
                      style={{ overflow: "hidden" }}
                    >
                      <div className="flex items-center w-full gap-2">
                        <ChartIcon className="h-5 w-5" aria-hidden="true" />
                        <span className="mx-2 text-sm font-medium truncate">{chatBot?.title}</span>
                      </div>
                      <input
                        type="checkbox"
                        id={`chatbot-${chatBot._id}`} // Use a unique ID for each checkbox
                        defaultChecked={chatbotData?.some((e) => e._id === chatBot._id)}
                        className="checkbox"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the checkbox click from bubbling up to the link's onClick
                          handleChatbotSelect(chatBot._id, e.target.checked ? "add" : "remove");
                        }}
                      />
                    </a>
                  ))}
                </div>
              </nav>
            </div>
          </aside>
        )}
      </div>
    )
  );
};

export default ChatBotList;
