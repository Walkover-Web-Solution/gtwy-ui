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
import ExpandCollapse from "@/components/UI/ExpandCollapse";

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
      aiConfigInput.forEach((msg, idx) => {
        // Only include user, assistant, developer, and system messages
        if (msg.role === "user" || msg.role === "assistant") {
          processedMessages.push({
            id: `msg-config-${idx}-${Date.now()}-${Math.random()}`,
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
          id: `msg-expected-${Date.now()}-${Math.random()}`,
          role: "assistant",
          content: expectedResponse,
          isExpectedResponse: true, // Mark this as the expected response
        });
      }

      return processedMessages;
    }

    // Handle regular conversation array format
    return testCaseConversation
      .map((message, idx) => {
        const uniqueId = `msg-${idx}-${Date.now()}-${Math.random()}`;
        if (message.role === "user" || message.sender === "user") {
          return {
            id: uniqueId,
            role: message.role || message.sender,
            content: getContentText(message.content),
          };
        } else if ((message.role === "assistant" || message.sender === "assistant") && message.content) {
          return {
            id: uniqueId,
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
            id: uniqueId,
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
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [testCaseName, setTestCaseName] = useState("");
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
    setTestCaseName("");
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
      name: testCaseName,
      conversation: finalTestCases.slice(0, -1),
      type: isAssistant ? "response" : "function",
      expected: {
        ...(isAssistant && { response: lastTestCase.content }),
        ...(isToolsCall && { tool_calls: lastTestCase.tools }),
      },
      bridge_id: params?.id,
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
      if (childIndex !== undefined && childIndex !== null) {
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
  // Exclude the last pair (which will be shown as User Query and Expected Output)
  const getConversationPairs = () => {
    const pairs = [];
    // Stop 2 messages before the end to exclude the last user+assistant pair
    for (let i = 0; i < finalTestCases.length - 2; i += 2) {
      pairs.push({
        user: finalTestCases[i],
        assistant: finalTestCases[i + 1],
        startIndex: i,
        id: finalTestCases[i]?.id || `pair-${i}`,
      });
    }
    return pairs;
  };
  const handleClose = () => {
    closeModal(MODAL_TYPE.ADD_TEST_CASE_MODAL);
    setTestCaseConversation([]);
    setTestCaseName("");
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
            {/* Test Case Name Section */}
            <div className="space-y-2 bg-base-50 rounded-lg p-4 border border-base-200">
              <label className="text-sm font-semibold text-base-content">Test Case Name</label>
              <input
                data-testid="add-testcase-name-input"
                id="add-testcase-name-input"
                type="text"
                placeholder="Enter test case name"
                value={testCaseName}
                onChange={(e) => setTestCaseName(e.target.value)}
                className="input input-sm input-bordered bg-base-100 w-full focus:outline-none"
              />
            </div>
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
                  <div className="mt-3 bg-base-100 rounded-lg px-6 py-4 border border-base-200 space-y-4">
                    {getConversationPairs().map((pair, pairIndex) => (
                      <div key={pair.id || pairIndex} className="space-y-4">
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
                          <div className="w-[90%] bg-primary text-primary-content rounded-lg rounded-br-none px-4 py-3">
                            <ExpandCollapse collapsedHeight={160} fadeHeight={60}>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                className="w-full text-sm leading-relaxed break-words whitespace-pre-wrap focus:outline-none"
                                style={{ minHeight: "1.625rem" }}
                                onBlur={(e) => handleChange(e.target.textContent, pair.startIndex, null)}
                              >
                                {pair.user?.content || ""}
                              </div>
                            </ExpandCollapse>
                          </div>
                        </div>
                        {/* Assistant Message */}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">AI</span>
                          <div className="w-[90%] bg-base-300 text-base-content rounded-lg rounded-bl-none px-4 py-3">
                            <ExpandCollapse collapsedHeight={160} fadeHeight={60}>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                className="w-full text-sm leading-relaxed break-words whitespace-pre-wrap focus:outline-none"
                                style={{ minHeight: "1.625rem" }}
                                onBlur={(e) => handleChange(e.target.textContent, pair.startIndex + 1, null)}
                              >
                                {pair.assistant?.content || ""}
                              </div>
                            </ExpandCollapse>
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
                    <div className="space-y-2" data-testid="add-testcase-user-query-wrapper">
                      <div className="text-xs font-medium uppercase text-base-content tracking-wide">User Query</div>
                      {secondLastMessage.role === "tools_call" || secondLastMessage.sender === "tools_call" ? (
                        <div className="space-y-3">
                          {secondLastMessage.tools?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex gap-3 items-start group relative bg-base-100 rounded-lg p-3 shadow-sm"
                            >
                              <div className="flex-1 overflow-hidden bg-base-100 rounded p-2 font-mono text-sm text-base-content whitespace-pre-wrap break-words">
                                {JSON.stringify(item, null, 2)}
                              </div>
                              {secondLastMessage.tools.length > 1 && (
                                <button
                                  id={`add-testcase-second-last-remove-tool-${idx}`}
                                  type="button"
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
                        <div className="bg-base-100 rounded-lg shadow-sm rounded p-3 text-sm text-base-content whitespace-pre-wrap break-words">
                          <ExpandCollapse collapsedHeight={160} fadeHeight={60}>
                            <div className="whitespace-pre-wrap break-words">{secondLastMessage.content}</div>
                          </ExpandCollapse>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 p-6 pt-4 bg-base-200 bottom-0" data-testid="add-testcase-bottom-panel">
            {/* User Expected Output Section */}
            {finalTestCases && finalTestCases.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase text-base-content tracking-wide">
                  User Expected Output
                </div>
                <div className="bg-base-50 rounded-lg border border-base-200 px-4 pt-3 pb-2">
                  <ExpandCollapse collapsedHeight={160} fadeHeight={60}>
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
                                <div className="flex-1 overflow-hidden bg-base-100 rounded p-2 font-mono text-sm text-base-content whitespace-pre-wrap break-words">
                                  {JSON.stringify(item, null, 2)}
                                </div>
                                {lastMessage.tools.length > 1 && (
                                  <button
                                    id={`add-testcase-expected-remove-tool-${idx}`}
                                    type="button"
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
                        <div className="bg-base-100 rounded p-3 text-sm text-base-content whitespace-pre-wrap break-words">
                          {lastMessage.content}
                        </div>
                      );
                    })()}
                  </ExpandCollapse>
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end items-center">
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
