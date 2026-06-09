import React, { useState, useEffect, useRef, useCallback } from "react";
import { PlayIcon, TrashIcon, ChevronDownIcon, ChevronLeft, ChevronRight, Plus, X, Settings } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, getIconOfService } from "@/utils/utility";
import { updateTestCaseAction } from "@/store/action/testCasesAction";
import TestCaseVariablesModal from "./TestCaseVariablesModal";
import AutoResizeTextarea from "@/components/UI/AutoResizeTextarea";
import ReactMarkdown from "react-markdown";
import CodeBlock from "@/components/codeBlock/CodeBlock";
import ToolsDataModal from "@/components/historyPageComponents/ToolsDataModal";
import { FileClockIcon } from "@/components/Icons";

const TestCaseDetailsPanel = ({
  selectedTestCase,
  selectedVersions,
  versions,
  runningTestCaseId,
  isloading,
  handleRunSingleTestCase,
  handleDeleteTestCase,
  getScoreColor,
  getScoreMessage,
  getScoreDisplay,
  bridgeId,
  onTestCaseUpdate,
}) => {
  const dispatch = useDispatch();

  // Comparison versions are independent of selectedVersions (which controls "run").
  // User can pick ANY versions from all available `versions` to compare here.
  const [comparisonVersions, setComparisonVersions] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [versionVariables, setVersionVariables] = useState({});
  const [showVariableAlert, setShowVariableAlert] = useState(false);
  const [testCaseVariables, setTestCaseVariables] = useState({});
  const [editedConversation, setEditedConversation] = useState([]);
  const [editedExpected, setEditedExpected] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toolsData, setToolsData] = useState(null);
  const [runIndices, setRunIndices] = useState({});
  const [isExpectedExpanded, setIsExpectedExpanded] = useState(false);
  const toolsDataModalRef = useRef(null);

  const handleCloseToolsDataModal = () => {
    setToolsData(null);
    toolsDataModalRef.current?.close();
  };

  // Get embedToken and other data needed for openViasocket
  const { embedToken } = useCustomSelector((state) => ({
    embedToken:
      state?.bridgeReducer?.org?.[bridgeId?.split?.("/")?.[0]]?.embed_token ||
      state?.bridgeReducer?.org?.[bridgeId]?.embed_token,
  }));

  const handleToolPrimaryClick = useCallback(
    async (tool) => {
      // Check if this is a RAG tool - don't call openViasocket for RAG tools
      if (tool?.data?.metadata?.type === "RAG") {
        return;
      }

      // Check if this is a knowledge database tool
      const toolName = typeof tool?.name === "string" ? tool.name.toLowerCase() : "";
      const isKnowledgeDbTool =
        toolName === "get_knowledge_base_data" ||
        toolName.includes("get knowledge database") ||
        toolName.includes("knowledge") ||
        toolName.includes("rag");

      if (isKnowledgeDbTool) {
        // For knowledge base tools, just show the data modal
        setToolsData(tool);
        toolsDataModalRef.current?.showModal();
        return;
      }

      // Call openViasocket for other tools
      if (typeof window !== "undefined" && window.openViasocket) {
        window.openViasocket(tool?.id, {
          flowHitId: tool?.data?.metadata?.flowHitId,
          embedToken,
          meta: {
            type: "tool",
            bridge_id: bridgeId,
          },
        });
        return;
      }

      // Fallback: show data modal if openViasocket is not available
      setToolsData(tool);
      toolsDataModalRef.current?.showModal();
    },
    [embedToken, bridgeId]
  );

  const dropdownRef = useRef(null);

  // Close all dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get current expected value as string for editing
  const getExpectedValue = (testCase) => {
    const response = testCase?.expected?.response;
    if (response !== undefined && response !== null && response !== "") {
      return typeof response === "string" ? response : JSON.stringify(response, null, 2);
    }
    if (testCase?.expected?.tool_calls) return JSON.stringify(testCase.expected.tool_calls, null, 2);
    return "";
  };

  // Sync local edit state when selectedTestCase changes
  useEffect(() => {
    setEditedConversation(selectedTestCase?.conversation ? [...selectedTestCase.conversation] : []);
    setEditedExpected(getExpectedValue(selectedTestCase));
    setHasUnsavedChanges(false);
    setIsExpectedExpanded(false);
  }, [selectedTestCase?._id]);

  const trimConversation = (conv) =>
    (conv || []).map((m) => ({
      ...m,
      content: typeof m?.content === "string" ? m.content.trim() : m?.content,
    }));

  // Detect unsaved changes (compare trimmed values to avoid whitespace-only diffs).
  useEffect(() => {
    if (!selectedTestCase) return;
    const originalConv = JSON.stringify(trimConversation(selectedTestCase?.conversation || []));
    const editedConv = JSON.stringify(trimConversation(editedConversation));
    const originalExp = (getExpectedValue(selectedTestCase) || "").trim();
    const editedExp = (editedExpected || "").trim();
    setHasUnsavedChanges(originalConv !== editedConv || originalExp !== editedExp);
  }, [editedConversation, editedExpected, selectedTestCase]);

  const handleConversationChange = (idx, newContent) => {
    setEditedConversation((prev) => prev.map((m, i) => (i === idx ? { ...m, content: newContent } : m)));
  };

  const handleConversationBlur = (idx) => {
    setEditedConversation((prev) =>
      prev.map((m, i) => {
        if (i !== idx) return m;
        if (typeof m?.content !== "string") return m;
        const trimmed = m.content.trim();
        return trimmed === m.content ? m : { ...m, content: trimmed };
      })
    );
    if (hasUnsavedChanges) handleSaveChanges();
  };

  const handleExpectedBlur = () => {
    const trimmed = (editedExpected || "").trim();
    if (trimmed !== editedExpected) setEditedExpected(trimmed);
    if (hasUnsavedChanges) handleSaveChanges();
  };

  const handleSaveChanges = async () => {
    const trimmedConversation = trimConversation(editedConversation);
    const trimmedExpected = (editedExpected || "").trim();

    const originalConv = JSON.stringify(trimConversation(selectedTestCase?.conversation || []));
    const editedConv = JSON.stringify(trimmedConversation);
    const originalExp = (getExpectedValue(selectedTestCase) || "").trim();
    if (originalConv === editedConv && originalExp === trimmedExpected) {
      setHasUnsavedChanges(false);
      return;
    }

    const isToolCallType = selectedTestCase?.type === "function" || selectedTestCase?.expected?.tool_calls;
    let updatedExpected;
    if (isToolCallType) {
      try {
        updatedExpected = { tool_calls: JSON.parse(trimmedExpected) };
      } catch {
        updatedExpected = { response: trimmedExpected };
      }
    } else {
      updatedExpected = { response: trimmedExpected };
    }

    // Reflect trimmed values locally so the inputs don't keep stale whitespace.
    setEditedConversation(trimmedConversation);
    setEditedExpected(trimmedExpected);

    await dispatch(
      updateTestCaseAction({
        testCaseId: selectedTestCase?._id,
        dataToUpdate: {
          conversation: trimmedConversation,
          type: selectedTestCase?.type,
          expected: updatedExpected,
          matching_type: selectedTestCase?.matching_type,
          variables: selectedTestCase?.variables,
        },
      })
    );

    setHasUnsavedChanges(false);
    // Note: no refetch needed — reducer updates state from API response (fresh updatedAt).
    // Refetching here can race with backend consistency and overwrite the new updatedAt with stale data.
  };

  // Sync comparison versions with selected versions
  // If no versions selected, default to first 2 available versions
  useEffect(() => {
    if (Array.isArray(selectedVersions) && selectedVersions.length > 0) {
      setComparisonVersions(selectedVersions);
    } else if (Array.isArray(versions) && versions.length > 0 && comparisonVersions.length === 0) {
      setComparisonVersions(versions.slice(0, Math.min(2, versions.length)));
    }
  }, [selectedVersions, versions]);

  // Get version data from Redux
  const bridgeVersionMapping = useCustomSelector(
    (state) => state?.bridgeReducer?.bridgeVersionMapping?.[bridgeId] || {}
  );

  // Reset test case variables and alert state when selectedTestCase changes
  useEffect(() => {
    setTestCaseVariables(selectedTestCase?.variables || {});
    setShowVariableAlert(false);
  }, [selectedTestCase?._id]);

  // Update run button disabled state when test case or versions are updated

  // Fetch variables from selected versions
  useEffect(() => {
    const mergedVersionVariables = {};
    const versionsToFetch = [];

    selectedVersions.forEach((versionId) => {
      if (versionId) {
        if (bridgeVersionMapping[versionId]) {
          const versionData = bridgeVersionMapping[versionId];
          // variables_state is stored under agent_info on the version document.
          const variableState = versionData?.agent_info?.variables_state || {};
          mergedVersionVariables[versionId] = variableState;
        } else {
          versionsToFetch.push(versionId);
        }
      }
    });

    setVersionVariables(mergedVersionVariables);
  }, [selectedVersions, bridgeVersionMapping, dispatch]);

  // Function to merge variables intelligently. `pre_function` is an
  // internal/system-managed variable; exclude it from the user-facing merged
  // set so it doesn't trigger the empty-variables alert or get sent on run.
  const getMergedVariables = () => {
    const merged = {};

    // First, add variables from all selected versions
    Object.entries(versionVariables || {}).forEach(([versionId, versionVars]) => {
      if (typeof versionVars === "object" && versionVars !== null) {
        Object.entries(versionVars).forEach(([key, varData]) => {
          if (key === "pre_function") return;
          // Use test case value if available, otherwise use version value
          merged[key] = testCaseVariables[key] || varData?.value || "";
        });
      }
    });

    // Add any test case variables that aren't in version variables
    Object.entries(testCaseVariables || {}).forEach(([key, value]) => {
      if (key === "pre_function") return;
      if (!merged[key]) {
        merged[key] = value;
      }
    });

    return merged;
  };

  // Function to check if any variables have empty values
  const hasEmptyVariables = () => {
    const allVariables = getMergedVariables();

    // Check if any variable has empty value
    return Object.values(allVariables).some((value) => !value || value.toString().trim() === "");
  };

  // Function to handle run with variable validation
  const handleRunWithVariableCheck = async (testCaseId) => {
    const mergedVars = getMergedVariables();

    if (hasEmptyVariables()) {
      setShowVariableAlert(true);
      openModal(MODAL_TYPE.TEST_CASE_VARIABLES_MODAL);
      return;
    }

    await handleRunSingleTestCase(testCaseId, mergedVars);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDropdown]);

  if (!selectedTestCase) return null;

  const isRunningThis = runningTestCaseId === selectedTestCase?._id;

  const handleAddVersion = () => {
    const available = versions.find((v) => !comparisonVersions.includes(v));
    if (available) setComparisonVersions([...comparisonVersions, available]);
  };

  const handleRemoveVersion = (versionToRemove) => {
    setComparisonVersions(comparisonVersions.filter((v) => v !== versionToRemove));
  };

  const handleVersionChange = (index, newVersion) => {
    const updated = [...comparisonVersions];
    updated[index] = newVersion;
    setComparisonVersions(updated);
    setOpenDropdown(null);
  };

  return (
    <div className="overflow-hidden h-full min-h-0" data-testid="testcase-details-panel">
      <div
        className="bg-base-100 border border-base-200 rounded-xl overflow-hidden flex flex-col h-full min-h-0"
        data-testid="testcase-details-panel-card"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-base-200 flex items-center justify-end bg-base-50">
          <div className="flex items-center gap-2">
            <button
              data-testid="testcase-run-button"
              onClick={() => handleRunWithVariableCheck(selectedTestCase?._id)}
              className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-content border border-primary rounded-lg flex items-center gap-2 font-medium transition-all text-xs"
            >
              {isRunningThis ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Running
                </>
              ) : (
                <>
                  <PlayIcon size={12} />
                  Run this testcase
                </>
              )}
            </button>
            <button
              data-testid="testcase-edit-variables-button"
              onClick={() => openModal(MODAL_TYPE.TEST_CASE_VARIABLES_MODAL)}
              className="p-1.5 text-base-content bg-base-200 rounded-lg transition-colors"
              title="Edit variables"
            >
              <Settings size={14} />
            </button>
            <button
              data-testid="testcase-delete-button"
              onClick={async () => {
                setIsDeleting(true);
                try {
                  await handleDeleteTestCase(selectedTestCase?._id);
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
              title={isDeleting ? "Deleting test case..." : "Delete test case"}
              className={`p-1.5 rounded-lg transition-colors ${
                isDeleting
                  ? "text-base-content/20 cursor-not-allowed"
                  : "text-base-content/40 text-error hover:bg-error/10"
              }`}
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-xs inline-block"></span>
              ) : (
                <TrashIcon size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1 p-6" data-testid="testcase-details-content">
          {/* Conversation History */}
          {editedConversation.slice(0, -1).length > 0 && (
            <div className="mb-6">
              <button
                data-testid="testcase-conversation-toggle"
                onClick={() => setIsConversationOpen(!isConversationOpen)}
                className="w-full flex items-center justify-between bg-base-50 hover:bg-base-100 rounded-lg px-4 py-3 border border-base-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-base-content">Conversation History</span>
                  <span className="text-xs text-base-content/60">({editedConversation.slice(0, -1).length})</span>
                </div>
                <ChevronDownIcon
                  size={16}
                  className={`text-base-content/40 transition-transform ${isConversationOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isConversationOpen && (
                <div className="mt-3 bg-white rounded-lg px-6 py-4 border border-base-200 space-y-4">
                  {editedConversation.slice(0, -1).map((message, idx) => {
                    const isStringContent = typeof message?.content === "string";
                    const isUser = message?.role === "user";
                    const nextMessage = editedConversation[idx + 1];
                    const isLastUserMessage = isUser && nextMessage?.role === "assistant";

                    return (
                      <div key={idx} className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1`}>
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {isUser ? "User" : "AI"}
                        </span>
                        <div className={`flex ${isUser ? "flex-row-reverse" : "flex-row"} items-end gap-2 group`}>
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                              isUser
                                ? "bg-blue-500 text-white rounded-br-none"
                                : "bg-gray-100 text-gray-800 rounded-bl-none"
                            }`}
                          >
                            {isStringContent ? (
                              <div className="text-sm leading-relaxed break-words">{message?.content || ""}</div>
                            ) : (
                              <div className="text-sm leading-relaxed break-words">
                                {JSON.stringify(message?.content)}
                              </div>
                            )}
                          </div>
                          {isLastUserMessage && (
                            <button
                              onClick={async () => {
                                const newConversation = editedConversation.filter((_, i) => i !== idx && i !== idx + 1);
                                setEditedConversation(newConversation);
                                setHasUnsavedChanges(true);
                                // Save changes after state update
                                setTimeout(() => {
                                  const trimmedConversation = trimConversation(newConversation);
                                  const trimmedExpected = (editedExpected || "").trim();
                                  const originalConv = JSON.stringify(
                                    trimConversation(selectedTestCase?.conversation || [])
                                  );
                                  const editedConv = JSON.stringify(trimmedConversation);
                                  const originalExp = (getExpectedValue(selectedTestCase) || "").trim();

                                  if (originalConv !== editedConv || originalExp !== trimmedExpected) {
                                    dispatch(
                                      updateTestCaseAction({
                                        testCaseId: selectedTestCase?._id,
                                        dataToUpdate: {
                                          conversation: trimmedConversation,
                                          type: selectedTestCase?.type,
                                          expected: selectedTestCase?.expected,
                                          matching_type: selectedTestCase?.matching_type,
                                          variables: selectedTestCase?.variables,
                                        },
                                      })
                                    );
                                    setHasUnsavedChanges(false);
                                  }
                                }, 0);
                              }}
                              className="flex-shrink-0 w-6 h-6 rounded border border-gray-300 bg-white text-gray-600 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                              title="Delete message"
                            >
                              <TrashIcon size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Input Section - last user message (editable) */}
          {(() => {
            const lastUserIdx = [...editedConversation]
              .map((m, i) => ({ m, i }))
              .reverse()
              .find(({ m }) => m?.role === "user")?.i;
            if (lastUserIdx === undefined) return null;
            const lastUserContent = editedConversation[lastUserIdx]?.content || "";
            return (
              <div className="mb-5">
                <div
                  className="text-xs font-semibold text-base-content/70 mb-2 uppercase tracking-wide"
                  data-testid="testcase-input-label"
                >
                  Input
                </div>
                <div
                  className="bg-base-50 rounded-lg px-4 py-3 border border-base-200"
                  data-testid="testcase-input-panel"
                >
                  <AutoResizeTextarea
                    data-testid="testcase-input-textarea"
                    value={typeof lastUserContent === "string" ? lastUserContent : JSON.stringify(lastUserContent)}
                    onChange={(e) => handleConversationChange(lastUserIdx, e.target.value)}
                    onBlur={() => handleConversationBlur(lastUserIdx)}
                    className="w-full bg-transparent text-sm text-base-content leading-relaxed outline-none"
                  />
                </div>
              </div>
            );
          })()}

          {/* Expected Output — collapses to 6 lines with "...show more" */}
          <div className="mb-6">
            <div
              className="text-xs font-semibold text-base-content/70 mb-2 uppercase tracking-wide flex items-center gap-1.5"
              data-testid="testcase-expected-label"
            >
              Expected Output
            </div>
            <div className="bg-base-50 rounded-lg border border-base-200" data-testid="testcase-expected-panel">
              {/* Clipped content area */}
              <div
                style={{
                  maxHeight: isExpectedExpanded ? "none" : "calc(6 * 1.625rem)",
                  overflow: "hidden",
                }}
                className="px-4 pt-3 pb-1"
              >
                <AutoResizeTextarea
                  data-testid="testcase-expected-textarea"
                  value={editedExpected}
                  onChange={(e) => setEditedExpected(e.target.value)}
                  onBlur={handleExpectedBlur}
                  minRows={2}
                  className="w-full bg-transparent text-sm text-base-content leading-relaxed outline-none"
                />
              </div>

              {/* Show more / Show less row */}
              <div className="px-4 pb-2">
                {!isExpectedExpanded ? (
                  <button
                    onClick={() => setIsExpectedExpanded(true)}
                    className="text-xs text-primary hover:text-primary transition-colors"
                    data-testid="testcase-expected-show-more"
                  >
                    ... show more
                  </button>
                ) : (
                  <button
                    onClick={() => setIsExpectedExpanded(false)}
                    className="text-xs text-base-content/50 hover:text-primary transition-colors"
                    data-testid="testcase-expected-show-less"
                  >
                    show less
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Version Comparison (independent of run-version selection) */}
          <div ref={dropdownRef} data-testid="testcase-comparison-section">
            <div className="mb-5 flex items-center gap-2 flex-wrap" data-testid="testcase-comparison-controls">
              <span className="text-sm font-medium text-base-content" data-testid="testcase-comparison-label">
                Compare:
              </span>
              <div className="flex items-center gap-2 flex-wrap" data-testid="testcase-comparison-version-list">
                {comparisonVersions.map((version, idx) => {
                  const availableForThisSlot = versions.filter((v) => v === version || !comparisonVersions.includes(v));
                  return (
                    <div key={idx} className="relative" data-testid={`testcase-comparison-version-${idx}`}>
                      <div className="dropdown" data-testid={`testcase-comparison-dropdown-${idx}`}>
                        <div
                          tabIndex={0}
                          role="button"
                          data-testid={`testcase-comparison-dropdown-button-${idx}`}
                          className="px-2 py-1 bg-base-100 border border-base-200 rounded-md text-xs font-medium text-base-content hover:bg-base-200 flex items-center gap-1.5 transition-all"
                        >
                          V{versions.indexOf(version) + 1}
                          <ChevronDownIcon size={12} className="text-base-content/40" />
                        </div>
                        <ul
                          tabIndex={0}
                          className="dropdown-content menu bg-base-100 border border-base-200 rounded-md shadow-lg z-30 min-w-[120px] max-h-60 overflow-y-auto p-1 mt-1 flex-nowrap"
                          data-testid={`testcase-comparison-dropdown-menu-${idx}`}
                        >
                          {availableForThisSlot.map((v, vIdx) => (
                            <li key={vIdx}>
                              <button
                                data-testid={`testcase-comparison-version-option-${idx}-${versions.indexOf(v) + 1}`}
                                onClick={(e) => {
                                  handleVersionChange(idx, v);
                                  e.currentTarget.blur();
                                }}
                                className={`text-sm ${v === version ? "bg-primary/10 text-primary font-semibold" : ""}`}
                              >
                                V{versions.indexOf(v) + 1}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {comparisonVersions.length > 1 && (
                        <button
                          data-testid={`testcase-comparison-remove-version-${idx}`}
                          onClick={() => handleRemoveVersion(version)}
                          className="absolute -top-1.5 -right-1.5 p-0.5 bg-base-100 text-base-content/60 hover:text-error border border-base-300 hover:border-error rounded-full transition-colors shadow-sm z-10"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {comparisonVersions.length < versions.length && (
                  <button
                    data-testid="testcase-comparison-add-version"
                    onClick={handleAddVersion}
                    className="px-2 py-1 bg-base-100 border border-dashed border-primary/40 rounded-md text-xs font-medium text-primary hover:bg-primary/5 flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={12} />
                    Add Version
                  </button>
                )}
              </div>
            </div>

            {/* Version Outputs Grid */}
            {comparisonVersions.length > 0 ? (
              <div
                className={`grid gap-4 ${comparisonVersions.length === 1 ? "grid-cols-1" : comparisonVersions.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
                data-testid="testcase-version-output-grid"
              >
                {comparisonVersions.map((version, idx) => {
                  const versionArray = selectedTestCase?.version_history?.[version] || [];
                  const totalRuns = versionArray.length;
                  const currentIdx = runIndices[version] ?? 0;
                  const safeIdx = Math.min(currentIdx, Math.max(totalRuns - 1, 0));
                  const currentRun = versionArray[safeIdx];
                  const hasRun = !!currentRun;
                  const score = currentRun?.score || 0;
                  const modelOutput = currentRun?.model_output;
                  const runError = currentRun?.error;
                  const runErrorMessage =
                    typeof runError === "string"
                      ? runError
                      : runError?.error || runError?.message || (runError ? "Run failed" : null);
                  const toolsCallData = currentRun?.tools_call_data || [];
                  const matchingTypeFromResult = selectedTestCase?.matching_type || "cosine";

                  const goPrev = () =>
                    setRunIndices((prev) => ({
                      ...prev,
                      [version]: Math.min(safeIdx + 1, totalRuns - 1),
                    }));
                  const goNext = () =>
                    setRunIndices((prev) => ({
                      ...prev,
                      [version]: Math.max(safeIdx - 1, 0),
                    }));

                  return (
                    <div
                      key={idx}
                      data-testid={`testcase-version-output-card-${versions.indexOf(version) + 1}`}
                      className={`bg-base-50 border rounded-lg p-4 h-fit ${runErrorMessage ? "border-error/40" : "border-base-200"}`}
                    >
                      <div className="flex flex-col gap-1.5 mb-3 pb-3 border-b border-base-200">
                        {/* Top row: version label + score/error */}
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-primary uppercase tracking-wide">
                              v{versions.indexOf(version) + 1}
                            </div>
                            {(currentRun?.model || currentRun?.metadata?.model) && (
                              <div
                                className="flex items-center flex-wrap gap-1 mt-0.5 text-[10px] text-base-content/60 font-medium min-w-0"
                                title={currentRun?.service || ""}
                              >
                                {currentRun?.service && (
                                  <span className="inline-flex items-center flex-shrink-0">
                                    {getIconOfService(currentRun.service, 12, 12)}
                                  </span>
                                )}
                                <span className="truncate">{currentRun?.model || currentRun?.metadata?.model}</span>

                                {/* Tokens + cost inline with model — sm/md only */}
                                {hasRun &&
                                  !runErrorMessage &&
                                  (currentRun?.tokens?.total_tokens > 0 || currentRun?.cost > 0) && (
                                    <>
                                      {currentRun?.tokens?.total_tokens > 0 && (
                                        <span
                                          className="lg:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-200/60"
                                          title={`Input: ${currentRun.tokens.input_tokens} • Output: ${currentRun.tokens.output_tokens}`}
                                        >
                                          <span className="font-medium text-base-content/70">Tokens</span>
                                          <span className="font-mono">
                                            {currentRun.tokens.total_tokens.toLocaleString()}
                                          </span>
                                        </span>
                                      )}
                                      {currentRun?.cost > 0 && (
                                        <span
                                          className="lg:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-200/60"
                                          title="Estimated cost"
                                        >
                                          <span className="font-medium text-base-content/70">Cost</span>
                                          <span className="font-mono">${currentRun.cost.toFixed(4)}</span>
                                        </span>
                                      )}
                                    </>
                                  )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Tokens + cost inline — lg screens only */}
                            {hasRun &&
                              !runErrorMessage &&
                              (currentRun?.tokens?.total_tokens > 0 || currentRun?.cost > 0) && (
                                <div className="hidden lg:flex items-center gap-1.5 text-xs text-base-content/50">
                                  {currentRun?.tokens?.total_tokens > 0 && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-200/60"
                                      title={`Input: ${currentRun.tokens.input_tokens} • Output: ${currentRun.tokens.output_tokens}`}
                                    >
                                      <span className="font-medium text-base-content/70">Tokens</span>
                                      <span className="font-mono">
                                        {currentRun.tokens.total_tokens.toLocaleString()}
                                      </span>
                                    </span>
                                  )}
                                  {currentRun?.cost > 0 && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-200/60"
                                      title="Estimated cost"
                                    >
                                      <span className="font-medium text-base-content/70">Cost</span>
                                      <span className="font-mono">${currentRun.cost.toFixed(4)}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            {!hasRun ? null : runErrorMessage ? (
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full bg-error/10 text-error"
                                data-testid={`testcase-version-output-error-${versions.indexOf(version) + 1}`}
                              >
                                Error
                              </span>
                            ) : (
                              <span
                                className={`text-lg font-bold cursor-help ${getScoreColor(score, matchingTypeFromResult)}`}
                                title={getScoreMessage(score, matchingTypeFromResult)}
                              >
                                {getScoreDisplay(score, matchingTypeFromResult)}
                              </span>
                            )}
                            {totalRuns > 1 && (
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  onClick={goPrev}
                                  disabled={safeIdx >= totalRuns - 1}
                                  className="w-6 h-6 flex items-center justify-center rounded border border-base-300 bg-base-100 text-base-content/70 hover:bg-base-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Previous run (older)"
                                >
                                  <ChevronLeft size={14} />
                                </button>
                                <span className="text-xs text-base-content/60 min-w-[28px] text-center">
                                  {totalRuns - safeIdx}/{totalRuns}
                                </span>
                                <button
                                  onClick={goNext}
                                  disabled={safeIdx <= 0}
                                  className="w-6 h-6 flex items-center justify-center rounded border border-base-300 bg-base-100 text-base-content/70 hover:bg-base-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Next run (newer)"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tool calls display */}
                      {toolsCallData.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {toolsCallData
                            .flatMap((toolObj) => Object.values(toolObj || {}))
                            .map((toolEntry, toolIdx) => {
                              if (!toolEntry) return null;
                              const toolName =
                                toolEntry.name ||
                                toolEntry.display_tool_name ||
                                toolEntry.model_tool_name ||
                                "Unknown Tool";
                              const toolType = toolEntry.type || "tool";
                              const isRAGTool = toolEntry?.data?.metadata?.type === "RAG";
                              const isAgentTool = toolEntry?.type?.toUpperCase() === "AGENT";
                              const isUnclickable = isRAGTool || isAgentTool;

                              return (
                                <div
                                  key={toolIdx}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-md text-xs font-medium transition-colors ${
                                    isRAGTool
                                      ? "bg-info/10 border-info/30 text-info hover:bg-info/20 cursor-default"
                                      : isAgentTool
                                        ? "bg-base-200/50 border-base-300 text-base-content/70 cursor-default"
                                        : "bg-base-200/50 border-base-300 text-base-content/70 hover:bg-base-300 cursor-pointer"
                                  }`}
                                  onClick={() => {
                                    if (!isUnclickable) handleToolPrimaryClick(toolEntry);
                                  }}
                                >
                                  <span className={isRAGTool ? "" : "text-base-content"}>{toolName}</span>
                                  <span className="text-base-content/40">·</span>
                                  <span className="text-base-content/50 capitalize">{toolType}</span>
                                  <div
                                    className="tooltip tooltip-top"
                                    data-tip={
                                      isRAGTool ? "knowledge base data" : isAgentTool ? "agent data" : "function data"
                                    }
                                  >
                                    <FileClockIcon
                                      size={12}
                                      className="opacity-50 hover:opacity-100 ml-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setToolsData(toolEntry);
                                        toolsDataModalRef.current?.showModal();
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                      {!hasRun ? (
                        <div
                          className="text-xs text-base-content/40 italic mb-3"
                          data-testid={`testcase-version-output-empty-${versions.indexOf(version) + 1}`}
                        >
                          Not run yet
                        </div>
                      ) : runErrorMessage ? (
                        <div
                          className="text-sm leading-relaxed mb-3 p-3 rounded-md bg-error/5 border border-error/20 text-error break-words"
                          data-testid={`testcase-version-output-error-message-${versions.indexOf(version) + 1}`}
                        >
                          {runErrorMessage}
                        </div>
                      ) : (
                        <div className="text-sm text-base-content leading-relaxed mb-3">
                          {typeof modelOutput === "string" ? (
                            <ReactMarkdown
                              components={{
                                code: ({ node, inline, className, children, ...props }) => (
                                  <CodeBlock className={className} {...props}>
                                    {children}
                                  </CodeBlock>
                                ),
                              }}
                            >
                              {modelOutput}
                            </ReactMarkdown>
                          ) : (
                            JSON.stringify(modelOutput)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="bg-base-50 border border-dashed border-base-200 rounded-lg px-4 py-8 text-center"
                data-testid="testcase-version-output-empty-state"
              >
                <p className="text-sm text-base-content/60">Add a version above to start comparing outputs.</p>
              </div>
            )}

            {/* DEPRECATED Version History Section - replaced by inline pagination */}
            {false && selectedTestCase?.version_history && Object.keys(selectedTestCase.version_history).length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-base font-semibold text-base-content">Execution History</h3>
                {Object.entries(selectedTestCase.version_history).map(([versionId, runs]) => {
                  const versionIndex = versions.findIndex((v) => v === versionId) + 1;
                  const isExpanded = false;
                  const totalRuns = Array.isArray(runs) ? runs.length : 0;

                  return (
                    <div key={versionId} className="space-y-3">
                      {/* Version Header with Toggle */}
                      <button
                        onClick={() =>
                          setExpandedVersionHistory((prev) => ({
                            ...prev,
                            [versionId]: !prev[versionId],
                          }))
                        }
                        className="w-full flex items-center justify-between px-4 py-3 bg-base-50 hover:bg-base-100 rounded-lg border border-base-200 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-primary">v{versionIndex}</span>
                          <span className="text-xs text-base-content/60">version default</span>
                          <span className="text-xs text-base-content/40">
                            ({totalRuns} run{totalRuns !== 1 ? "s" : ""})
                          </span>
                        </div>
                        <ChevronDownIcon
                          size={18}
                          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Expanded Grid of Runs */}
                      {isExpanded && Array.isArray(runs) && runs.length > 0 && (
                        <div
                          className={`grid gap-4 ${runs.length === 1 ? "grid-cols-1" : runs.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
                        >
                          {runs.map((run, runIdx) => {
                            const score = run?.score || 0;
                            const modelOutput = run?.model_output;
                            const runError = run?.error;
                            const runErrorMessage =
                              typeof runError === "string"
                                ? runError
                                : runError?.error || runError?.message || (runError ? "Run failed" : null);
                            const toolsCallData = run?.tools_call_data || [];
                            const matchingTypeFromResult = selectedTestCase?.matching_type || "cosine";

                            return (
                              <div
                                key={runIdx}
                                className={`bg-base-50 border rounded-lg p-4 h-fit ${runErrorMessage ? "border-error/40" : "border-base-200"}`}
                              >
                                {/* Header with Run Number and Score */}
                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-base-200">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-primary uppercase tracking-wide">
                                      Run #{totalRuns - runIdx}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {runErrorMessage ? (
                                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-error/10 text-error">
                                        Error
                                      </span>
                                    ) : (
                                      <span
                                        className={`text-lg font-bold cursor-help ${getScoreColor(score, matchingTypeFromResult)}`}
                                        title={getScoreMessage(score, matchingTypeFromResult)}
                                      >
                                        {getScoreDisplay(score, matchingTypeFromResult)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Timestamp */}
                                <div className="text-xs text-base-content/50 mb-3">
                                  {run?.created_at ? new Date(run.created_at).toLocaleString() : "N/A"}
                                </div>

                                {/* Tool calls display */}
                                {toolsCallData.length > 0 && (
                                  <div className="mb-3 flex flex-wrap gap-2">
                                    {toolsCallData
                                      .flatMap((toolObj) => Object.values(toolObj || {}))
                                      .map((toolEntry, toolIdx) => {
                                        if (!toolEntry) return null;
                                        const toolName =
                                          toolEntry.name ||
                                          toolEntry.display_tool_name ||
                                          toolEntry.model_tool_name ||
                                          "Unknown Tool";
                                        const toolType = toolEntry.type || "tool";
                                        const isRAGTool = toolEntry?.data?.metadata?.type === "RAG";
                                        const isAgentTool = toolEntry?.type?.toUpperCase() === "AGENT";
                                        const isUnclickable = isRAGTool || isAgentTool;

                                        return (
                                          <div
                                            key={toolIdx}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-md text-xs font-medium transition-colors ${
                                              isRAGTool
                                                ? "bg-info/10 border-info/30 text-info hover:bg-info/20 cursor-default"
                                                : isAgentTool
                                                  ? "bg-base-200/50 border-base-300 text-base-content/70 cursor-default"
                                                  : "bg-base-200/50 border-base-300 text-base-content/70 hover:bg-base-300 cursor-pointer"
                                            }`}
                                            onClick={() => {
                                              if (!isUnclickable) handleToolPrimaryClick(toolEntry);
                                            }}
                                          >
                                            <span className={isRAGTool ? "" : "text-base-content"}>{toolName}</span>
                                            <span className="text-base-content/40">·</span>
                                            <span className="text-base-content/50 capitalize">{toolType}</span>
                                            <div
                                              className="tooltip tooltip-top"
                                              data-tip={
                                                isRAGTool
                                                  ? "knowledge base data"
                                                  : isAgentTool
                                                    ? "agent data"
                                                    : "function data"
                                              }
                                            >
                                              <FileClockIcon
                                                size={12}
                                                className="opacity-50 hover:opacity-100 ml-1"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setToolsData(toolEntry);
                                                  toolsDataModalRef.current?.showModal();
                                                }}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}

                                {/* Model Output or Error */}
                                {runErrorMessage ? (
                                  <div className="text-sm leading-relaxed p-3 rounded-md bg-error/5 border border-error/20 text-error break-words">
                                    {runErrorMessage}
                                  </div>
                                ) : (
                                  <div className="text-sm text-base-content leading-relaxed">
                                    {typeof modelOutput === "string" ? (
                                      <ReactMarkdown
                                        components={{
                                          code: ({ node, inline, className, children, ...props }) => (
                                            <CodeBlock className={className} {...props}>
                                              {children}
                                            </CodeBlock>
                                          ),
                                        }}
                                      >
                                        {modelOutput}
                                      </ReactMarkdown>
                                    ) : (
                                      JSON.stringify(modelOutput)
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variables Modal */}
      <TestCaseVariablesModal
        testCaseId={selectedTestCase?._id}
        testCaseVariables={testCaseVariables}
        versionVariables={versionVariables}
        showAlert={showVariableAlert}
        onSave={(updatedVariables) => {
          // Update test case variables in state
          setTestCaseVariables(updatedVariables);
          setShowVariableAlert(false);

          // Update test case in database with all required fields
          dispatch(
            updateTestCaseAction({
              testCaseId: selectedTestCase?._id,
              dataToUpdate: {
                conversation: selectedTestCase?.conversation,
                type: selectedTestCase?.type,
                expected: selectedTestCase?.expected,
                matching_type: selectedTestCase?.matching_type,
                variables: updatedVariables,
              },
            })
          );

          // Refetch test cases to update the UI with latest data
          if (onTestCaseUpdate) {
            onTestCaseUpdate();
          }

          // If there was an alert, proceed with running the test case
          if (showVariableAlert) {
            handleRunSingleTestCase(selectedTestCase?._id, updatedVariables);
          }
        }}
      />
      <ToolsDataModal
        toolsData={toolsData}
        handleClose={handleCloseToolsDataModal}
        toolsDataModalRef={toolsDataModalRef}
        integrationData={{}}
      />
    </div>
  );
};

export default TestCaseDetailsPanel;
