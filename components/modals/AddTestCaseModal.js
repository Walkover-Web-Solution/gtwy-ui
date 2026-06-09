import { useCustomSelector } from "@/customHooks/customSelector";
import { createTestCaseAction } from "@/store/action/testCasesAction";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { CloseIcon } from "@/components/Icons";
import { Trash2, ChevronDown as ChevronDownIcon } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Modal from "../UI/Modal";
import { clearChatTestCaseIdAction } from "@/store/action/chatAction";
import AutoResizeTextarea from "@/components/UI/AutoResizeTextarea";

function AddTestCaseModal({ testCaseConversation, setTestCaseConversation, channelIdentifier }) {
  const params = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const { mongoIdsOfTools } = useCustomSelector((state) => {
    const functionData = state.bridgeReducer.org?.[params.org_id]?.functionData;
    const mongoIds = functionData
      ? Object.values(functionData).reduce((acc, item) => {
          if (item?.script_id && item?._id) {
            acc[item.script_id] = item._id;
          }
          return acc;
        }, {})
      : {};

    return { mongoIdsOfTools: mongoIds };
  });
  // Process testCaseConversation - handle both array of messages and single object with AiConfig
  const processTestCaseData = () => {
    if (!testCaseConversation || testCaseConversation.length === 0) return [];

    const getContentText = (content) => {
      if (Array.isArray(content)) {
        return content?.[0]?.text ?? "";
      }
      if (typeof content === "object" && content !== null) {
        return JSON.stringify(content);
      }
      return typeof content === "string" ? content : String(content || "");
    };

    // If it's a single object with AiConfig, extract the conversation from AiConfig input/messages
    if (testCaseConversation.length === 1 && testCaseConversation[0]?.AiConfig) {
      const historyItem = testCaseConversation[0];
      const aiConfigInput = historyItem.AiConfig.input || historyItem.AiConfig.messages;

      if (!Array.isArray(aiConfigInput)) {
        return [];
      }

      const processedMessages = [];

      // Create conversation from AiConfig.input - only user and assistant messages
      aiConfigInput.forEach((msg) => {
        // Only include user, assistant, developer, and system messages
        if (msg.role === "user" || msg.role === "assistant") {
          processedMessages.push({
            role: msg.role,
            content: getContentText(msg.content),
          });
        }
        // Skip function calls, reasoning, and other metadata
      });

      // Add the expected response from LLM as the final message
      // This will be treated as the expected response for the test case
      const expectedResponse =
        historyItem.llm_message || historyItem.chatbot_message || historyItem.updated_llm_message;
      if (expectedResponse) {
        processedMessages.push({
          role: "assistant",
          content: expectedResponse,
          isExpectedResponse: true, // Mark this as the expected response
        });
      }

      return processedMessages;
    }

    // Handle regular conversation array format
    return testCaseConversation
      .map((message) => {
        if (message.role === "user" || message.sender === "user") {
          return {
            role: message.role || message.sender,
            content: getContentText(message.content),
          };
        } else if ((message.role === "assistant" || message.sender === "assistant") && message.content) {
          return {
            role: message.role || message.sender,
            content: getContentText(message.content),
          };
        } else if (message.role === "tools_call" || message.sender === "tools_call") {
          const toolCallData = message.tools_call_data;

          const tools = [];

          if (toolCallData && typeof toolCallData === "object") {
            for (const [toolName, toolDetails] of Object.entries(toolCallData)) {
              tools.push({
                name: toolName,
                id: mongoIdsOfTools[toolDetails?.id],
                arguments: toolDetails?.args,
              });
            }
          }

          return {
            role: message?.role || message?.sender,
            tools,
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const initialTestCases = processTestCaseData();

  const [finalTestCases, setFinalTestCases] = useState(initialTestCases);
  const [responseType, setResponseType] = useState("cosine");
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [isExpectedExpanded, setIsExpectedExpanded] = useState(false);
  // Filter out unwanted variables
  const filterVariables = (vars) => {
    const excludeKeys = ["_user_message", "current_time_date_and_current_identifier", "pre_function"];
    const filtered = {};
    Object.entries(vars || {}).forEach(([key, value]) => {
      if (!excludeKeys.includes(key)) {
        filtered[key] = value;
      }
    });
    return filtered;
  };

  const [editableVariables, setEditableVariables] = useState(
    testCaseConversation?.[0]?.threadVariables ? filterVariables(testCaseConversation[0].threadVariables) : {}
  );

  useEffect(() => {
    setFinalTestCases(initialTestCases);
    if (testCaseConversation?.[0]?.threadVariables) {
      setEditableVariables(filterVariables(testCaseConversation[0].threadVariables));
    }
  }, [testCaseConversation]);

  useEffect(() => {
    // Auto-resize all textareas on mount and when content changes
    const textareas = document.querySelectorAll("textarea");
    textareas.forEach((textarea) => {
      const currentHeight = textarea.style.height;
      const autoHeight = textarea.getAttribute("data-auto-height");
      if (currentHeight && autoHeight && currentHeight !== autoHeight) {
        // User manually resized it, skip auto-resizing
        return;
      }
      textarea.style.height = "auto";
      const newHeight = textarea.scrollHeight + "px";
      textarea.style.height = newHeight;
      textarea.setAttribute("data-auto-height", newHeight);
    });
  }, [finalTestCases]);

  const handleSubmit = (event) => {
    setIsLoading(true);
    event.preventDefault();
    const lastTestCase = finalTestCases[finalTestCases.length - 1] || {};
    const isAssistant = lastTestCase.role === "assistant";
    const isToolsCall = lastTestCase.role === "tools_call";

    const payload = {
      conversation: finalTestCases.slice(0, -1),
      type: isAssistant ? "response" : "function",
      expected: {
        ...(isAssistant && { response: lastTestCase.content }),
        ...(isToolsCall && { tool_calls: lastTestCase.tools }),
      },
      bridge_id: params?.id,
      matching_type: responseType,
      variables: editableVariables,
    };
    dispatch(createTestCaseAction({ bridgeId: params?.id, data: payload })).then(() => {
      // Clear testcase_id from Redux when creating new testcase
      if (channelIdentifier) {
        dispatch(clearChatTestCaseIdAction(channelIdentifier));
      }
      handleClose();
      setIsLoading(false);
    });
  };

  const handleChange = (newValue, index, childIndex) => {
    setFinalTestCases((prevTestCases) => {
      const updatedTestCases = [...prevTestCases];
      if (childIndex) {
        try {
          JSON.parse(newValue);
        } catch {
          toast.error("InValid JSON");
          return prevTestCases;
        }
        updatedTestCases[index].tools[childIndex] = JSON.parse(newValue);
      } else {
        updatedTestCases[index].content = newValue;
      }
      return updatedTestCases;
    });
  };

  const handleTextareaInput = (e) => {
    // Auto-resize textarea based on content
    const textarea = e.target;
    const currentHeight = textarea.style.height;
    const autoHeight = textarea.getAttribute("data-auto-height");
    if (currentHeight && autoHeight && currentHeight !== autoHeight) {
      // User manually resized it, skip auto-resizing
      return;
    }
    textarea.style.height = "auto";
    const newHeight = textarea.scrollHeight + "px";
    textarea.style.height = newHeight;
    textarea.setAttribute("data-auto-height", newHeight);
  };

  const handleVariableChange = (key, newValue) => {
    setEditableVariables((prev) => ({
      ...prev,
      [key]: newValue,
    }));
  };

  const removeTool = (index, childIndex) => {
    setFinalTestCases((prevTestCases) => {
      const updatedTestCases = [...prevTestCases];
      updatedTestCases[index].tools.splice(childIndex, 1);
      return updatedTestCases;
    });
  };

  const removeConversationPair = (pairIndex) => {
    // Remove both user and assistant messages (2 messages per pair)
    const startIndex = pairIndex * 2;
    setFinalTestCases((prevTestCases) => {
      const updated = [...prevTestCases];
      updated.splice(startIndex, 2);
      return updated;
    });
  };

  // Group messages into user+assistant pairs
  const getConversationPairs = () => {
    const pairs = [];
    for (let i = 0; i < finalTestCases.length - 1; i += 2) {
      pairs.push({
        user: finalTestCases[i],
        assistant: finalTestCases[i + 1],
        startIndex: i,
      });
    }
    return pairs;
  };
  const handleClose = () => {
    closeModal(MODAL_TYPE.ADD_TEST_CASE_MODAL);
    setTestCaseConversation([]);
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.ADD_TEST_CASE_MODAL} onClose={handleClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-low-medium overflow-auto h-auto bg-base-100">
        <form
          id="add-testcase-modal-form"
          onSubmit={handleSubmit}
          className="bg-base-100 mb-auto mt-auto rounded-lg shadow-2xl max-w-6xl w-[90vw] my-8 flex flex-col p-6 md:p-10 transition-all duration-300 ease-in-out animate-fadeIn"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Add Test Case</h2>
            <button
              data-testid="add-testcase-close-x-button"
              id="add-testcase-close-x-button"
              type="button"
              className="btn btn-circle btn-ghost btn-sm"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Variables Section */}
            {Object.keys(editableVariables).length > 0 && (
              <div className="space-y-3 bg-base-50 rounded-lg p-4 border border-base-200">
                <div className="text-sm font-semibold text-base-content mb-4">Variables</div>
                <div className="space-y-3">
                  {Object.entries(editableVariables).map(([key, value]) => (
                    <div key={key} className="bg-base-100 rounded-lg p-3 border border-base-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-base-content mb-1 block">Key</label>
                          <div className="text-sm font-mono bg-base-200 px-3 py-2 rounded text-base-content">{key}</div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-base-content mb-1 block">Value</label>
                          <AutoResizeTextarea
                            value={typeof value === "string" ? value : JSON.stringify(value)}
                            onChange={(e) => handleVariableChange(key, e.target.value)}
                            className="textarea textarea-bordered textarea-sm bg-base-50 text-sm w-full leading-relaxed"
                            placeholder="Enter value"
                            rows={1}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation History - Accordion Format */}
            {getConversationPairs().length > 0 && (
              <div className="mb-6">
                <button
                  data-testid="add-testcase-conversation-toggle"
                  type="button"
                  onClick={() => setShowFullConversation(!showFullConversation)}
                  className="w-full flex items-center justify-between bg-base-50 hover:bg-base-100 rounded-lg px-4 py-3 border border-base-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-medium text-base-content">Conversation History</span>
                    <span className="text-xs text-base-content/60">({getConversationPairs().length})</span>
                  </div>
                  <ChevronDownIcon
                    size={16}
                    className={`text-base-content/40 transition-transform ${showFullConversation ? "rotate-180" : ""}`}
                  />
                </button>
                {showFullConversation && (
                  <div className="mt-3 bg-white rounded-lg px-6 py-4 border border-base-200 space-y-4">
                    {getConversationPairs().map((pair, pairIndex) => (
                      <div key={pairIndex} className="space-y-4">
                        {/* User Message */}
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">User</span>
                            <button
                              type="button"
                              onClick={() => removeConversationPair(pairIndex)}
                              className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                              title="Remove this conversation"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className="max-w-full bg-blue-500 text-white rounded-lg rounded-br-none px-4 py-3">
                            <textarea
                              defaultValue={pair.user?.content || ""}
                              className="w-full bg-transparent text-sm leading-relaxed break-words focus:outline-none resize-none"
                              onInput={handleTextareaInput}
                              onBlur={(e) => handleChange(e.target.value, pair.startIndex, null)}
                              rows={3}
                            />
                          </div>
                        </div>
                        {/* Assistant Message */}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">AI</span>
                          <div className="max-w-full bg-gray-100 text-gray-800 rounded-lg rounded-bl-none px-4 py-3">
                            <textarea
                              defaultValue={pair.assistant?.content || ""}
                              className="w-full bg-transparent text-sm leading-relaxed break-words focus:outline-none resize-none"
                              onInput={handleTextareaInput}
                              onBlur={(e) => handleChange(e.target.value, pair.startIndex + 1, null)}
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* User Query - Last user message (always visible) */}
            {finalTestCases && finalTestCases.length >= 2 && (
              <div id="add-testcase-last-user-message" className="space-y-4">
                {(() => {
                  const secondLastMessage = finalTestCases[finalTestCases.length - 2];
                  const secondLastIndex = finalTestCases.length - 2;
                  return (
                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase text-base-content tracking-wide">User Query</div>
                      {secondLastMessage.role === "tools_call" || secondLastMessage.sender === "tools_call" ? (
                        <div className="space-y-3">
                          {secondLastMessage.tools?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex gap-3 items-start group relative bg-base-100 rounded-lg p-3 shadow-sm"
                            >
                              <textarea
                                id={`add-testcase-second-last-tool-textarea-${idx}`}
                                defaultValue={JSON.stringify(item, null, 2)}
                                className="textarea bg-base-100 w-full font-mono text-sm p-2 bg-transparent focus:outline-none resize-none overflow-hidden"
                                onInput={handleTextareaInput}
                                onBlur={(e) => handleChange(e.target.value, secondLastIndex, idx)}
                                rows={4}
                              />
                              {secondLastMessage.tools.length > 1 && (
                                <button
                                  id={`add-testcase-second-last-remove-tool-${idx}`}
                                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeTool(secondLastIndex, idx)}
                                >
                                  <CloseIcon size={16} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          id="add-testcase-user-query-textarea"
                          defaultValue={secondLastMessage.content}
                          className="textarea bg-base-100 w-full text-sm p-3 focus:outline-none rounded-lg shadow-sm resize-none overflow-hidden"
                          onInput={handleTextareaInput}
                          onBlur={(e) => handleChange(e.target.value, secondLastIndex, null)}
                          rows={3}
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 p-6 pt-4 bg-base-200 bottom-0">
            {/* User Expected Output Section */}
            {finalTestCases && finalTestCases.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase text-base-content tracking-wide">
                  User Expected Output
                </div>
                <div className="bg-base-50 rounded-lg border border-base-200">
                  <div
                    style={{
                      maxHeight: isExpectedExpanded ? "none" : "calc(6 * 1.625rem)",
                      overflow: "hidden",
                    }}
                    className="px-4 pt-3 pb-1"
                  >
                    {(() => {
                      const lastMessage = finalTestCases[finalTestCases.length - 1];
                      const lastIndex = finalTestCases.length - 1;
                      if (lastMessage.role === "tools_call" || lastMessage.sender === "tools_call") {
                        return (
                          <div className="space-y-3">
                            {lastMessage.tools?.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex gap-3 items-start group relative bg-base-100 rounded-lg p-3 shadow-sm"
                              >
                                <textarea
                                  id={`add-testcase-expected-tool-textarea-${idx}`}
                                  defaultValue={JSON.stringify(item, null, 2)}
                                  className="textarea bg-base-100 w-full font-mono text-sm p-2 bg-transparent focus:outline-none resize-none overflow-hidden"
                                  onInput={handleTextareaInput}
                                  onBlur={(e) => handleChange(e.target.value, lastIndex, idx)}
                                  rows={4}
                                />
                                {lastMessage.tools.length > 1 && (
                                  <button
                                    id={`add-testcase-expected-remove-tool-${idx}`}
                                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeTool(lastIndex, idx)}
                                  >
                                    <CloseIcon size={16} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <textarea
                          id="add-testcase-expected-content-textarea"
                          defaultValue={lastMessage.content}
                          className="textarea bg-base-100 w-full text-sm p-3 focus:outline-none resize-none overflow-hidden"
                          onInput={handleTextareaInput}
                          onBlur={(e) => handleChange(e.target.value, lastIndex, null)}
                          rows={3}
                        />
                      );
                    })()}
                  </div>
                  {/* Show more / Show less row - only show if content exceeds 6 lines */}
                  {(() => {
                    const lastMessage = finalTestCases[finalTestCases.length - 1];
                    const content = lastMessage?.content || "";
                    return (
                      content &&
                      content.split("\n").length > 6 && (
                        <div className="px-4 pb-2">
                          {!isExpectedExpanded ? (
                            <button
                              type="button"
                              onClick={() => setIsExpectedExpanded(true)}
                              className="text-xs text-primary hover:text-primary transition-colors"
                            >
                              ... show more
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsExpectedExpanded(false)}
                              className="text-xs text-base-content/50 hover:text-primary transition-colors"
                            >
                              show less
                            </button>
                          )}
                        </div>
                      )
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Footer with matching strategy and buttons */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <label className="text-sm text-base-content">Matching strategy:</label>
                <select
                  data-testid="add-testcase-matching-strategy-select"
                  id="add-testcase-matching-strategy-select"
                  className="select select-sm bg-base-100 focus:outline-none border-none"
                  value={responseType}
                  onChange={(e) => setResponseType(e.target.value)}
                >
                  <option value="exact">Exact</option>
                  <option value="ai">AI</option>
                  <option value="cosine">Cosine</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  data-testid="add-testcase-cancel-button"
                  id="add-testcase-cancel-button"
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button
                  data-testid="add-testcase-create-button"
                  id="add-testcase-create-button"
                  type="submit"
                  className="btn btn-sm btn-primary px-6"
                  disabled={isLoading}
                >
                  {isLoading ? <span className="loading loading-spinner"></span> : "Create"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default AddTestCaseModal;
