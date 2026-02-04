import { useCustomSelector } from "@/customHooks/customSelector";
import { createTestCaseAction } from "@/store/action/testCasesAction";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { CloseIcon } from "@/components/Icons";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Modal from "../UI/Modal";
import { clearChatTestCaseIdAction } from "@/store/action/chatAction";

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
      return typeof content === "string" ? content : "";
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
  useEffect(() => {
    setFinalTestCases(initialTestCases);
  }, [testCaseConversation]);

  useEffect(() => {
    // Auto-resize all textareas on mount and when content changes
    const textareas = document.querySelectorAll("textarea");
    textareas.forEach((textarea) => {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
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
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };
  const removeTool = (index, childIndex) => {
    setFinalTestCases((prevTestCases) => {
      const updatedTestCases = [...prevTestCases];
      updatedTestCases[index].tools.splice(childIndex, 1);
      return updatedTestCases;
    });
  };
  const handleClose = () => {
    closeModal(MODAL_TYPE.ADD_TEST_CASE_MODAL);
    setTestCaseConversation([]);
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.ADD_TEST_CASE_MODAL} onClose={handleClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start z-low-medium min-w-[100vw] min-h-[100vh] overflow-auto py-4">
        <form
          id="add-testcase-modal-form"
          onSubmit={handleSubmit}
          className="bg-base-200 rounded-lg shadow-2xl max-w-5xl w-[90vw] relative flex flex-col"
        >
          <div className="flex justify-between items-center p-6 pb-0  top-0 bg-base-100 z-low">
            <h3 className="text-xl font-semibold">Add Test Case</h3>
            <button
              id="add-testcase-close-x-button"
              type="button"
              className="btn btn-circle btn-ghost btn-sm"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Show Conversations Button - Only when there are conversations to show */}
            {finalTestCases && finalTestCases.length > 2 && !showFullConversation && (
              <div className="flex xs">
                <button
                  id="add-testcase-show-conversations-button"
                  type="button"
                  onClick={() => setShowFullConversation(true)}
                  className="btn btn-outline btn-sm"
                >
                  Conversations ({Math.ceil(finalTestCases.slice(0, -2).length / 2)})
                </button>
              </div>
            )}

            {/* Conversations Section - Show all conversations when expanded */}
            {showFullConversation && finalTestCases && finalTestCases.length > 2 && (
              <div id="add-testcase-conversations-section" className="space-y-4">
                <div className="flex items-center justify-between border-b border-base-300 pb-2">
                  <button
                    id="add-testcase-hide-conversations-button"
                    type="button"
                    onClick={() => setShowFullConversation(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    Hide Conversations
                  </button>
                </div>

                {finalTestCases.slice(0, -2).map((message, index) => (
                  <div key={index} id={`add-testcase-conversation-${index}`} className="space-y-2 mb-4">
                    <div className="text-xs font-medium uppercase text-base-content tracking-wide">
                      {message?.role?.replace("_", " ") || message?.sender?.replace("_", " ")}
                    </div>
                    {message.role === "tools_call" || message.sender === "tools_call" ? (
                      <div className="space-y-3">
                        {message.tools?.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex gap-3 items-start group relative bg-base-100 rounded-lg p-3 shadow-sm"
                          >
                            <textarea
                              id={`add-testcase-tool-textarea-${index}-${idx}`}
                              defaultValue={JSON.stringify(item, null, 2)}
                              className="textarea bg-white dark:bg-black/15 w-full font-mono text-sm p-2 bg-transparent focus:outline-none resize-none overflow-hidden"
                              onInput={handleTextareaInput}
                              onBlur={(e) => handleChange(e.target.value, index, idx)}
                              rows={4}
                            />
                            {message.tools.length > 1 && (
                              <button
                                id={`add-testcase-remove-tool-${index}-${idx}`}
                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeTool(index, idx)}
                              >
                                <CloseIcon size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        id={`add-testcase-content-textarea-${index}`}
                        defaultValue={message.content}
                        className="textarea bg-white dark:bg-black/15 w-full text-sm p-3 focus:outline-none rounded-lg shadow-sm resize-none overflow-hidden"
                        onInput={handleTextareaInput}
                        onBlur={(e) => handleChange(e.target.value, index, null)}
                        rows={3}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Last User Message */}
            {finalTestCases && finalTestCases.length >= 2 && (
              <div id="add-testcase-last-user-message" className="space-y-4">
                {(() => {
                  const secondLastMessage = finalTestCases[finalTestCases.length - 2];
                  const secondLastIndex = finalTestCases.length - 2;
                  return (
                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase text-base-content tracking-wide">
                        {secondLastMessage?.role?.replace("_", " ") || secondLastMessage?.sender?.replace("_", " ")}
                      </div>
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
                                className="textarea bg-white dark:bg-black/15 w-full font-mono text-sm p-2 bg-transparent focus:outline-none resize-none overflow-hidden"
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
                          id={`add-testcase-second-last-remove-tool`}
                          defaultValue={secondLastMessage.content}
                          className="textarea bg-white dark:bg-black/15 w-full text-sm p-3 focus:outline-none rounded-lg shadow-sm resize-none overflow-hidden"
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

            {/* User Expected Output Section - Last message (Assistant renamed) */}
            {finalTestCases && finalTestCases.length > 0 && (
              <div id="add-testcase-expected-output" className="space-y-4">
                {(() => {
                  const lastMessage = finalTestCases[finalTestCases.length - 1];
                  const lastIndex = finalTestCases.length - 1;
                  return (
                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase text-base-content tracking-wide">
                        User Expected Output
                      </div>
                      {lastMessage.role === "tools_call" || lastMessage.sender === "tools_call" ? (
                        <div className="space-y-3">
                          {lastMessage.tools?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex gap-3 items-start group relative bg-base-100 rounded-lg p-3 shadow-sm"
                            >
                              <textarea
                                id={`add-testcase-expected-tool-textarea-${idx}`}
                                defaultValue={JSON.stringify(item, null, 2)}
                                className="textarea bg-white dark:bg-black/15 w-full font-mono text-sm p-2 bg-transparent focus:outline-none resize-none overflow-hidden"
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
                      ) : (
                        <textarea
                          id="add-testcase-expected-content-textarea"
                          defaultValue={lastMessage.content}
                          className="textarea bg-white dark:bg-black/15 w-full text-sm p-3 focus:outline-none rounded-lg shadow-sm resize-none overflow-hidden"
                          onInput={handleTextareaInput}
                          onBlur={(e) => handleChange(e.target.value, lastIndex, null)}
                          rows={3}
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center p-6 pt-4 bg-base-200 bottom-0">
            <div className="flex items-center gap-3">
              <label className="text-sm text-base-content">Matching strategy:</label>
              <select
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
                id="add-testcase-cancel-button"
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                id="add-testcase-create-button"
                type="submit"
                className="btn btn-sm btn-primary px-6"
                disabled={isLoading}
              >
                {isLoading ? <span className="loading loading-spinner"></span> : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default AddTestCaseModal;
