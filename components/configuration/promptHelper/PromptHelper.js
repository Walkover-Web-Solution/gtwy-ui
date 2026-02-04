import React, { useState, useEffect, useCallback } from "react";
import { BookIcon, BrainIcon, CloseIcon } from "../../Icons";
import { usePathname } from "next/navigation";
import Canvas from "@/components/Canvas";
import { useDispatch } from "react-redux";
import { optimizePromptReducer } from "@/store/reducer/bridgeReducer";
import { optimizePromptApi } from "@/config/index";

const PromptHelper = ({
  isVisible,
  params,
  onClose,
  savePrompt,
  setPrompt,
  messages: initialMessages = [],
  setMessages: setParentMessages,
  thread_id,
  autoCloseOnBlur,
}) => {
  const dispatch = useDispatch();
  const [focusedSection, setFocusedSection] = useState(null); // 'notes', 'promptBuilder', or null for 50/50
  const [optimizedPrompt, setOptimizedPrompt] = useState("");
  const [messages, setMessages] = useState(initialMessages);

  const pathname = usePathname();
  const pathParts = pathname.split("?")[0].split("/");
  const bridgeId = pathParts[5];

  // Extract parameters from URL if not provided
  const promptParams = params || {
    id: bridgeId || pathParts[3],
    version: pathParts[7] || pathParts[5],
  };

  // Update parent messages when local messages change
  useEffect(() => {
    if (setParentMessages) {
      setParentMessages(messages);
    }
  }, [messages, setParentMessages]);

  // Handle optimize prompt function for Canvas component
  const handleOptimizePrompt = useCallback(
    async (instructionText) => {
      try {
        const response = await optimizePromptApi({
          query: instructionText,
          thread_id,
          bridge_id: promptParams.id,
          version_id: promptParams.version,
        });

        const result = typeof response === "string" ? JSON.parse(response) : (response?.data ?? response);

        // Store the optimized prompt
        if (result?.updated) {
          setOptimizedPrompt(result.updated);
          localStorage.setItem(`optimized_prompt_${promptParams.id}_${promptParams.version}`, result.updated);
          dispatch(optimizePromptReducer({ bridgeId: promptParams.id, prompt: result.updated }));
        }

        return result;
      } catch (error) {
        console.error("Error optimizing prompt:", error);
        return { description: "Failed to optimize prompt. Please try again." };
      }
    },
    [promptParams, thread_id, dispatch]
  );

  // Apply optimized prompt
  const handleApplyOptimizedPrompt = () => {
    if (optimizedPrompt && setPrompt) {
      setPrompt(optimizedPrompt);
      if (savePrompt) {
        savePrompt(optimizedPrompt);
      }
    }
  };

  const handleScriptLoad = () => {
    if (typeof window.sendDataToDocstar === "function") {
      window.sendDataToDocstar({
        parentId: "notes-embed",
        page_id: bridgeId,
      });
      window.openTechDoc();
    } else {
      console.warn("sendDataToDocstar is not defined yet.");
    }
  };

  useEffect(() => {
    handleScriptLoad();
  }, [isVisible]);

  // Load optimized prompt from localStorage on component mount
  useEffect(() => {
    if (promptParams?.id && promptParams?.version) {
      const savedPrompt = localStorage.getItem(`optimized_prompt_${promptParams.id}_${promptParams.version}`);
      if (savedPrompt) {
        setOptimizedPrompt(savedPrompt);
      }
    }

    // Add event listener for localStorage changes from other components
    const handleStorageChange = (e) => {
      if (
        promptParams?.id &&
        promptParams?.version &&
        e.key === `optimized_prompt_${promptParams.id}_${promptParams.version}`
      ) {
        setOptimizedPrompt(e.newValue || "");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [promptParams?.id, promptParams?.version]);

  // Calculate heights based on focus
  const getNotesHeight = () => {
    if (focusedSection === "notes") return "h-3/4"; // 75% when focused
    if (focusedSection === "promptBuilder") return "h-1/4"; // 25% when prompt builder is focused
    return "h-1/2"; // 50% when nothing is focused (default state)
  };

  const getPromptBuilderHeight = () => {
    if (focusedSection === "promptBuilder") return "h-3/4";
    if (focusedSection === "notes") return "h-1/4";
    return "h-1/2";
  };

  const modalRef = React.createRef();

  useEffect(() => {
    if (!autoCloseOnBlur) return;

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        const isBackdrop = event.target.classList.contains("modal-backdrop") || event.target.closest(".modal-backdrop");

        if (isBackdrop) {
          onClose();
        }
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [autoCloseOnBlur, onClose]);

  // Handle modal blur
  const handleModalBlur = (e) => {
    // Only trigger if we're not focusing something inside the modal
    if (autoCloseOnBlur && modalRef.current && !modalRef.current.contains(document.activeElement)) {
      // Small delay to ensure we're not closing during normal navigation within the modal
      setTimeout(() => {
        if (!modalRef.current.contains(document.activeElement)) {
          onClose();
        }
      }, 100);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={modalRef}
      className="fixed right-0 top-20 w-1/2 bottom-2 bg-base-100 border h-full rounded-l-md shadow-lg transition-all duration-300 ease-in-out z-50"
      onBlur={handleModalBlur}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-1 border-b bg-gray-50">
        <h3 className="font-medium">Prompt Helper</h3>
        <button className="p-1 rounded-full hover:text-error transition-colors z-10" onClick={() => onClose("prompt")}>
          <CloseIcon />
        </button>
      </div>

      {/* Content Area - Split into two sections */}
      <div className="flex flex-col h-[calc(100vh-60px)]">
        {/* Notes Section */}
        <div className={`${getNotesHeight()} transition-all duration-300 ease-in-out border-b mt-2`}>
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <BookIcon size={14} />
              <span className="text-sm font-medium">Notes</span>
            </div>
          </div>
          <div
            className="p-3 h-[calc(100vh-60px)]"
            onFocus={() => setFocusedSection("notes")}
            onBlur={() => setFocusedSection(null)}
            tabIndex={0}
          >
            <div id="notes-embed" className="w-full h-full">
              {/* This will be populated by the docstar script */}
            </div>
          </div>
        </div>

        {/* Prompt Builder Section */}
        <div className={`${getPromptBuilderHeight()} transition-all duration-300 ease-in-out`}>
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <BrainIcon size={14} />
              <span className="text-sm font-medium">Prompt Builder</span>
            </div>
          </div>
          <div
            className="p-3 h-[calc(100vh-60px)] flex flex-col"
            onFocus={() => setFocusedSection("promptBuilder")}
            onBlur={() => setFocusedSection(null)}
            tabIndex={0}
          >
            {/* Prompt Builder layout - side by side */}
            <div className="flex flex-row h-full gap-3 ">
              {/* Canvas for chat interactions */}
              <div className="flex-1 flex flex-col">
                <Canvas
                  OptimizePrompt={handleOptimizePrompt}
                  messages={messages}
                  setMessages={setMessages}
                  width="100%"
                  style={{
                    minHeight: "300px",
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: "120px",
                  }}
                />
              </div>

              {/* Optimized prompt section */}
              <div className="w-2/5 border rounded-md bg-gray-50 flex flex-col">
                <div className="p-2 border-b">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">Current Optimized Prompt</span>
                    <button
                      onClick={handleApplyOptimizedPrompt}
                      disabled={!optimizedPrompt}
                      className={`btn btn-sm ${optimizedPrompt ? "btn-primary" : "btn-disabled"}`}
                    >
                      Apply
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-2 bg-white rounded overflow-y-auto text-xs">
                  {optimizedPrompt ||
                    "No optimized prompt available yet. Enter instructions above to optimize your prompt."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptHelper;
