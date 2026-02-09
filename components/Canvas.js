import { SendHorizontalIcon, CopyIcon as CopyIconComponent, CheckIcon as CheckIconComponent } from "@/components/Icons";
import { Lightbulb, MousePointerClick, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import CodeBlock from "./codeBlock/CodeBlock";

function Canvas({
  OptimizePrompt,
  width = "100%",
  height = "100%",
  messages,
  setMessages,
  handleApplyOptimizedPrompt = () => {},
  label = "prompt",
  onResetThreadId = () => {},
}) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedMessages, setAppliedMessages] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [messages]);

  const handleResetChat = () => {
    setMessages([]);
    setInstruction("");
    setAppliedMessages("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    // Notify parent to reset thread id used by backend session
    onResetThreadId();
  };

  const handleApply = (message) => {
    // Call the apply function with the optimized content
    if (typeof handleApplyOptimizedPrompt === "function") {
      handleApplyOptimizedPrompt(message.optimized);
    }
    setAppliedMessages(message.id);
  };

  // Helper function to check if content is JSON and format it
  const formatMessageContent = (content) => {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      // If successful, return formatted JSON with proper indentation
      return {
        isJson: true,
        formatted: JSON.stringify(parsed, null, 2),
      };
    } catch {
      // If not JSON, return original content
      return {
        isJson: false,
        formatted: content,
      };
    }
  };

  const handleCopy = (messageId, content) => {
    let textToCopy = content || "";

    // If content is an object, stringify it
    if (typeof content === "object" && content !== null) {
      try {
        textToCopy = JSON.stringify(content, null, 2);
      } catch {
        textToCopy = String(content);
      }
    }

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopiedMessageId(messageId);
        setTimeout(() => {
          setCopiedMessageId(null);
        }, 2000);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const handleSend = async () => {
    if (!instruction.trim()) {
      setErrorMessage("Please enter an instruction.");
      return;
    }

    const userMessage = {
      id: Date.now(),
      sender: "user",
      content: instruction,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => {
      return [...prev, userMessage];
    });
    setInstruction("");
    setErrorMessage("");
    setLoading(true);
    try {
      const response = await OptimizePrompt(instruction);
      let result;
      if (label === "Schema") {
        result = typeof response.result === "string" ? JSON.parse(response.result) : response.result;
      } else if (label === "prompt") {
        result = typeof response === "string" ? JSON.parse(response) : response;
      }
      // Ensure content is always a string
      let contentString = "";
      if (result && result.updated !== undefined) {
        contentString = typeof result.updated === "string" ? result.updated : JSON.stringify(result.updated, null, 2); // Format JSON with indentation
      } else {
        contentString = "No content returned from optimization.";
      }

      const assistantMessage = {
        id: Date.now() + 1,
        sender: "assistant",
        content: contentString,
        optimized: result.updated, // Keep the original format for functionality
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => {
        return [...prev, assistantMessage];
      });
    } catch (err) {
      console.error("OptimizePrompt call failed", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "assistant",
          content: "Please enter a prompt first",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
    setLoading(false);
  };

  return (
    <div id="canvas-container" style={{ width, height }} className="flex flex-col bg-base-100">
      {/* Header with Reset Button */}
      <div className="flex  items-center pb-1 mb-1 pl-2" style={{ justifyContent: "flex-end" }}>
        {messages?.length > 0 && (
          <button
            id="canvas-reset-chat-button"
            className="btn btn-sm  btn-outline btn-error hover:btn-error"
            onMouseDown={handleResetChat}
          >
            <RotateCcw size={14} />
            Reset Chat
          </button>
        )}
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col bg-base-100 shadow-sm overflow-hidden">
        {/* Messages Area */}
        <div id="messages" className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 space-y-4">
          {safeMessages.length === 0 && !loading && (
            <div
              id="canvas-empty-state"
              className="flex flex-col items-center justify-center h-full text-center opacity-60"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lightbulb />
              </div>
              <p className="text-base-content/70">Start a conversation to optimize your {label}</p>
            </div>
          )}

          {safeMessages.map((message, index) => {
            const { isJson, formatted } = formatMessageContent(message.content);

            return (
              <div
                key={message.id || index}
                ref={index === safeMessages.length - 1 ? messagesEndRef : null}
                className={`chat group ${message.sender === "user" ? "chat-end" : "chat-start"}`}
              >
                {/* Chat Header with Apply Button */}
                <div
                  className={`chat-header flex ${message.sender === "user" ? "justify-end" : "justify-between"} w-full items-center mb-1`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{message.sender}</span>
                    <time className="text-xs opacity-50">{message.time}</time>
                  </div>
                </div>

                {/* Chat Bubble */}
                <div className="chat-bubble text-sm leading-relaxed max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl break-words">
                  {isJson ? (
                    <pre className="whitespace-pre-wrap text-base-content font-mono text-xs bg-base-200 p-3 rounded-lg overflow-x-auto">
                      <CodeBlock>{formatted}</CodeBlock>
                    </pre>
                  ) : (
                    <Markdown
                      className="prose prose-sm max-w-none"
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        code: ({ children }) => (
                          <code className="bg-base-200 px-1 py-0.5 rounded text-xs">{children}</code>
                        ),
                      }}
                    >
                      {message.content}
                    </Markdown>
                  )}

                  {/* Action Buttons - Inside chat bubble */}
                  {message.sender === "assistant" && message.optimized && (
                    <div className="mt-4 flex justify-start">
                      <div className="flex items-center gap-2">
                        {appliedMessages === message.id ? (
                          <div className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                            <CheckIconComponent size={14} />
                            Applied
                          </div>
                        ) : (
                          <button
                            id={`canvas-apply-button-${message.id}`}
                            className="btn btn-sm btn-primary gap-1 hover:btn-primary-focus transition-all duration-200 shadow-sm"
                            onClick={() => handleApply(message)}
                          >
                            <MousePointerClick size={14} />
                            <span className="hidden sm:inline">Apply</span>
                          </button>
                        )}

                        {copiedMessageId === message.id ? (
                          <div className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                            <CheckIconComponent size={14} />
                            Copied
                          </div>
                        ) : (
                          <button
                            id={`canvas-copy-button-${message.id}`}
                            className="btn btn-sm btn-primary gap-1 hover:btn-primary-focus transition-all duration-200 shadow-sm"
                            onClick={() => handleCopy(message.id, message.optimized)}
                          >
                            <CopyIconComponent size={14} />
                            <span className="hidden sm:inline">Copy</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {message.sender === "assistant" && message.optimized && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                )}
              </div>
            );
          })}

          {/* Loading State */}
          {loading && (
            <div id="canvas-loading-state" className="chat chat-start">
              <div className="chat-header mb-1">
                <span className="text-sm font-medium">assistant</span>
                <time className="text-xs opacity-50 pl-2">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
              <div className="chat-bubble flex justify-center items-center min-h-[3rem]">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-.3s]"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-.5s]"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-1">
          <div className="flex gap-3 items-center max-w-4xl mx-auto justify-center">
            <div className="flex-1 relative mt-1">
              <textarea
                id="canvas-instruction-textarea"
                ref={textareaRef}
                className="w-full textarea textarea-bordered"
                placeholder={` how you'd like to improve your ${label}...`}
                value={instruction}
                rows={1}
                onChange={(e) => {
                  setInstruction(e.target.value);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = "auto";
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    if (e.shiftKey) {
                      return;
                    } else {
                      e.preventDefault();
                      handleSend();
                    }
                  }
                }}
              />
              {/* Character counter or typing indicator could go here */}
            </div>

            <button
              id="canvas-send-button"
              className={`btn btn-circle transition-all duration-200 ${
                loading
                  ? "btn-disabled"
                  : "btn-primary hover:btn-primary-focus hover:scale-105 shadow-lg hover:shadow-xl"
              }`}
              disabled={loading || !instruction.trim()}
              onClick={handleSend}
            >
              {loading ? <span className="loading loading-dots loading-md"></span> : <SendHorizontalIcon size={18} />}
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              id="canvas-error-message"
              className="max-w-4xl mx-auto mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-red-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm text-red-700">{errorMessage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Canvas;
