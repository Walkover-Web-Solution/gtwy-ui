import { closeModal, createDiff, simulateStreaming } from "@/utils/utility";
import { CopyIcon, RedoIcon, UndoIcon } from "@/components/Icons";
import React, { useEffect, useState, useMemo } from "react";
import ComparisonCheck from "@/utils/comparisonCheck";
import Canvas from "../Canvas";
import Modal from "../UI/Modal";
import { Sparkles } from "lucide-react";

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
    <Modal
      MODAL_ID={modalType}
      onClose={handleCloseModal}
      title={title}
      description={`AI-powered ${contentLabel.toLowerCase()} optimization`}
      icon={<Sparkles size={16} className="text-trace-gold" />}
      widthClass="w-[min(96vw,1400px)]"
    >
      <div
        id="optimise-base-modal-container"
        data-testid="optimise-base-modal-container"
        className="flex flex-col"
        style={{ height: "calc(100dvh - 14rem)", minHeight: "400px" }}
      >
        {/* Toggle Header */}
        <div className="flex justify-end items-center pb-3">
          <button
            id="optimise-toggle-diff-button"
            data-testid="optimise-toggle-diff-button"
            className="btn btn-sm btn-primary"
            onClick={() => setDiff((prev) => !prev)}
            type="button"
          >
            {diff ? "Instructions" : "Show Diff"}
          </button>
        </div>

        <div className={`flex flex-1 ${diff ? "overflow-auto" : "overflow-hidden"} gap-3 w-full`}>
          <div className="w-full h-full">
            {!diff ? (
              <div className="flex-1 h-full flex flex-col">
                <Canvas
                  OptimizePrompt={handleOptimize}
                  messages={messages}
                  setMessages={setMessages}
                  apiError={!!errorMessage}
                />
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
                  <span className="capitalize font-medium text-primary">
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
                  data-testid="optimise-content-textarea"
                  className="textarea bg-base-100 border focus:border-primary caret-base-content p-2 w-full resize-none flex-grow min-h-[60vh]"
                  value={textareaContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  readOnly={isStreaming}
                  {...textareaProps}
                />
                {isStreaming && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-base-100 px-2 py-1 shadow-sm border border-base-300">
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

        {/* Footer */}
        <div className="border-t border-base-content/10 pt-3 mt-3 flex justify-end gap-3">
          <button
            id="optimise-close-button"
            data-testid="optimise-close-button"
            onClick={handleCloseModal}
            className="btn btn-sm"
            disabled={isStreaming}
            type="button"
          >
            Close
          </button>
          <button
            id="optimise-apply-button"
            data-testid="optimise-apply-button"
            onClick={handleApply}
            className="btn btn-sm btn-primary"
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
