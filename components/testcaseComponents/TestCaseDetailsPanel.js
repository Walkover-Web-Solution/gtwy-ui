import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  PlayIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
  Settings,
  Copy,
  Check as CheckIcon,
  GripVertical,
} from "lucide-react";
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
import InfoTooltip from "@/components/InfoTooltip";
import { setTestCaseConfig } from "@/store/reducer/testCaseConfigReducer";
import ExpandCollapse from "@/components/UI/ExpandCollapse";

const TestCaseDetailsPanel = ({
  selectedTestCase,
  selectedVersions,
  versions,
  runningTestCaseId,
  isloading,
  testRun,
  handleRunSingleTestCase,
  handleDeleteTestCase,
  getScoreColor,
  getScoreMessage,
  getScoreDisplay,
  bridgeId,
}) => {
  const dispatch = useDispatch();

  // Comparison versions follow the single source of truth: `selectedVersions` from header.
  // Fall back to first 2 versions if nothing selected (defensive only).
  const baseComparisonVersions = useMemo(() => {
    if (Array.isArray(selectedVersions) && selectedVersions.length > 0) return selectedVersions;
    if (Array.isArray(versions) && versions.length > 0) return versions.slice(0, Math.min(2, versions.length));
    return [];
  }, [selectedVersions, versions]);

  // Local display order (user-draggable). Re-syncs when the base selection changes,
  // preserving the relative order of versions that still exist and appending new ones.
  // Initial order is hydrated from the persisted per-bridge config.
  const persistedVersionOrder = useCustomSelector(
    (state) => state?.testCaseConfigReducer?.configs?.[bridgeId]?.versionOrder || []
  );
  const [versionOrder, setVersionOrderState] = useState(() => {
    const valid = persistedVersionOrder.filter((v) => baseComparisonVersions.includes(v));
    const missing = baseComparisonVersions.filter((v) => !valid.includes(v));
    return [...valid, ...missing];
  });
  const setVersionOrder = useCallback(
    (next) => {
      setVersionOrderState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        if (bridgeId) dispatch(setTestCaseConfig({ bridgeId, versionOrder: value }));
        return value;
      });
    },
    [dispatch, bridgeId]
  );
  useEffect(() => {
    setVersionOrder((prev) => {
      const kept = prev.filter((v) => baseComparisonVersions.includes(v));
      const added = baseComparisonVersions.filter((v) => !kept.includes(v));
      return [...kept, ...added];
    });
  }, [baseComparisonVersions]);
  const comparisonVersions = versionOrder;

  const [draggedVersion, setDraggedVersion] = useState(null);
  const handleVersionDragStart = (e, version) => {
    setDraggedVersion(version);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleVersionDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleVersionDrop = (e, targetVersion) => {
    e.preventDefault();
    if (!draggedVersion || draggedVersion === targetVersion) {
      setDraggedVersion(null);
      return;
    }
    setVersionOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(draggedVersion);
      const to = next.indexOf(targetVersion);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, draggedVersion);
      return next;
    });
    setDraggedVersion(null);
  };
  const handleVersionDragEnd = () => setDraggedVersion(null);

  // Auto-scroll the details content container while dragging near its edges
  const scrollContainerRef = useRef(null);
  useEffect(() => {
    if (!draggedVersion) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const EDGE = 80; // px from top/bottom edge that triggers auto-scroll
    const MAX_SPEED = 24; // px per frame
    let pointerY = 0;
    let rafId = null;

    const tick = () => {
      const rect = el.getBoundingClientRect();
      const distTop = pointerY - rect.top;
      const distBottom = rect.bottom - pointerY;
      let delta = 0;
      if (distTop < EDGE && distTop > -EDGE) {
        delta = -MAX_SPEED * (1 - Math.max(0, distTop) / EDGE);
      } else if (distBottom < EDGE && distBottom > -EDGE) {
        delta = MAX_SPEED * (1 - Math.max(0, distBottom) / EDGE);
      }
      if (delta !== 0) el.scrollTop += delta;
      rafId = requestAnimationFrame(tick);
    };

    const onDragOver = (e) => {
      pointerY = e.clientY;
    };
    window.addEventListener("dragover", onDragOver);
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [draggedVersion]);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [versionVariables, setVersionVariables] = useState({});
  const [showVariableAlert, setShowVariableAlert] = useState(false);
  const [testCaseVariables, setTestCaseVariables] = useState({});
  const [editedConversation, setEditedConversation] = useState([]);
  const [editedExpected, setEditedExpected] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toolsData, setToolsData] = useState(null);
  // Per-card pagination index, keyed by `${versionId}::${modelKey}` so each
  // model tab keeps its own "newer/older" cursor.
  const [runIndices, setRunIndices] = useState({});
  // Active model tab per version card. Empty string = no override (default model).
  const [activeModelByVersion, setActiveModelByVersion] = useState({});

  // Build the same model key the reducer uses so the panel can group runs by
  // which (service, model) produced them.
  const buildRunModelKey = useCallback((run) => `${run?.service || ""}:${run?.model || ""}`, []);
  const [copiedVersion, setCopiedVersion] = useState(null);

  const handleCopyResponse = useCallback((versionId, output) => {
    const text = typeof output === "string" ? output : JSON.stringify(output, null, 2);
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedVersion(versionId);
      setTimeout(() => setCopiedVersion((curr) => (curr === versionId ? null : curr)), 1500);
    });
  }, []);
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

  const isVariableRequired = (key) => {
    return Object.values(versionVariables || {}).some((versionVars) => {
      const meta = versionVars?.[key];
      return meta && meta.status === "required";
    });
  };

  // Function to check if any REQUIRED variables have empty values
  const hasEmptyVariables = () => {
    const allVariables = getMergedVariables();
    return Object.entries(allVariables).some(([key, value]) => {
      if (!isVariableRequired(key)) return false;
      return !value || value.toString().trim() === "";
    });
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

  if (!selectedTestCase) return null;

  const isRunningThis = runningTestCaseId === selectedTestCase?._id;

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
              disabled={isloading || runningTestCaseId !== null}
              className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-content border border-primary rounded-lg flex items-center gap-2 font-medium transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div ref={scrollContainerRef} className="overflow-auto flex-1 p-6" data-testid="testcase-details-content">
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
                  <span className="text-xs text-base-content/60">
                    ({Math.ceil(editedConversation.slice(0, -1).length / 2)})
                  </span>
                </div>
                <ChevronDownIcon
                  size={16}
                  className={`text-base-content/40 transition-transform ${isConversationOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isConversationOpen && (
                <div className="mt-3 bg-base-100 rounded-lg px-6 py-4 border border-base-200 space-y-4">
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
                                ? "bg-primary text-primary-content rounded-br-none"
                                : "bg-base-200 text-base-content rounded-bl-none"
                            }`}
                          >
                            <ExpandCollapse collapsedHeight={160} fadeHeight={60}>
                              {isStringContent ? (
                                <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                  {message?.content || ""}
                                </div>
                              ) : (
                                <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                  {JSON.stringify(message?.content)}
                                </div>
                              )}
                            </ExpandCollapse>
                          </div>
                          {isLastUserMessage && (
                            <button
                              data-testid={`testcase-delete-msg-btn-${idx}`}
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
                  <ExpandCollapse collapsedHeight={160} fadeHeight={60}>
                    <AutoResizeTextarea
                      data-testid="testcase-input-textarea"
                      value={typeof lastUserContent === "string" ? lastUserContent : JSON.stringify(lastUserContent)}
                      onChange={(e) => handleConversationChange(lastUserIdx, e.target.value)}
                      onBlur={() => handleConversationBlur(lastUserIdx)}
                      className="w-full bg-transparent text-sm text-base-content leading-relaxed outline-none"
                    />
                  </ExpandCollapse>
                </div>
              </div>
            );
          })()}

          {/* Expected Output — collapses to 4 lines with "...show more" */}
          <div className="mb-6">
            <div
              className="text-xs font-semibold text-base-content/70 mb-2 uppercase tracking-wide flex items-center gap-1.5"
              data-testid="testcase-expected-label"
            >
              Expected Output
            </div>
            <div
              className="bg-base-50 rounded-lg border border-base-200 px-4 pt-3 pb-2"
              data-testid="testcase-expected-panel"
            >
              <ExpandCollapse collapsedHeight={160} fadeHeight={60}>
                <AutoResizeTextarea
                  data-testid="testcase-expected-textarea"
                  value={editedExpected}
                  onChange={(e) => setEditedExpected(e.target.value)}
                  onBlur={handleExpectedBlur}
                  minRows={2}
                  className="w-full bg-transparent text-sm text-base-content leading-relaxed outline-none"
                />
              </ExpandCollapse>
            </div>
          </div>
          {/* Version Comparison — driven by header "Versions" selector (single source of truth) */}
          <div data-testid="testcase-comparison-section">
            <div className="mb-5 flex items-center gap-2 flex-wrap" data-testid="testcase-comparison-controls">
              <span className="text-sm font-medium text-base-content" data-testid="testcase-comparison-label">
                Comparing:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap" data-testid="testcase-comparison-version-list">
                {comparisonVersions.map((version, idx) => (
                  <span
                    key={idx}
                    data-testid={`testcase-comparison-version-${idx}`}
                    draggable
                    onDragStart={(e) => handleVersionDragStart(e, version)}
                    onDragOver={handleVersionDragOver}
                    onDrop={(e) => handleVersionDrop(e, version)}
                    onDragEnd={handleVersionDragEnd}
                    title="Drag to reorder"
                    className={`px-2 py-1 bg-primary/10 border border-primary/30 rounded-md text-xs font-semibold text-primary cursor-grab active:cursor-grabbing select-none transition-opacity ${
                      draggedVersion === version ? "opacity-40" : ""
                    }`}
                  >
                    V{versions.indexOf(version) + 1}
                  </span>
                ))}
              </div>
              <span className="text-xs text-base-content/50 italic ml-1">
                Change selection from the <span className="font-semibold">Versions</span> dropdown above
              </span>
            </div>

            {/* Version Outputs Grid */}
            {comparisonVersions.length > 0 ? (
              <div
                className={`grid gap-4 ${comparisonVersions.length === 1 ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"}`}
                data-testid="testcase-version-output-grid"
              >
                {comparisonVersions.map((version, idx) => {
                  const allRunsForVersion = selectedTestCase?.version_history?.[version] || [];
                  // Distinct (service, model) tabs present in the run history.
                  // Order preserves first-seen-newest-first because the reducer
                  // unshifts new runs at index 0.
                  const modelTabs = (() => {
                    const seen = new Set();
                    const tabs = [];
                    allRunsForVersion.forEach((run) => {
                      if (!run?.model) return; // skip runs with no model (dead "Default" tab)
                      const key = buildRunModelKey(run);
                      if (seen.has(key)) return;
                      seen.add(key);
                      tabs.push({ key, model: run.model, service: run?.service || "" });
                    });
                    return tabs;
                  })();
                  const hasMultipleModels = modelTabs.length > 1;
                  // Active model key for this card. Default to the newest run's
                  // model (first tab) so single-model usage looks identical to
                  // before the multi-model change.
                  const activeModelKey =
                    activeModelByVersion[version] !== undefined
                      ? activeModelByVersion[version]
                      : modelTabs[0]?.key || "";
                  const activeTab = modelTabs.find((t) => t.key === activeModelKey) || modelTabs[0];
                  const versionArray = hasMultipleModels
                    ? allRunsForVersion.filter((run) => buildRunModelKey(run) === activeTab?.key)
                    : allRunsForVersion;
                  const totalRuns = versionArray.length;
                  const indexKey = `${version}::${activeTab?.key || ""}`;
                  const currentIdx = runIndices[indexKey] ?? 0;
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
                  const matchingTypeFromResult =
                    currentRun?.matching_type || selectedTestCase?.matching_type || "cosine";
                  // The reducer keys `seen` by `${versionId}:${modelKey}:${testcaseId}`.
                  // Treat the version as still pending if ANY model tab for this
                  // (version, testcase) hasn't reported yet.
                  const seenKeysForVersionTc = Object.keys(testRun?.seen || {}).filter(
                    (k) => k.startsWith(`${version}:`) && k.endsWith(`:${selectedTestCase?._id}`)
                  );
                  const versionHasAnyResult = seenKeysForVersionTc.length > 0;
                  // Only show pending if this testcase is part of the current run scope:
                  // - single run: testcaseId matches
                  // - bulk run: testcaseIds includes this id
                  // - run all: both testcaseId and testcaseIds are null/empty
                  const runScopedToThisTc = (() => {
                    const tcId = selectedTestCase?._id;
                    if (!tcId) return false;
                    if (testRun?.testcaseId) return testRun.testcaseId === tcId;
                    if (Array.isArray(testRun?.testcaseIds) && testRun.testcaseIds.length > 0) {
                      return testRun.testcaseIds.includes(tcId);
                    }
                    return true; // run all
                  })();
                  const isVersionPending =
                    testRun?.status === "running" &&
                    Array.isArray(testRun?.versionIds) &&
                    testRun.versionIds.includes(version) &&
                    runScopedToThisTc &&
                    !versionHasAnyResult;

                  const goPrev = () =>
                    setRunIndices((prev) => ({
                      ...prev,
                      [indexKey]: Math.min(safeIdx + 1, totalRuns - 1),
                    }));
                  const goNext = () =>
                    setRunIndices((prev) => ({
                      ...prev,
                      [indexKey]: Math.max(safeIdx - 1, 0),
                    }));

                  return (
                    <div
                      key={idx}
                      data-testid={`testcase-version-output-card-${versions.indexOf(version) + 1}`}
                      draggable
                      onDragStart={(e) => handleVersionDragStart(e, version)}
                      onDragOver={handleVersionDragOver}
                      onDrop={(e) => handleVersionDrop(e, version)}
                      onDragEnd={handleVersionDragEnd}
                      className={`bg-base-50 border rounded-lg p-4 h-fit relative transition-all cursor-grab active:cursor-grabbing ${
                        draggedVersion === version ? "opacity-50" : ""
                      } ${draggedVersion && draggedVersion !== version ? "ring-2 ring-primary/30" : ""} ${
                        isVersionPending ? "border-primary/40" : runErrorMessage ? "border-error/40" : "border-base-200"
                      }`}
                    >
                      {isVersionPending ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                          <div className="text-xs font-bold text-primary uppercase tracking-wide self-start">
                            v{versions.indexOf(version) + 1}
                          </div>
                          <span className="loading loading-spinner loading-lg text-primary"></span>
                          <p className="text-sm text-base-content/60">Running test case...</p>
                        </div>
                      ) : (
                        <>
                          {hasMultipleModels && (
                            <div
                              data-testid={`testcase-version-model-tabs-${versions.indexOf(version) + 1}`}
                              className="flex items-center gap-1 mb-2 -mt-1 overflow-x-auto"
                              role="tablist"
                            >
                              {modelTabs.map((tab) => {
                                const isActive = tab.key === activeTab?.key;
                                const label = tab.model;
                                return (
                                  <button
                                    key={tab.key}
                                    role="tab"
                                    aria-selected={isActive}
                                    title={tab.service ? `${tab.service} • ${label}` : label}
                                    onClick={() => setActiveModelByVersion((prev) => ({ ...prev, [version]: tab.key }))}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                                      isActive
                                        ? "bg-primary/10 text-primary border border-primary/30"
                                        : "bg-base-200/60 text-base-content/60 border border-transparent hover:bg-base-200"
                                    }`}
                                  >
                                    {tab.service && (
                                      <span className="inline-flex items-center mt-1 flex-shrink-0">
                                        {getIconOfService(tab.service, 12, 12)}
                                      </span>
                                    )}
                                    <span>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <div className="flex flex-col gap-1.5 mb-3 pb-3 border-b border-base-200">
                            {/* Top row: version label + score/error + pagination */}
                            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  draggable
                                  onDragStart={(e) => handleVersionDragStart(e, version)}
                                  onDragEnd={handleVersionDragEnd}
                                  title="Drag to reorder"
                                  className="cursor-grab active:cursor-grabbing text-base-content/40 hover:text-base-content/70 select-none"
                                >
                                  <GripVertical size={14} />
                                </span>
                                <div className="text-xs font-bold text-primary uppercase tracking-wide">
                                  v{versions.indexOf(version) + 1}
                                </div>
                                {hasRun && (
                                  <span
                                    title={`Matching type used: ${matchingTypeFromResult}`}
                                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-base-200 text-base-content/60"
                                  >
                                    {matchingTypeFromResult}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {!hasRun ? null : runErrorMessage ? (
                                  <span
                                    className="text-xs font-semibold px-2 py-0.5 rounded-full bg-error/10 text-error"
                                    data-testid={`testcase-version-output-error-${versions.indexOf(version) + 1}`}
                                  >
                                    Error
                                  </span>
                                ) : (
                                  <InfoTooltip
                                    tooltipContent={
                                      currentRun?.reason || getScoreMessage(score, matchingTypeFromResult)
                                    }
                                  >
                                    <span
                                      className={`text-lg font-bold cursor-help ${getScoreColor(score, matchingTypeFromResult)}`}
                                    >
                                      {getScoreDisplay(score, matchingTypeFromResult)}
                                    </span>
                                  </InfoTooltip>
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

                            {/* Bottom row: model name + metrics (wraps as needed) */}
                            {(currentRun?.model ||
                              currentRun?.metadata?.model ||
                              (hasRun &&
                                !runErrorMessage &&
                                (currentRun?.tokens?.total_tokens > 0 ||
                                  currentRun?.cost > 0 ||
                                  currentRun?.latency?.over_all_time > 0))) && (
                              <div
                                className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-base-content/60 font-medium w-full min-w-0"
                                title={currentRun?.service || ""}
                              >
                                {hasRun && !runErrorMessage && currentRun?.tokens?.total_tokens > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-200/60"
                                    title={`Input: ${currentRun.tokens.input_tokens} • Output: ${currentRun.tokens.output_tokens}`}
                                  >
                                    <span className="font-medium text-base-content/70">Tokens</span>
                                    <span className="font-mono">{currentRun.tokens.total_tokens.toLocaleString()}</span>
                                  </span>
                                )}
                                {hasRun && !runErrorMessage && currentRun?.cost > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-200/60"
                                    title="Estimated cost"
                                  >
                                    <span className="font-medium text-base-content/70">Cost</span>
                                    <span className="font-mono">${currentRun.cost.toFixed(4)}</span>
                                  </span>
                                )}
                                {hasRun && !runErrorMessage && currentRun?.latency?.over_all_time > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-200/60"
                                    title="Total time taken"
                                  >
                                    <span className="font-medium text-base-content/70">Time</span>
                                    <span className="font-mono">{currentRun.latency.over_all_time.toFixed(2)}s</span>
                                  </span>
                                )}
                              </div>
                            )}
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
                            <div className="relative group text-sm text-base-content leading-relaxed mb-3">
                              {modelOutput && (
                                <button
                                  onClick={() => handleCopyResponse(version, modelOutput)}
                                  className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded border border-base-300 bg-base-100 text-base-content/70 hover:bg-base-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Copy response"
                                  data-testid={`testcase-version-copy-${versions.indexOf(version) + 1}`}
                                >
                                  {copiedVersion === version ? (
                                    <CheckIcon size={12} className="text-success" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              )}
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
                        </>
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
                        <div className={`grid gap-4 ${runs.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
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
                                      <InfoTooltip
                                        tooltipContent={run?.reason || getScoreMessage(score, matchingTypeFromResult)}
                                      >
                                        <span
                                          className={`text-lg font-bold cursor-help ${getScoreColor(score, matchingTypeFromResult)}`}
                                        >
                                          {getScoreDisplay(score, matchingTypeFromResult)}
                                        </span>
                                      </InfoTooltip>
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
