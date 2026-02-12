"use client";
import MainLayout from "@/components/layoutComponents/MainLayout";
import PageHeader from "@/components/Pageheader";
import { useCustomSelector } from "@/customHooks/customSelector";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, closeModal, formatRelativeTime } from "@/utils/utility";
import { PlayIcon, Plus, Sparkles, X, SendHorizontal, Send } from "lucide-react";
import React, { useEffect, useState, use, useRef } from "react";
import SearchItems from "@/components/UI/SearchItems";
import TemplatePlayground from "@/components/modals/TemplatePlayground";
import SaveWidgetModal from "@/components/modals/SaveWidgetModal";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { generateRichUITemplate, createRichUiTemplateApi } from "@/config/utilityApi";
import ReactMarkdown from "@/components/LazyMarkdown";
import CodeBlock from "@/components/codeBlock/CodeBlock";

export const runtime = "edge";

const TemplatesPage = ({ params }) => {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const createParam = searchParams.get("create");

  const { widgetsData } = useCustomSelector((state) => ({
    widgetsData: state?.richUiTemplateReducer?.templates || [],
  }));

  // State for Navigation/View Mode
  // Modes: 'list' | 'create_prompt'
  const [viewMode, setViewMode] = useState("list");

  // Data States
  const [filterWidgets, setFilterWidgets] = useState(widgetsData || []);
  const [playgroundWidget, setPlaygroundWidget] = useState(null);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [savingMessageId, setSavingMessageId] = useState(null);
  const [savedMessageIds, setSavedMessageIds] = useState(new Set());
  const [widgetToSave, setWidgetToSave] = useState(null);
  const [widgetName, setWidgetName] = useState("");
  const [widgetDescription, setWidgetDescription] = useState("");

  useEffect(() => {
    setFilterWidgets(widgetsData || []);
  }, [widgetsData]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle URL params for direct access to create mode
  useEffect(() => {
    if (createParam === "true") {
      setViewMode("create_prompt");
    } else {
      // Only reset to list if we were in create_prompt mode to allow internal navigation changes
      // without fighting URL. But usually we want URL to drive this or sync.
      // For simplicity, let's treat URL as entry point only for now, or primary driver.
      // If we want full sync:
      if (viewMode === "create_prompt") {
        setViewMode("list");
      }
    }
  }, [createParam]);

  // --- Actions ---

  const handleOpenPlayground = (item) => {
    const originalItem = widgetsData.find((widget) => widget._id === item._id);
    setPlaygroundWidget(originalItem);
    openModal(MODAL_TYPE?.TEMPLATE_PLAYGROUND);
  };

  const handleCreateNew = () => {
    router.push(`?create=true`);
    setViewMode("create_prompt");
  };

  const handleBackToList = () => {
    router.replace(`/org/${resolvedParams.org_id}/widgets`);
    setViewMode("list");
    setMessages([]);
    setCurrentInput("");
    setChatStarted(false);
    setIsAnimating(false);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    // Start animation if this is the first message
    if (!chatStarted) {
      setIsAnimating(true);
      setTimeout(() => {
        setChatStarted(true);
        setIsAnimating(false);
      }, 500); // Animation duration
    }

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: currentInput.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setIsGenerating(true);

    // Focus input after sending
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    try {
      // Call GTWY AI API for rich UI widget generation
      const data = await generateRichUITemplate({
        message: userMessage.content,
        context: "template_generation",
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: data.result || data.response || "Sorry, I could not generate a response.",
        html: data.html || null,
        template_format: data.result || data.card_json || null,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error calling AI API:", error);
      const errorMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: "Sorry, there was an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveFromChat = (message) => {
    if (!message.template_format && !message.html) {
      toast.error("No template data to save");
      return;
    }

    // Open modal to ask for name and description
    setWidgetToSave(message);
    setWidgetName("");
    setWidgetDescription("");
    openModal(MODAL_TYPE.SAVE_WIDGET_MODAL);
  };

  const handleConfirmSave = async () => {
    if (!widgetName.trim()) {
      toast.error("Please enter a widget name");
      return;
    }

    if (!widgetToSave) return;

    setSavingMessageId(widgetToSave.id);
    closeModal(MODAL_TYPE.SAVE_WIDGET_MODAL);

    const template_format = JSON.parse(widgetToSave.template_format) || {};

    try {
      const payload = {
        name: widgetName.trim(),
        description: widgetDescription.trim() || "AI generated widget",
        html: widgetToSave.html || "",
        template_format: template_format,
      };

      await createRichUiTemplateApi(payload);

      toast.success("Widget saved successfully!");
      setSavedMessageIds((prev) => new Set(prev).add(widgetToSave.id));
      setWidgetToSave(null);
      setWidgetName("");
      setWidgetDescription("");
    } catch (error) {
      console.error("Error saving widget:", error);
      toast.error("Failed to save widget: " + (error.message || "Unknown error"));
    } finally {
      setSavingMessageId(null);
    }
  };

  const handleCancelSave = () => {
    setWidgetToSave(null);
    setWidgetName("");
    setWidgetDescription("");
  };

  // --- RENDERERS ---

  return (
    <>
      {/* Modal - Always rendered so it's available in DOM */}
      <SaveWidgetModal
        widgetName={widgetName}
        widgetDescription={widgetDescription}
        onNameChange={setWidgetName}
        onDescriptionChange={setWidgetDescription}
        onSave={handleConfirmSave}
        onCancel={handleCancelSave}
      />

      {viewMode === "create_prompt" ? (
        <div className="w-full h-full overflow-y-auto flex flex-col relative animate-fade-in">
          <button onClick={handleBackToList} className="absolute top-4 left-4 btn btn-ghost btn-circle z-10">
            <X size={24} />
          </button>

          {/* Chat Started Layout */}
          {chatStarted ? (
            <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                  >
                    <div className={`max-w-[75%] ${message.type === "user" ? "ml-16" : "mr-16"}`}>
                      <div
                        className={`rounded-2xl px-5 py-4 shadow-sm ${
                          message.type === "user"
                            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-content"
                            : "bg-base-100 text-base-content border border-base-200"
                        }`}
                      >
                        {/* Show HTML Preview with Save button for assistant messages with HTML */}
                        {message.type === "assistant" && message.html ? (
                          <div>
                            <div className="text-sm font-medium text-base-content/80 mb-3">Widget Preview</div>
                            <div className="bg-base-200 rounded-lg p-4 border border-base-300 overflow-auto max-h-96 mb-4">
                              <div dangerouslySetInnerHTML={{ __html: message.html }} />
                            </div>
                            {!savedMessageIds.has(message.id) && (
                              <button
                                className="btn btn-sm w-full"
                                onClick={() => handleSaveFromChat(message)}
                                disabled={savingMessageId === message.id}
                              >
                                {savingMessageId === message.id ? (
                                  <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Saving...
                                  </>
                                ) : (
                                  "Save Widget"
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Show markdown for user messages or assistant messages without HTML */
                          <div className="leading-relaxed">
                            <ReactMarkdown
                              components={{
                                code: ({ node, inline, className, children, ...props }) => (
                                  <CodeBlock inline={inline} className={className} isDark={true} {...props}>
                                    {children}
                                  </CodeBlock>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}

                        <div
                          className={`text-xs mt-3 ${
                            message.type === "user" ? "text-primary-content/60" : "text-base-content/40"
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isGenerating && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="mr-16 max-w-[75%]">
                      <div className="bg-base-100 border border-base-200 rounded-2xl px-5 py-4 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                          <span className="text-sm text-base-content/60">Generating...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input - Fixed at bottom */}
              <div className="border-t border-base-300 bg-base-50/50 backdrop-blur-sm px-6 py-4">
                <div className="max-w-4xl mx-auto">
                  <div className="relative flex items-center w-full rounded-xl p-2 bg-base-300 backdrop-blur-sm transition-all ">
                    <div className="pr-3 text-base-content/50">
                      <Plus size={20} />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      className="input w-full outline-none border-none focus:outline-none focus:ring-0"
                      placeholder="Continue the conversation..."
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !isGenerating && currentInput.trim()) {
                          handleSendMessage();
                        }
                      }}
                      autoFocus
                    />
                    <button
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        currentInput.trim()
                          ? "text-base-content hover:opacity-80"
                          : "text-base-content/30 cursor-not-allowed"
                      }`}
                      onClick={handleSendMessage}
                      disabled={!currentInput.trim()}
                    >
                      <div className="transition-all duration-300 ease-in-out transform">
                        {currentInput.trim() ? (
                          <SendHorizontal className="animate-in fade-in zoom-in duration-200" />
                        ) : (
                          <Send className="animate-in fade-in zoom-in duration-200" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Initial Center Layout */
            <div
              className={`flex flex-col items-center justify-center h-full transition-all duration-700 ease-out ${
                isAnimating
                  ? "transform translate-y-full opacity-0 scale-95"
                  : "transform translate-y-0 opacity-100 scale-100"
              }`}
            >
              {isGenerating ? (
                <div className="flex flex-col items-center">
                  <div className="relative w-28 h-28 mb-8">
                    <div className="absolute inset-0 border-4 border-base-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto text-primary animate-pulse" size={36} />
                  </div>
                  <h3 className="text-2xl font-medium mb-3 text-base-content">Generating Widget...</h3>
                  <p className="text-base-content/60 max-w-md text-center text-lg leading-relaxed">
                    Interpreting your request and building the perfect widget structure for you.
                  </p>
                </div>
              ) : (
                <div className="text-center max-w-4xl mx-auto px-6">
                  <h2 className="text-4xl font-bold text-base-content mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    Create New Widget
                  </h2>
                  <p className="text-base-content/60 text-lg mb-12 leading-relaxed">
                    Describe your widget idea and I'll help you build it step by step
                  </p>

                  <div className="w-full relative">
                    <div className="relative flex items-center w-full rounded-xl p-2 bg-base-300 backdrop-blur-sm transition-all">
                      <div className="pr-3 text-base-content/50">
                        <Plus size={20} />
                      </div>
                      <input
                        type="text"
                        className="input w-full outline-none border-none focus:outline-none focus:ring-0"
                        placeholder="Describe your widget..."
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        autoFocus
                      />
                      <button
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          currentInput.trim()
                            ? "text-base-content hover:opacity-80"
                            : "text-base-content/30 cursor-not-allowed"
                        }`}
                        onClick={handleSendMessage}
                        disabled={!currentInput.trim()}
                      >
                        <div className="transition-all duration-300 ease-in-out transform">
                          {currentInput.trim() ? (
                            <SendHorizontal className="animate-in fade-in zoom-in duration-200" />
                          ) : (
                            <Send className="animate-in fade-in zoom-in duration-200" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full">
          <div className="px-2 pt-4">
            <MainLayout>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between w-full gap-2">
                <PageHeader title="Widgets" description="Create and manage reusable UI widgets for your agents." />
              </div>
            </MainLayout>

            <div className="flex flex-row gap-4">
              {filterWidgets?.length > 5 && (
                <SearchItems data={widgetsData || []} setFilterItems={setFilterWidgets} item="Widget" />
              )}
              <div className={`flex-shrink-0 ${filterWidgets?.length > 5 ? "mr-2" : "ml-2"}`}>
                <button className="btn btn-primary btn-sm" onClick={handleCreateNew}>
                  + Create Widget
                </button>
              </div>
            </div>
          </div>

          {filterWidgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
              {filterWidgets.map((widget) => (
                <div
                  key={widget._id}
                  className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow duration-200"
                >
                  {/* Widget Preview */}
                  <div className="h-32 bg-base-200 border-b border-base-300 relative overflow-hidden group">
                    {widget.html ? (
                      <div className="absolute inset-0 p-2 text-xs overflow-hidden">
                        <div
                          className="w-full h-full transform scale-75 origin-top-left"
                          dangerouslySetInnerHTML={{
                            __html: widget.html.replace(
                              /\{\{(\w+)\}\}/g,
                              '<span class="bg-warning px-1 rounded">$1</span>'
                            ),
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-base-content/60">
                        <div className="text-center">
                          <div className="text-2xl mb-1">📄</div>
                          <div className="text-xs">No Preview</div>
                        </div>
                      </div>
                    )}

                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenPlayground(widget)}
                        className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20"
                        title="Preview"
                      >
                        <PlayIcon size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Template Info */}
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="card-title text-base-content truncate flex-1 text-sm">
                        {widget.name || "Untitled Widget"}
                      </h3>
                    </div>

                    <p className="text-xs text-base-content/70 mb-3 line-clamp-2 min-h-[2.5em]">
                      {widget.description || "No description available"}
                    </p>

                    <div className="text-[10px] text-base-content/50 uppercase tracking-wider font-medium">
                      {formatRelativeTime(widget.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-gray-500 text-lg mb-2">No widgets found</p>
              <p className="text-gray-400 text-sm mb-6">Create your first widget to get started</p>
              <button className="btn btn-primary" onClick={handleCreateNew}>
                + Create Widget
              </button>
            </div>
          )}

          <TemplatePlayground template={playgroundWidget} setTemplate={setPlaygroundWidget} />
        </div>
      )}
    </>
  );
};

export default TemplatesPage;
