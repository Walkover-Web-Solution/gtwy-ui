import { closeModal, createDiff, simulateStreaming } from "@/utils/utility";
import { CopyIcon, RedoIcon, UndoIcon } from "@/components/Icons";
import React, { useEffect, useState, useMemo } from "react";
import ComparisonCheck from "@/utils/comparisonCheck";
import Canvas from "../Canvas";
import Modal from "../UI/Modal";

function OptimiseBaseModal({
  modalType,
  title,
  contentLabel,
  content,
  optimizeApi,
  onApply,
  onClose,
  params,
  searchParams,
  messages,
  setMessages,
  showHistory = false,
  history = [],
  setCurrentIndex = () => {},
  currentIndex = 0,
  onUndo,
  onRedo,
  additionalValidation,
  errorMessage = "",
  setErrorMessage = () => {},
  textareaProps = {},
}) {
  const [diff, setDiff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newContent, setNewContent] = useState(content);
  const [copyText, setCopyText] = useState(`Copy ${contentLabel}`);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");

  useEffect(() => {
    setStreamedContent("");
    setIsStreaming(false);
    setNewContent(content);
  }, [content]);

  useEffect(() => {
    if (history?.length > 0 && history[currentIndex]) {
      setNewContent(history[currentIndex]);
    }
  }, [currentIndex, history]);

  const diffData = useMemo(() => {
    const displayContent = isStreaming ? streamedContent : newContent;
    if (!displayContent) return [];
    return createDiff(content, displayContent);
  }, [content, newContent, streamedContent, isStreaming]);

  const handleOptimize = async (instructionText) => {
    setLoading(true);
    setStreamedContent("");
    setErrorMessage("");

    try {
      const result = await optimizeApi(instructionText, params, searchParams);
      setLoading(false);
      const updatedContent =
        typeof result?.updated === "object" ? JSON.stringify(result?.updated, undefined, 4) : result?.updated;
      simulateStreaming(updatedContent, setStreamedContent, setIsStreaming, () => {
        setNewContent(updatedContent);
      });
      setCurrentIndex(history.length);

      return result;
    } catch {
      setLoading(false);
      setErrorMessage("Failed to optimize content.");
      return null;
    }
  };

  const handleCloseModal = () => {
    setErrorMessage("");
    setNewContent("");
    setStreamedContent("");
    setIsStreaming(false);
    setDiff(false);
    onClose?.();
    closeModal(modalType);
  };

  const handleApply = async () => {
    const contentToApply = isStreaming ? streamedContent : newContent;
    if (!contentToApply) return;

    try {
      setLoading(true);
      await onApply(contentToApply);
      handleCloseModal();
    } catch {
      setErrorMessage("Failed to apply changes.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = isStreaming ? streamedContent : newContent;
    setCopyText("Copied!");
    setTimeout(() => setCopyText(`Copy ${contentLabel}`), 2000);
    navigator.clipboard.writeText(textToCopy);
  };

  const handleContentChange = (value) => {
    if (!isStreaming) {
      setNewContent(value);
      if (additionalValidation) {
        additionalValidation(value, setErrorMessage);
      }
    }
  };

  const displayContent = isStreaming ? streamedContent : newContent;

  // Fixed: Use consistent logic for textarea content
  const getTextareaContent = () => {
    if (isStreaming) {
      return streamedContent;
    }
    if (newContent) {
      return newContent;
    }
    if (showHistory && history.length > 0 && currentIndex < history.length) {
      return history[currentIndex];
    }
    return content;
  };

  const textareaContent = getTextareaContent();

  return (
    <Modal MODAL_ID={modalType} onClose={handleCloseModal}>
      <div
        id="optimise-base-modal-container"
        className="modal-box max-w-screen-xl w-[calc(100%-8rem)] mx-auto bg-base-100 overflow-hidden flex flex-col"
      >
        {/* Fixed Header */}
        <div className="flex justify-between items-center pb-2 pt-2 bg-base-100 z-low">
          <h3 className="font-bold text-lg">{title}</h3>
          <button
            id="optimise-toggle-diff-button"
            className="btn btn-sm btn-primary"
            onClick={() => setDiff((prev) => !prev)}
            type="button"
          >
            {diff ? "Instructions" : "Show Diff"}
          </button>
        </div>

        <div className={`flex h-full ${diff ? "overflow-auto" : "overflow-hidden"} gap-3 w-full max-h-[700px]`}>
          <div className="w-full h-full">
            {!diff ? (
              <div className="flex-1 h-full flex flex-col">
                <Canvas OptimizePrompt={handleOptimize} messages={messages} setMessages={setMessages} />
                {errorMessage && (
                  <div className="mt-2">
                    <span className="text-red-500">{errorMessage}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <ComparisonCheck
                  diffData={diffData}
                  isStreaming={isStreaming}
                  handleUndo={showHistory ? onUndo : undefined}
                  handleRedo={showHistory ? onRedo : undefined}
                  copyToClipboard={copyToClipboard}
                  copyText={copyText}
                  currentIndex={currentIndex}
                  promptHistory={history}
                  displayPrompt={displayContent}
                  errorMessage={errorMessage}
                  key={contentLabel.toLowerCase()}
                />
              </div>
            )}
          </div>

          {!diff && (
            <div className="w-full h-full pt-3 overflow-auto">
              <div className="flex justify-between">
                <div className="label">
                  <span className="label-text capitalize font-medium bg-gradient-to-r from-blue-800 to-orange-600 text-transparent bg-clip-text">
                    AI generated {contentLabel.toLowerCase()}
                    {isStreaming && (
                      <span className="ml-2 text-sm text-base-content animate-pulse">✨ Generating...</span>
                    )}
                  </span>
                </div>
                <div className="label gap-2">
                  {showHistory && (
                    <>
                      <div className="tooltip cursor-pointer" data-tip={`Previous ${contentLabel}`}>
                        <UndoIcon
                          onClick={onUndo}
                          className={`${!currentIndex || isStreaming ? "opacity-50 pointer-events-none" : "hover:text-blue-600"}`}
                        />
                      </div>
                      <div className="tooltip tooltip-left cursor-pointer" data-tip={`Next ${contentLabel}`}>
                        <RedoIcon
                          onClick={onRedo}
                          className={`${currentIndex >= history.length || isStreaming ? "opacity-50 pointer-events-none" : "hover:text-blue-600"}`}
                        />
                      </div>
                    </>
                  )}
                  <div className="tooltip tooltip-left cursor-pointer" data-tip={copyText}>
                    <CopyIcon
                      onClick={copyToClipboard}
                      size={20}
                      className={`${!displayContent || isStreaming ? "opacity-50 pointer-events-none" : "hover:text-blue-600"}`}
                    />
                  </div>
                </div>
              </div>
              <div className="relative">
                <textarea
                  id="optimise-content-textarea"
                  className="textarea bg-white dark:bg-black/15 textarea-bordered border focus:border-primary caret-base-content p-2 w-full resize-none flex-grow min-h-[60vh]"
                  value={textareaContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  readOnly={isStreaming}
                  {...textareaProps}
                />
                {isStreaming && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-base-100 px-2 py-1 rounded-md shadow-sm border border-base-300">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">Streaming</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-base-content/20 mb-2 bg-base-100 pt-1 flex justify-end gap-3">
          <button
            id="optimise-close-button"
            onClick={handleCloseModal}
            className="btn btn-sm mt-2"
            disabled={isStreaming}
            type="button"
          >
            Close
          </button>
          <button
            id="optimise-apply-button"
            onClick={handleApply}
            className="btn btn-sm btn-primary mt-2"
            disabled={loading || isStreaming || !displayContent}
            type="button"
          >
            {(loading || isStreaming) && <span className="loading loading-spinner loading-sm mr-2"></span>}
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default React.memo(OptimiseBaseModal);
