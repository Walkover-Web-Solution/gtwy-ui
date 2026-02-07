import React, { useState, useEffect, useCallback } from "react";
import Canvas from "@/components/Canvas";
import { useDispatch } from "react-redux";
import { optimizePromptReducer } from "@/store/reducer/bridgeReducer";
import { optimizePromptApi } from "@/config/index";
import Protected from "./Protected";

const PromptHelper = ({
  isVisible,
  params,
  searchParams,
  onClose,
  setPrompt,
  messages,
  setMessages,
  thread_id,
  onResetThreadId,
  showCloseButton = false,
  autoCloseOnBlur,
  setHasUnsavedChanges,
  setNewContent,
  isEmbedUser,
  savePrompt,
}) => {
  const dispatch = useDispatch();
  const [optimizedPrompt, setOptimizedPrompt] = useState("");

  const handleOptimizePrompt = useCallback(
    async (instructionText) => {
      try {
        const response = await optimizePromptApi({
          query: instructionText,
          thread_id,
          bridge_id: params.id,
          version_id: searchParams.version,
        });

        const result = typeof response === "string" ? JSON.parse(response) : (response?.data ?? response);
        if (result?.updated) {
          setOptimizedPrompt(result.updated);
          dispatch(optimizePromptReducer({ bridgeId: params.id, prompt: result.updated }));
        }

        return result;
      } catch (error) {
        console.error("Error optimizing prompt:", error);
        return { description: "Failed to optimize prompt. Please try again." };
      }
    },
    [params.id, searchParams.version, thread_id]
  );

  // Apply optimized prompt and save immediately
  const handleApplyOptimizedPrompt = (promptToApply) => {
    const promptContent = promptToApply || optimizedPrompt;
    if (promptContent && setPrompt) {
      setPrompt(promptContent);
      setHasUnsavedChanges(true);
      setNewContent(promptContent);

      // Save the prompt immediately after applying
      if (savePrompt) {
        savePrompt(promptContent);
      }
    }
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
      id="prompt-helper-container"
      ref={modalRef}
      className=" z-very-high w-full bottom-2 bg-base-100 h-full rounded-l-md shadow-lg transition-all duration-300 ease-in-out z-30"
      onBlur={handleModalBlur}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-base-300 bg-base-50">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-base-content">Prompt Helper</h3>
        </div>

        {showCloseButton && (
          <button
            id="prompt-helper-close-button"
            onClick={onClose}
            className="btn btn-xs btn-error"
            title="Close Prompt Helper"
          >
            Close Helper
          </button>
        )}
      </div>

      {/* Content Area - Prompt Builder Only */}
      <div className="w-full h-full">
        <div className="p-3 h-full flex flex-col">
          {/* Prompt Builder layout */}
          <div className="flex flex-row h-full gap-2">
            {/* Canvas for chat interactions */}
            <div className="flex-1 mb-12 flex flex-col max-h-full">
              <Canvas
                OptimizePrompt={handleOptimizePrompt}
                messages={(() => {
                  return messages || [];
                })()}
                setMessages={(value) => {
                  setMessages(value);
                }}
                width="100%"
                height="100%"
                handleApplyOptimizedPrompt={handleApplyOptimizedPrompt}
                onResetThreadId={onResetThreadId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Protected(PromptHelper);
