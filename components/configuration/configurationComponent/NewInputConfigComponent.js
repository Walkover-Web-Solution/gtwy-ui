import OptimizePromptModal from "@/components/modals/OptimizePromptModal";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import { ChevronDown, Info, Maximize, Minimize } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import PromptSummaryModal from "../../modals/PromptSummaryModal";
import ToneDropdown from "./ToneDropdown";
import ResponseStyleDropdown from "./ResponseStyleDropdown"; // Import the new component
const NewInputConfigComponent = ({ params }) => {
  const { prompt } = useCustomSelector((state) => ({
    prompt: state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[params?.version]?.configuration?.prompt || "",
  }));
  const divRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dispatch = useDispatch();
  const [height, setHeight] = useState(500); // 96 * 4 = 384px (h-96 equivalent)
  const [isResizing, setIsResizing] = useState(false);
  const [messages, setMessages] = useState([]);

  const savePrompt = useCallback(
    (data) => {
      if (data !== prompt) {
        dispatch(
          updateBridgeVersionAction({ versionId: params.version, dataToSend: { configuration: { prompt: data } } })
        );
      }
    },
    [dispatch, params.version, prompt]
  );

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const handleScriptLoad = () => {
    if (typeof window.sendDataToDocstar === "function") {
      window.sendDataToDocstar({
        parentId: "docStar-embed",
        page_id: params.version,
        content: prompt,
      });
      // window.openTechDoc();
    } else {
      console.warn("sendDataToDocstar is not defined yet.");
    }
  };
  useEffect(() => {
    setTimeout(() => {
      handleScriptLoad();
    }, 100);
  }, [prompt, params]);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.origin === "https://app.docstar.io" && event?.data?.type === "editor_data") {
        savePrompt(event?.data?.data);
      }
    });
  });

  const handleMouseDown = useCallback(
    (e) => {
      setIsResizing(true);
      const startY = e.clientY;
      const startHeight = height;

      const handleMouseMove = (e) => {
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(500, Math.min(1000, startHeight + deltaY)); // Min 200px, Max 800px
        setHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [height]
  );

  return (
    <div id="prompt-config-container">
      <div className="flex justify-between items-center">
        <div className="label flex items-center gap-2">
          <span className="label-text capitalize font-medium">Prompt</span>
          <div className="h-4 w-px bg-gray-300 mx-2"></div>
          <div className="flex items-center justify-center">
            <button
              id="prompt-summary-button"
              className="label-text capitalize font-medium bg-gradient-to-r from-blue-800 to-orange-600 text-transparent bg-clip-text"
              onClick={() => {
                openModal(MODAL_TYPE?.PROMPT_SUMMARY);
              }}
            >
              <span>Prompt Summary</span>
            </button>
            <div
              className="tooltip tooltip-right"
              data-tip={"Prompt summary is only for the agent not for the Versions"}
            >
              <Info size={12} className="ml-2" />
            </div>
          </div>
        </div>
        <div className="flex gap-4 ">
          <div
            id="optimize-prompt-button"
            className="label cursor-pointer"
            onClick={() => openModal(MODAL_TYPE.OPTIMIZE_PROMPT)}
          >
            <span className="label-text capitalize font-medium bg-gradient-to-r from-blue-800 to-orange-600 text-transparent bg-clip-text">
              Optimize Prompt
            </span>
          </div>
        </div>
      </div>
      <div className="form-control">
        <div
          id="prompt-editor-container"
          ref={divRef}
          className={`relative transition-all duration-300 min-h-[500px] border border-base-300 rounded-r-lg rounded-l-lg rounded-t-md ${
            isFullscreen ? "fixed inset-0 w-full h-screen z-low" : "w-full"
          }`}
          style={!isFullscreen ? { height: `${height}px` } : {}}
        >
          <div id="docStar-embed" className="w-full h-full" />

          <div className="absolute top-4 right-4 z-low-medium group">
            <button
              id="prompt-fullscreen-toggle"
              onClick={toggleFullscreen}
              className="text-base-content bg-base-300 p-2 rounded-full transition hover:bg-base-200"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>

            <span className="absolute -top-8 right-1 scale-0 group-hover:scale-100 bg-gray-800 text-base-content text-xs px-2 py-1 rounded transition-transform duration-200">
              {isFullscreen ? "Minimize" : "Maximize"}
            </span>
          </div>

          {!isFullscreen && (
            <div
              id="prompt-resize-handle"
              className={`absolute bottom-0 left-0 right-0 h-3 cursor-row-resize flex items-center justify-center group hover:bg-gray-100 transition-colors ${
                isResizing ? "bg-gray-200" : ""
              }`}
              onMouseDown={handleMouseDown}
            >
              <div className="w-8 h-1 bg-base-300 rounded-full group-hover:bg-base-200 transition-colors"></div>
            </div>
          )}
        </div>
        <div
          id="default-variables-collapse"
          className="collapse bg-gradient-to-r from-yellow-50 to-orange-50 border-t-0 border border-base-300 rounded-t-none mr-2"
        >
          <input id="default-variables-toggle" type="checkbox" className="min-h-[0.75rem]" />
          <div className="collapse-title min-h-[0.75rem] text-xs font-medium flex items-center gap-1 p-2">
            <div className="flex items-center gap-2">
              <span className="text-nowrap">Default Variables</span>
              <p role="alert" className="label-text-alt alert p-2">
                <Info size={16} className="" />
                Use these variables in prompt to get their functionality
              </p>
            </div>
            <div className="ml-auto">
              <ChevronDown className="collapse-arrow" size={12} />
            </div>
          </div>
          <div className="collapse-content">
            <div className="text-xs">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-yellow-500 rounded-full"></span>
                  <span className="">&#123;&#123;current_time_date_and_current_identifier&#125;&#125;</span>
                  <span className=" ml-2">- To access the current date and time</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-yellow-500 rounded-full"></span>
                  <span className="">&#123;&#123;pre_function&#125;&#125;</span>
                  <span className="">- Use this variable if you are using the pre_function</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-yellow-500 rounded-full"></span>
                  <span className="">&#123;&#123;timezone&#125;&#125;</span>
                  <span className="">- Access the timezone using a timezone identifier</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isResizing && <div className="fixed inset-0 z-low-medium cursor-row-resize" />}
      </div>
      <div className="flex mt-2">
        <ToneDropdown params={params} />
        <ResponseStyleDropdown params={params} />
      </div>
      {/* <CreateVariableModal keyName={keyName} setKeyName={setKeyName} params={params} /> */}
      <OptimizePromptModal
        params={params}
        messages={messages}
        setMessages={setMessages}
        savePrompt={savePrompt}
        setPrompt={prompt}
      />
      <PromptSummaryModal params={params} />
    </div>
  );
};

export default NewInputConfigComponent;
