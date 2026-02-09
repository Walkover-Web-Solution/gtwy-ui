"use client";
import { MODAL_TYPE } from "@/utils/enums";
import { allowedAttributes, generateKeyValuePairs, openModal } from "@/utils/utility";
import { CloseCircleIcon, CopyIcon } from "@/components/Icons";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { Check, ChevronDown } from "lucide-react";
import ChatAiConfigDeatilViewModal from "../modals/ChatAiConfigDeatilViewModal";
import { truncate, useCloseSliderOnEsc } from "./AssistFile";

const ChatDetails = ({ selectedItem, setIsSliderOpen, isSliderOpen, params }) => {
  if (selectedItem) {
    selectedItem["system Prompt"] =
      selectedItem["AiConfig"]?.messages?.[0].role === "developer"
        ? selectedItem["AiConfig"]?.messages?.[0].content
        : selectedItem["AiConfig"]?.input?.[0].role === "developer"
          ? selectedItem["AiConfig"]?.input?.[0].content
          : selectedItem["AiConfig"]?.system;
  }
  const variablesKeyValue = selectedItem && selectedItem["variables"] ? selectedItem["variables"] : {};
  const [modalContent, setModalContent] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const closeSliderOnEsc = (event) => {
      if (event.key === "Escape") {
        setIsSliderOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSliderOpen(false);
      }
    };

    document.addEventListener("keydown", closeSliderOnEsc);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", closeSliderOnEsc);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useCloseSliderOnEsc(setIsSliderOpen);

  const copyToClipboard = (content, message = "Copied to clipboard", id = null) => {
    navigator.clipboard
      .writeText(typeof content === "string" ? content : JSON.stringify(content))
      .then(() => {
        toast.success(message);
        if (id) {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
        }
      })
      .catch((error) => {
        toast.error(`Error while copying to clipboard`);
        console.error(error);
      });
  };

  const replaceVariablesInPrompt = (prompt) => {
    return prompt.replace(/{{(.*?)}}/g, (_, variableName) => {
      const value = variablesKeyValue[variableName];
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
      }
      return `{{${variableName}}}`;
    });
  };

  const handleObjectClick = useCallback((key, displayValue) => {
    setModalContent(displayValue);
    openModal(MODAL_TYPE.CHAT_DETAILS_VIEW_MODAL);
  }, []);

  // Open modal if selectedItem.value matches a key
  useEffect(() => {
    if (selectedItem?.value && selectedItem?.value !== "system Prompt") {
      const key = selectedItem.value;
      const value = selectedItem[key];
      if (value) {
        handleObjectClick(key, value);
      }
    }
  }, [selectedItem, handleObjectClick]);

  return (
    <div
      id="chat-details-slider"
      ref={sidebarRef}
      className={`fixed inset-y-0 right-0 border-l-2 bg-base-100 shadow-2xl rounded-md ${
        isSliderOpen ? "w-full md:w-1/2 lg:w-1/2 opacity-100" : "w-0"
      } overflow-y-auto bg-gradient-to-br from-base-200 to-base-100 transition-all duration-300 ease-in-out z-very-high`}
    >
      {selectedItem && (
        <aside className="flex flex-col h-screen overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-base-content tracking-tight">Chat Details</h2>
              <button
                id="chat-details-close-button"
                onClick={() => setIsSliderOpen(false)}
                className="btn btn-ghost btn-circle hover:bg-base-100 transition-colors duration-200"
              >
                <CloseCircleIcon size={20} className="bg-base-100" />
              </button>
            </div>
            <div className="bg-base-100 rounded-md shadow-sm">
              <div className="w-full">
                <div className="w-full">
                  {/* Important attributes first */}
                  {allowedAttributes.important
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([key, displayKey]) => {
                      const value = selectedItem[key];
                      if (value === undefined) return null;

                      let displayValue = value;
                      let rawSystemPrompt;
                      if (key === "system Prompt" && typeof value === "string") {
                        rawSystemPrompt = replaceVariablesInPrompt(value);
                        displayValue = rawSystemPrompt.replace(/\n/g, "<br />");
                      }

                      return (
                        <div key={key} className="border-b border-base-300 bg-base-100 transition-colors duration-150">
                          <div className="pt-4 px-4 text-sm font-semibold capitalize">{displayKey}</div>
                          <div className="py-4 px-4">
                            {typeof displayValue === "object" ? (
                              <div className="relative">
                                <pre
                                  id={`chat-details-${key}-value`}
                                  className={`bg-base-200 p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap border border-base-200 ${
                                    JSON.stringify(displayValue).length > 200
                                      ? "cursor-pointer hover:border-primary transition-colors duration-200"
                                      : ""
                                  }`}
                                  onClick={() => handleObjectClick(key, displayValue)}
                                >
                                  {truncate(JSON.stringify(displayValue, null, 2), 210)}
                                </pre>
                                {key === "variables" && displayValue && (
                                  <div className="absolute top-2 right-2">
                                    <div className="dropdown dropdown-end">
                                      <div
                                        id="chat-details-variables-copy-dropdown"
                                        tabIndex={0}
                                        role="button"
                                        className="btn btn-sm btn-ghost tooltip tooltip-primary tooltip-left hover:bg-base-300 transition-colors duration-200"
                                        data-tip="Copy options"
                                      >
                                        <CopyIcon size={16} className="text-base-content" />
                                        <ChevronDown size={12} className="text-base-content" />
                                      </div>
                                      <ul
                                        tabIndex={0}
                                        className="dropdown-content menu rounded-box z-high w-64 p-2 shadow bg-base-100 border border-base-300"
                                      >
                                        <li>
                                          <a
                                            id="chat-details-copy-current-values"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              copyToClipboard(
                                                displayValue,
                                                "Current values copied to clipboard",
                                                `current-${key}`
                                              );
                                            }}
                                            className="flex items-center gap-2 text-sm"
                                          >
                                            <CopyIcon size={14} />
                                            <div>
                                              <div className="font-medium">Copy Current Values</div>
                                              <div className="text-xs opacity-70">Copy actual runtime values</div>
                                            </div>
                                          </a>
                                        </li>
                                        <li>
                                          <a
                                            id="chat-details-copy-key-value-pairs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const keyValuePairs = generateKeyValuePairs(displayValue);
                                              copyToClipboard(
                                                JSON.stringify(keyValuePairs, null, 2),
                                                "Key-value pairs copied to clipboard",
                                                `keyvalue-${key}`
                                              );
                                            }}
                                            className="flex items-center gap-2 text-sm"
                                          >
                                            <CopyIcon size={14} />
                                            <div>
                                              <div className="font-medium">Copy Key-Value Pairs</div>
                                              <div className="text-xs opacity-70">Copy structure with data types</div>
                                            </div>
                                          </a>
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="relative bg-base-200 p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap border border-base-200">
                                <div
                                  className="text-base-content break-words"
                                  dangerouslySetInnerHTML={{ __html: displayValue?.toString() }}
                                ></div>
                                {key === "system Prompt" && (
                                  <button
                                    id="chat-details-copy-system-prompt"
                                    onClick={() =>
                                      copyToClipboard(
                                        rawSystemPrompt,
                                        "System prompt copied to clipboard",
                                        "system-prompt"
                                      )
                                    }
                                    className="absolute top-2 right-2 btn btn-ghost btn-sm p-1.5 rounded-md hover:bg-base-300 transition-colors duration-200"
                                    title="Copy system prompt"
                                  >
                                    {copiedId === "system-prompt" ? (
                                      <Check size={16} className="text-success" />
                                    ) : (
                                      <CopyIcon size={16} className="text-base-content" />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  <div className="bg-base-200">
                    <div className="py-2 px-6 text-sm font-semibold text-base-content border-b border-base-300">
                      Optional Details
                    </div>
                  </div>

                  {allowedAttributes.optional
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([key, displayKey]) => {
                      const value = selectedItem[key];
                      if (value === undefined) return null;

                      // If the value is an object, render each property as separate rows
                      if (typeof value === "object" && value !== null && key !== "createdAt") {
                        return Object.entries(value).map(([objKey, objValue]) => (
                          <tr key={`${key}-${objKey}`} className="border-b bg-base-100 transition-colors duration-150">
                            <td className="py-4 px-6 text-sm font-semibold capitalize">
                              {objKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-gray-600 break-words">{objValue?.toString()}</span>
                            </td>
                          </tr>
                        ));
                      }

                      // Regular single value display
                      return (
                        <tr key={key} className="border-b bg-base-100 transition-colors duration-150">
                          <td className="py-4 px-6 text-sm font-semibold capitalize">{displayKey}</td>
                          <td className="py-4 px-6">
                            <span className="text-gray-600 break-words">
                              {key === "createdAt" ? new Date(value).toLocaleString() : value?.toString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
      <ChatAiConfigDeatilViewModal modalContent={modalContent} />
    </div>
  );
};

export default ChatDetails;
