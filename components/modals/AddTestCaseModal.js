import { useCustomSelector } from "@/customHooks/customSelector";
import { createTestCaseAction } from "@/store/action/testCasesAction";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import { Trash2, ChevronDown as ChevronDownIcon, FlaskConical } from "lucide-react";
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
  // Process testCaseConversation - extract from outside AiConfig (from item data)
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

    // Handle regular conversation array format (outside AiConfig)
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

  const [finalTestCases, setFinalTestCases] = useState([]);
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [testCaseName, setTestCaseName] = useState("");
  const [userQueryText, setUserQueryText] = useState("");
  const [expectedOutputText, setExpectedOutputText] = useState("");
  const [userUrlsList, setUserUrlsList] = useState([]);
  const [editableVariables, setEditableVariables] = useState({});

  useEffect(() => {
    if (!testCaseConversation || testCaseConversation.length === 0) return;

    const data = testCaseConversation[0];
    const userQuery = data?.user || "";
    const expectedOutput = data?.llm_message || data?.chatbot_message || data?.updated_llm_message || "";
    const userUrls = Array.isArray(data?.user_urls) ? data.user_urls : [];

    setUserQueryText(userQuery);
    setExpectedOutputText(expectedOutput);
    setUserUrlsList(userUrls);
    setFinalTestCases(processTestCaseData());
    if (data?.threadVariables) {
      setEditableVariables(filterVariables(data.threadVariables));
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

    const conversationData = finalTestCases.slice(0, -1);
    const payload = {
      name: testCaseName,
      ...(conversationData.length > 0 && { conversation: conversationData }),
      type: isAssistant ? "response" : "function",
      expected: {
        ...(isAssistant && { response: lastTestCase.content }),
        ...(isToolsCall && { tool_calls: lastTestCase.tools }),
        ...(expectedOutputText && { response: expectedOutputText }),
      },
      bridge_id: params?.id,
      matching_type: "ai",
      variables: editableVariables,
      ...(userUrlsList.length > 0 && { user_urls: userUrlsList }),
      // Backend resolves ai_config server-side using message_id (see
      // historyService.findHistoryByMessageId). We stop sending ai_config
      // from the client and instead forward the source message_id.
      ...(testCaseConversation?.[0]?.message_id && { message_id: testCaseConversation[0].message_id }),
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

  const footerContent = (
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
        form="add-testcase-modal-form"
        className="btn btn-sm btn-primary px-6"
        disabled={isLoading}
      >
        {isLoading ? <span className="loading loading-spinner loading-xs"></span> : "Create"}
      </button>
    </div>
  );

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.ADD_TEST_CASE_MODAL}
      onClose={handleClose}
      title="Add Test Case"
      icon={<FlaskConical size={16} className="text-trace-gold" />}
      widthClass="w-[min(1152px,92vw)]"
      footer={footerContent}
    >
      <form id="add-testcase-modal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          {/* User URLs Section */}
          {userUrlsList.length > 0 && (
            <div className="space-y-3 bg-base-50 rounded-lg p-4 border border-base-200">
              <div className="text-sm font-semibold text-base-content mb-4">User URLs</div>
              <div className="space-y-2">
                {userUrlsList.map((urlObj, idx) => {
                  const urlString = typeof urlObj === "string" ? urlObj : urlObj?.url;
                  const isImageUrl = urlString && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(urlString);

                  return (
                    <div key={idx} className="bg-base-100 rounded-lg p-3 border border-base-200">
                      <div className="text-xs font-semibold text-base-content mb-2">URL {idx + 1}</div>
                      {isImageUrl ? (
                        <div className="flex flex-col gap-2">
                          <img
                            src={urlString}
                            alt={`User URL ${idx + 1}`}
                            className="max-w-full max-h-64 rounded border border-base-300"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <a
                            href={urlString}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm break-all text-blue-600 hover:underline"
                          >
                            {urlString}
                          </a>
                        </div>
                      ) : (
                        <a
                          href={urlString}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm break-all text-blue-600 hover:underline block"
                        >
                          {urlString || JSON.stringify(urlObj)}
                        </a>
                      )}
                    </div>
                  );
                })}
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

          {/* User Query - From user field (always visible) */}
          {userQueryText && (
            <div id="add-testcase-last-user-message" className="space-y-4">
              <div className="space-y-2" data-testid="add-testcase-user-query-wrapper">
                <div className="text-xs font-medium uppercase text-base-content tracking-wide">User Query</div>
                <div className="bg-base-100 rounded-lg shadow-sm p-3 text-sm text-base-content whitespace-pre-wrap break-words">
                  <ExpandCollapse collapsedHeight={160} fadeHeight={60}>
                    <div className="whitespace-pre-wrap break-words">{userQueryText}</div>
                  </ExpandCollapse>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Expected Output Section (editable) */}
        <div
          className="flex flex-col gap-4 p-6 pt-4 bg-base-200 bottom-0 rounded-lg"
          data-testid="add-testcase-bottom-panel"
        >
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase text-base-content tracking-wide">User Expected Output</div>
            <div className="bg-base-50 rounded-lg border border-base-200 px-4 pt-3 pb-2">
              <ExpandCollapse collapsedHeight={160} fadeHeight={60}>
                <AutoResizeTextarea
                  data-testid="add-testcase-expected-output-textarea"
                  value={expectedOutputText}
                  onChange={(e) => setExpectedOutputText(e.target.value)}
                  placeholder="Enter the expected output..."
                  className="w-full bg-base-100 rounded p-3 text-sm text-base-content leading-relaxed outline-none border-0 focus:ring-0"
                  rows={3}
                />
              </ExpandCollapse>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default AddTestCaseModal;
