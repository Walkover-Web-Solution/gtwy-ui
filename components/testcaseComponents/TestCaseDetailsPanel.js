import React, { useState, useEffect, useRef } from "react";
import { PlayIcon, TrashIcon, ChevronDownIcon, Plus, X, Settings, Check } from "lucide-react";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import { getBridgeVersionAction } from "@/store/action/bridgeAction";
import { updateTestCaseAction } from "@/store/action/testCasesAction";
import TestCaseVariablesModal from "./TestCaseVariablesModal";

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
  const [isRunDisabled, setIsRunDisabled] = useState(false);
  const [editedConversation, setEditedConversation] = useState([]);
  const [editedExpected, setEditedExpected] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const dropdownRef = useRef(null);

  // Get current expected value as string for editing
  const getExpectedValue = (testCase) => {
    if (testCase?.expected?.response) return testCase.expected.response;
    if (testCase?.expected?.tool_calls) return JSON.stringify(testCase.expected.tool_calls, null, 2);
    return "";
  };

  // Sync local edit state when selectedTestCase changes
  useEffect(() => {
    setEditedConversation(selectedTestCase?.conversation ? [...selectedTestCase.conversation] : []);
    setEditedExpected(getExpectedValue(selectedTestCase));
    setHasUnsavedChanges(false);
  }, [selectedTestCase?._id]);

  // Detect unsaved changes
  useEffect(() => {
    if (!selectedTestCase) return;
    const originalConv = JSON.stringify(selectedTestCase?.conversation || []);
    const editedConv = JSON.stringify(editedConversation);
    const originalExp = getExpectedValue(selectedTestCase);
    setHasUnsavedChanges(originalConv !== editedConv || originalExp !== editedExpected);
  }, [editedConversation, editedExpected, selectedTestCase]);

  const handleConversationChange = (idx, newContent) => {
    setEditedConversation((prev) => prev.map((m, i) => (i === idx ? { ...m, content: newContent } : m)));
  };

  const handleSaveChanges = async () => {
    const isToolCallType = selectedTestCase?.type === "function" || selectedTestCase?.expected?.tool_calls;
    let updatedExpected;
    if (isToolCallType) {
      try {
        updatedExpected = { tool_calls: JSON.parse(editedExpected) };
      } catch {
        updatedExpected = { response: editedExpected };
      }
    } else {
      updatedExpected = { response: editedExpected };
    }

    await dispatch(
      updateTestCaseAction({
        testCaseId: selectedTestCase?._id,
        dataToUpdate: {
          conversation: editedConversation,
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

  // Initialize / sync comparison versions: default to first 2 available versions
  useEffect(() => {
    if (Array.isArray(versions) && versions.length > 0 && comparisonVersions.length === 0) {
      setComparisonVersions(versions.slice(0, Math.min(2, versions.length)));
    }
  }, [versions]);

  // Get version data from Redux
  const bridgeVersionMapping = useCustomSelector(
    (state) => state?.bridgeReducer?.bridgeVersionMapping?.[bridgeId] || {}
  );

  // Function to check if test case or versions have been updated since last execution
  const checkTestCaseOrVersionsUpdated = React.useCallback(() => {
    const execution = selectedTestCase?.execution;

    // If no execution history, allow running (first time)
    if (!execution || !execution.lastExecutedAt) {
      return true;
    }

    const lastExecutedAt = new Date(execution.lastExecutedAt).getTime();

    // Check if test case has been updated since last execution
    const testCaseUpdatedAt = new Date(selectedTestCase?.updatedAt).getTime();

    if (testCaseUpdatedAt > lastExecutedAt) {
      return true;
    }

    // Check if any selected version has been updated since last execution
    const hasVersionBeenUpdated = selectedVersions.some((versionId) => {
      const versionData = bridgeVersionMapping[versionId];
      if (!versionData || !versionData.updatedAt) return false;
      const versionUpdatedAt = new Date(versionData.updatedAt).getTime();
      return versionUpdatedAt > lastExecutedAt;
    });

    return hasVersionBeenUpdated;
  }, [selectedTestCase, bridgeVersionMapping, selectedVersions]);

  // Reset test case variables and alert state when selectedTestCase changes
  useEffect(() => {
    setTestCaseVariables(selectedTestCase?.variables || {});
    setShowVariableAlert(false);
  }, [selectedTestCase?._id]);

  // Update run button disabled state when test case or versions are updated
  useEffect(() => {
    const isUpdated = checkTestCaseOrVersionsUpdated();
    setIsRunDisabled(!isUpdated);
  }, [checkTestCaseOrVersionsUpdated]);

  // Fetch variables from selected versions
  useEffect(() => {
    const mergedVersionVariables = {};
    const versionsToFetch = [];

    selectedVersions.forEach((versionId) => {
      if (versionId) {
        if (bridgeVersionMapping[versionId]) {
          const versionData = bridgeVersionMapping[versionId];
          // Extract variable_state from the version
          const variableState = versionData?.variables_state || {};
          mergedVersionVariables[versionId] = variableState;
        } else {
          versionsToFetch.push(versionId);
        }
      }
    });

    // Fetch missing versions
    if (versionsToFetch.length > 0) {
      versionsToFetch.forEach((versionId) => {
        dispatch(getBridgeVersionAction({ versionId }));
      });
    }
    setVersionVariables(mergedVersionVariables);
  }, [selectedVersions, bridgeVersionMapping, dispatch]);

  // Function to merge variables intelligently
  const getMergedVariables = () => {
    const merged = {};

    // First, add variables from all selected versions
    Object.entries(versionVariables || {}).forEach(([versionId, versionVars]) => {
      if (typeof versionVars === "object" && versionVars !== null) {
        Object.entries(versionVars).forEach(([key, varData]) => {
          // Use test case value if available, otherwise use version value
          merged[key] = testCaseVariables[key] || varData?.value || "";
        });
      }
    });

    // Add any test case variables that aren't in version variables
    Object.entries(testCaseVariables || {}).forEach(([key, value]) => {
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
    // Check if test case or versions have been updated since last execution
    const isUpdated = checkTestCaseOrVersionsUpdated();
    if (!isUpdated) {
      return;
    }

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
  const noVersionsSelected = selectedVersions.length === 0;

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
    <div className="col-span-8 overflow-hidden">
      <div className="bg-base-100 border border-base-200 rounded-xl overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-base-200 flex items-center justify-between bg-base-50">
          <div>
            <h2 className="text-lg font-semibold text-base-content">
              {selectedTestCase?.conversation
                ?.filter((m) => m?.role === "user")
                ?.pop()
                ?.content?.substring(0, 50) || "Test Case"}
            </h2>
            <p className="text-xs text-base-content/60 mt-0.5">Comparison across selected versions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunWithVariableCheck(selectedTestCase?._id)}
              disabled={isRunningThis || isloading || noVersionsSelected || isRunDisabled}
              title={
                noVersionsSelected
                  ? "Select at least one version to run"
                  : isRunDisabled
                    ? "Test case and versions have not been updated since last execution"
                    : ""
              }
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-content border border-primary disabled:border-primary/50 rounded-lg flex items-center gap-2 font-medium transition-all text-sm disabled:cursor-not-allowed"
            >
              {isRunningThis ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Running
                </>
              ) : (
                <>
                  <PlayIcon size={16} />
                  Run
                </>
              )}
            </button>
            <button
              onClick={() => openModal(MODAL_TYPE.TEST_CASE_VARIABLES_MODAL)}
              className="p-2 text-base-content bg-base-200 rounded-lg transition-colors"
              title="Edit variables"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => {
                handleDeleteTestCase(selectedTestCase?._id);
              }}
              title="Delete test case"
              className="p-2 text-base-content/40 text-error hover:bg-error/10 rounded-lg transition-colors"
            >
              <TrashIcon size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1 p-6">
          {/* Conversation History */}
          {editedConversation.slice(0, -1).length > 0 && (
            <div className="mb-6">
              <button
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
                <div className="mt-3 bg-base-50 rounded-lg px-4 py-3 border border-base-200">
                  <div className="space-y-3">
                    {editedConversation.slice(0, -1).map((message, idx) => {
                      const isStringContent = typeof message?.content === "string";
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-md ${message?.role === "user" ? "bg-primary/10 border border-primary/20" : "bg-base-100 border border-base-200"}`}
                        >
                          <div className="text-xs font-semibold text-base-content/60 mb-1 uppercase tracking-wide">
                            {message?.role === "user" ? "User" : "Assistant"}
                          </div>
                          {isStringContent ? (
                            <textarea
                              value={message?.content || ""}
                              onChange={(e) => handleConversationChange(idx, e.target.value)}
                              onBlur={() => {
                                if (hasUnsavedChanges) handleSaveChanges();
                              }}
                              rows={Math.max(1, (message?.content || "").split("\n").length)}
                              className="w-full bg-transparent text-sm text-base-content leading-relaxed outline-none resize-none border-0 focus:ring-1 focus:ring-primary/30 rounded p-1"
                            />
                          ) : (
                            <div className="text-sm text-base-content leading-relaxed">
                              {JSON.stringify(message?.content)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                <div className="text-xs font-semibold text-base-content/70 mb-2 uppercase tracking-wide">Input</div>
                <div className="bg-base-50 rounded-lg px-4 py-3 border border-base-200">
                  <textarea
                    value={typeof lastUserContent === "string" ? lastUserContent : JSON.stringify(lastUserContent)}
                    onChange={(e) => handleConversationChange(lastUserIdx, e.target.value)}
                    onBlur={() => {
                      if (hasUnsavedChanges) handleSaveChanges();
                    }}
                    rows={Math.max(1, String(lastUserContent).split("\n").length)}
                    className="w-full bg-transparent text-sm text-base-content leading-relaxed outline-none resize-none"
                  />
                </div>
              </div>
            );
          })()}

          {/* Expected Output (always editable) */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-success mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Check size={12} />
              Expected Output
            </div>
            <div className="bg-success/10 rounded-lg px-4 py-3 border border-success/30">
              <textarea
                value={editedExpected}
                onChange={(e) => setEditedExpected(e.target.value)}
                onBlur={() => {
                  if (hasUnsavedChanges) handleSaveChanges();
                }}
                rows={Math.max(2, editedExpected.split("\n").length)}
                className="w-full bg-transparent text-sm text-base-content leading-relaxed outline-none resize-none"
              />
            </div>
          </div>

          {/* Version Comparison (independent of run-version selection) */}
          <div ref={dropdownRef}>
            <div className="mb-5 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-base-content">Compare:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {comparisonVersions.map((version, idx) => {
                  const availableForThisSlot = versions.filter((v) => v === version || !comparisonVersions.includes(v));
                  return (
                    <div key={idx} className="relative flex items-center">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)}
                        className="px-3 py-1.5 bg-base-100 border border-base-200 rounded-md text-sm font-medium text-base-content hover:bg-base-200 flex items-center gap-1.5 transition-all"
                      >
                        V{versions.indexOf(version) + 1}
                        <ChevronDownIcon size={12} className="text-base-content/40" />
                      </button>
                      {comparisonVersions.length > 1 && (
                        <button
                          onClick={() => handleRemoveVersion(version)}
                          title="Remove from comparison"
                          className="ml-1 p-1 text-base-content/40 hover:text-error hover:bg-error/10 rounded transition-colors"
                        >
                          <X size={12} />
                        </button>
                      )}
                      {openDropdown === idx && (
                        <div className="absolute top-full left-0 mt-1 bg-base-100 border border-base-200 rounded-md shadow-lg z-30 min-w-[120px] max-h-60 overflow-y-auto">
                          {availableForThisSlot.map((v, vIdx) => (
                            <button
                              key={vIdx}
                              onClick={() => handleVersionChange(idx, v)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-base-200 transition-colors ${
                                v === version ? "bg-primary/10 text-primary font-semibold" : ""
                              }`}
                            >
                              V{versions.indexOf(v) + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {comparisonVersions.length < versions.length && (
                  <button
                    onClick={handleAddVersion}
                    className="px-3 py-1.5 bg-base-100 border border-dashed border-primary/40 rounded-md text-sm font-medium text-primary hover:bg-primary/5 flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={14} />
                    Add Version
                  </button>
                )}
              </div>
            </div>

            {/* Version Outputs Grid */}
            {comparisonVersions.length > 0 ? (
              <div
                className={`grid gap-4 ${comparisonVersions.length === 1 ? "grid-cols-1" : comparisonVersions.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
              >
                {comparisonVersions.map((version, idx) => {
                  const versionArray = selectedTestCase?.version_history?.[version];
                  const score = versionArray?.[versionArray?.length - 1]?.score || 0;
                  const modelOutput = versionArray?.[versionArray?.length - 1]?.model_output || "N/A";

                  return (
                    <div key={idx} className="bg-base-50 border border-base-200 rounded-lg p-4 h-fit">
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-base-200">
                        <div className="text-xs font-bold text-primary uppercase tracking-wide">
                          v{versions.indexOf(version) + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative group">
                            <span className={`text-lg font-bold cursor-help ${getScoreColor(score)}`}>
                              {(score * 100).toFixed(0)}%
                            </span>
                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-20">
                              <div className="bg-base-900 text-base-100 text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                                {getScoreMessage(score)}
                                <div className="absolute top-full right-4 -mt-1">
                                  <div className="w-2 h-2 bg-base-900 rotate-45"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-base-content leading-relaxed">
                        {typeof modelOutput === "string" ? modelOutput : JSON.stringify(modelOutput)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-base-50 border border-dashed border-base-200 rounded-lg px-4 py-8 text-center">
                <p className="text-sm text-base-content/60">Add a version above to start comparing outputs.</p>
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
    </div>
  );
};

export default TestCaseDetailsPanel;
