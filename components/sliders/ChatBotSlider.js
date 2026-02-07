import { useCustomSelector } from "@/customHooks/customSelector";
import { toggleSidebar } from "@/utils/utility";
import { CloseIcon } from "@/components/Icons";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";

function ChatBotSlider() {
  const router = useRouter();
  const pathName = usePathname();
  const path = pathName.split("?")[0].split("/");
  const [chatbotSearchQuery, setChatbotSearchQuery] = useState("");
  const chatbotList = useCustomSelector((state) => state?.ChatBot?.org[path[2]]) || [];

  const handleChatbotSearchChange = (e) => {
    setChatbotSearchQuery(e.target.value);
  };

  const filteredChatbotsList = chatbotList.filter((item) =>
    item?.title?.toLowerCase().includes(chatbotSearchQuery?.toLowerCase())
  );

  const handleNavigation = (id) => {
    router.push(`/org/${path[2]}/chatbot/configure/${id}`);
    toggleSidebar("default-chatbot-sidebar");
  };

  const handleCloseChatbotSlider = useCallback(() => {
    toggleSidebar("default-chatbot-sidebar");
  }, []);

  return (
    <aside
      id="default-chatbot-sidebar"
      className="sidebar-container fixed flex flex-col top-0 left-0 p-4 w-full md:w-1/3 lg:w-1/6 opacity-100 h-screen -translate-x-full py-4 overflow-y-auto bg-base-200 transition-all duration-300 z-low-medium border-r"
      aria-label="Sidebar"
    >
      <div className="flex flex-col overflow-hidden gap-4 w-full">
        <div className="flex flex-row justify-between">
          <p className="text-xl font-semibold">Chatbots</p>
          <CloseIcon id="chatbot-slider-close-icon" className="block md:hidden" onClick={handleCloseChatbotSlider} />
        </div>
        {/* Input field for chatbot search */}
        <input
          id="chatbot-slider-search-input"
          type="text"
          placeholder="Search..."
          value={chatbotSearchQuery}
          onChange={handleChatbotSearchChange}
          className="border border-base-300 rounded p-2 w-full"
        />
        {/* Render filtered chatbot list */}
        <ul className="menu p-0 w-full  text-base-content">
          {filteredChatbotsList
            .slice() // Create a copy of the array to avoid mutating the original
            .sort((a, b) => a.title.localeCompare(b.title)) // Sort alphabetically based on title
            .map((item) => (
              <li key={item._id} className=" w-full">
                <a
                  id={`chatbot-slider-item-${item._id}`}
                  className={`${item._id == path[5] ? "active" : `${item.id}`} py-2 px-2 rounded-md`}
                  onClick={() => handleNavigation(item._id)}
                >
                  {item?.title}
                </a>
              </li>
            ))}
        </ul>
      </div>
    </aside>
  );
}

export default ChatBotSlider;
