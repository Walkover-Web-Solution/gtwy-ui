"use client";
import React, { useState, useEffect, useMemo, useCallback, use, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  deleteTestCaseAction,
  deleteMultipleTestCasesAction,
  deleteAllTestCasesByAgentAction,
  getAllTestCasesOfBridgeAction,
  runTestCaseAction,
  updateTestCaseAction,
} from "@/store/action/testCasesAction";
import { updateBridgeAction } from "@/store/action/bridgeAction";
import { setTestCaseConfig } from "@/store/reducer/testCaseConfigReducer";
import { PlayIcon } from "@/components/Icons";
import {
  FileText,
  Check,
  ChevronDownIcon,
  Trash2,
  Search,
  X,
  SlidersHorizontal,
  Edit2,
  AlertTriangle,
} from "lucide-react";
import TutorialSuggestionToast from "@/components/TutorialSuggestoinToast";
import PageHeader from "@/components/Pageheader";
import TestCaseDetailsPanel from "@/components/testcaseComponents/TestCaseDetailsPanel";
import MatchingTypeDropdown from "@/components/testcaseComponents/MatchingTypeDropdown";
import TestCaseModelDropdown from "@/components/testcaseComponents/ModelDropdown";
import DeleteModal from "@/components/UI/DeleteModal";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, closeModal, getIconOfService } from "@/utils/utility";
import InfoTooltip from "@/components/InfoTooltip";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

const TESTCASE_SPLIT_STORAGE_KEY = "testcase:list-details-split";

const TestCaseLoadingSkeleton = () => (
  <div
    data-testid="testcase-page-loading-skeleton"
    className="w-full h-full flex flex-col gap-4 px-6 py-4 animate-pulse"
  >
    {/* Header skeleton */}
    <div className="h-12 bg-base-200 rounded-lg"></div>

    {/* Controls skeleton */}
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-32 bg-base-200 rounded-lg"></div>
        <div className="h-10 w-px bg-base-300"></div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-20 bg-base-200 rounded-lg"></div>
          <div className="flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 w-12 bg-base-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-10 w-32 bg-base-200 rounded-lg"></div>
    </div>

    {/* Main grid skeleton */}
    <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
      {/* Left panel */}
      <div className="col-span-4 bg-base-100 border border-base-200 rounded-xl overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 space-y-2 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-base-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-12 border-t border-base-200 bg-base-50"></div>
        </div>
      </div>

      {/* Right panel */}
      <div className="col-span-8 bg-base-100 border border-base-200 rounded-xl p-4">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-base-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const runtime = "edge";

/**
 * Renders the score cell for a single (testcase, version) pair.
 *
 * Each version may have multiple runs (default model + each entry in the
 * user-selected models[] list). When more than one distinct (service, model)
 * has reported a score we show a compact button that opens a popover listing
 * every model with its score and reason, so users can tell which model the
 * score belongs to. Single-result cells render exactly like before.
 */
const MultiScoreCell = ({
  versionArray,
  matchingType,
  getScoreColor,
  getScoreMessage,
  getScoreDisplay,
  onOpenBreakdown,
}) => {
  // Group runs by `is_overridden === false ? __default__ : service:model` and
  // keep the newest run per group (the array is already newest-first).
  const groups = useMemo(() => {
    const seen = new Map();
    (versionArray || []).forEach((run) => {
      if (!run) return;
      const isDefault = run.is_overridden === false;
      const key = isDefault ? "__default__" : `${run.service || ""}:${run.model || ""}`;
      if (seen.has(key)) return;
      seen.set(key, { key, isDefault, run });
    });
    // Default first.
    return Array.from(seen.values()).sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1));
  }, [versionArray]);

  if (!groups.length) return null;

  // Single-group: keep the original inline rendering for visual parity.
  if (groups.length === 1) {
    const run = groups[0]?.run;
    if (!run) return null;
    const score = run?.score || 0;
    const runError = run?.error;
    const runErrorMessage =
      typeof runError === "string"
        ? runError
        : runError?.error || runError?.message || (runError ? "Run failed" : null);
    return runErrorMessage ? (
      <InfoTooltip tooltipContent={runErrorMessage}>
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-error/10 text-error">Error</span>
      </InfoTooltip>
    ) : (
      <InfoTooltip tooltipContent={run?.reason || getScoreMessage(score, matchingType)}>
        <span className={`text-xs font-semibold cursor-help ${getScoreColor(score, matchingType)}`}>
          {getScoreDisplay(score, matchingType)}
        </span>
      </InfoTooltip>
    );
  }

  // Multi-group: a plain "Score" button. The per-model breakdown lives in a
  // shared <Modal> rendered once at the parent so the list cell stays clean.
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenBreakdown?.({ groups, matchingType });
      }}
      title={`${groups.length} model results — click to view breakdown`}
      className="inline-flex items-center px-2 py-0.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors text-xs font-semibold text-primary"
    >
      Score
    </button>
  );
};

/**
 * Body of the shared "Scores by model" modal. Rendered inside the reusable
 * <Modal> dialog at the parent level so every list row reuses the same DOM.
 */
const ScoreBreakdownModalBody = ({ breakdown, getScoreColor, getScoreMessage, getScoreDisplay }) => {
  if (!breakdown) return null;
  const { groups, matchingType } = breakdown;
  return (
    <div className="flex flex-col gap-2 max-h-[60vh]">
      {groups.map(({ key, isDefault, run }) => {
        if (!run) return null;
        const score = run?.score || 0;
        const runError = run?.error;
        const runErrorMessage =
          typeof runError === "string"
            ? runError
            : runError?.error || runError?.message || (runError ? "Run failed" : null);
        const reason = runErrorMessage || run?.reason || getScoreMessage(score, matchingType);
        return (
          <div
            key={key}
            className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-base-200/30 hover:bg-base-200/60 border border-base-content/5 transition-all"
          >
            <span className="inline-flex items-center mt-0.5 flex-shrink-0">
              {run?.service ? getIconOfService(run.service, 16, 16) : null}
            </span>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-semibold text-base-content truncate">
                {isDefault ? (
                  <>
                    Default
                    {run?.model ? <span className="text-base-content/50 font-normal"> · {run.model}</span> : null}
                  </>
                ) : (
                  run?.model || "Unknown model"
                )}
              </div>
              <div className="text-[11px] text-base-content/60 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                {reason}
              </div>
            </div>
            <div className="flex-shrink-0 self-center pl-2">
              {runErrorMessage ? (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-error/10 text-error"
                  title={runErrorMessage}
                >
                  Error
                </span>
              ) : (
                <span className={`text-xs font-bold ${getScoreColor(score, matchingType)}`}>
                  {getScoreDisplay(score, matchingType)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

function TestCases({ params }) {
  // Use the tutorial videos hook

  const resolvedParams = use(params);
  const router = useRouter();
  const dispatch = useDispatch();
  const [isloading, setIsLoading] = useState(false);
  const [isLoadingTestCases, setIsLoadingTestCases] = useState(true);
  const searchParams = useSearchParams();
  const bridgeVersion = searchParams.get("version");
  const [selectedVersion] = useState(searchParams.get("versionId") || "");

  const allBridges = useCustomSelector((state) => state?.bridgeReducer?.org?.[resolvedParams?.org_id]?.orgs || [])
    .slice()
    .reverse();
  const { testCases, isFirstTestcase, testRun, testCasesTotal, currentBridge, bridgeVersionMapping, persistedConfig } =
    useCustomSelector((state) => ({
      testCases: state?.testCasesReducer?.testCases?.[resolvedParams?.id] || {},
      isFirstTestcase: state?.userDetailsReducer?.userDetails?.meta?.onboarding?.TestCasesSetup || "",
      testRun: state?.testCasesReducer?.testRuns?.[resolvedParams?.id] || null,
      testCasesTotal: state?.testCasesReducer?.testCasesTotal?.[resolvedParams?.id] || 0,
      currentBridge: state?.bridgeReducer?.allBridgesMap?.[resolvedParams?.id],
      bridgeVersionMapping: state?.bridgeReducer?.bridgeVersionMapping?.[resolvedParams?.id] || {},
      persistedConfig: state?.testCaseConfigReducer?.configs?.[resolvedParams?.id] || null,
    }));

  // Helper to merge-update the persisted per-bridge testcase config in redux.
  const updatePersistedConfig = useCallback(
    (patch) => {
      if (!resolvedParams?.id) return;
      dispatch(setTestCaseConfig({ bridgeId: resolvedParams.id, ...patch }));
    },
    [dispatch, resolvedParams?.id]
  );
  const [tutorialState, setTutorialState] = useState({
    showTutorial: false,
    showSuggestion: isFirstTestcase,
  });
  const versions = useMemo(() => {
    return allBridges.find((bridge) => bridge?._id === resolvedParams?.id)?.versions || [];
  }, [allBridges, resolvedParams?.id]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [renamingTestCaseId, setRenamingTestCaseId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const debounceTimer = useRef(null);
  const [isReloadingAfterDelete, setIsReloadingAfterDelete] = useState(false);
  const [globalMatchingTypeLocal, setGlobalMatchingTypeLocal] = useState(persistedConfig?.matchingType || "AI");
  const [globalCustomPrompt, setGlobalCustomPrompt] = useState(
    currentBridge?.agent_info?.ai_matching_custom_prompt || currentBridge?.ai_matching_custom_prompt || ""
  );
  const [globalCustomPromptSaved, setGlobalCustomPromptSaved] = useState(
    currentBridge?.agent_info?.ai_matching_custom_prompt || currentBridge?.ai_matching_custom_prompt || ""
  );

  const initialSelectedModels = (() => {
    if (Array.isArray(persistedConfig?.selectedModels)) return persistedConfig.selectedModels;
    if (persistedConfig?.selectedModel) {
      return [{ model: persistedConfig.selectedModel, service: persistedConfig.selectedService || null }];
    }
    return [];
  })();
  const [selectedModelsLocal, setSelectedModelsLocal] = useState(initialSelectedModels);

  const globalMatchingType = globalMatchingTypeLocal;
  const setGlobalMatchingType = useCallback(
    (v) => {
      setGlobalMatchingTypeLocal(v);
      updatePersistedConfig({ matchingType: v });
    },
    [updatePersistedConfig]
  );
  const selectedModels = selectedModelsLocal;
  const setSelectedModels = useCallback(
    (v) => {
      const next = Array.isArray(v) ? v : [];
      setSelectedModelsLocal(next);
      updatePersistedConfig({ selectedModels: next });
    },
    [updatePersistedConfig]
  );

  // Build the model/service portion of a run payload. Keeps a single-model run
  // backwards compatible (sends flat `model`/`service`) while multi-model runs
  // send a `models[]` array that the backend fans out.
  const buildModelsPayload = useCallback(() => {
    if (!Array.isArray(selectedModels) || selectedModels.length === 0) {
      // No models selected - run with default only
      return { include_default: true };
    }
    if (selectedModels.length === 1) {
      return {
        model: selectedModels[0].model || undefined,
        service: selectedModels[0].service || undefined,
        include_default: false,
      };
    }
    return { models: selectedModels, include_default: false };
  }, [selectedModels]);

  useEffect(() => {
    setIsLoadingTestCases(true);
    setPage(1);
    setHasMore(true);
    setSearchKeyword("");
    dispatch(getAllTestCasesOfBridgeAction({ bridgeId: resolvedParams?.id, page: 1 }))
      .then((res) => {
        // Backend doesn't return hasMore — if we got a full page, assume there's more.
        setHasMore(Array.isArray(res?.data) && res.data.length >= 30);
      })
      .finally(() => {
        setIsLoadingTestCases(false);
      });
  }, [dispatch, resolvedParams?.id]);

  const fetchMoreTestCases = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    try {
      const nextPage = page + 1;
      const res = await dispatch(
        getAllTestCasesOfBridgeAction({
          bridgeId: resolvedParams?.id,
          page: nextPage,
          append: true,
          keyword: searchKeyword || undefined,
        })
      );
      if (res?.success) {
        setPage(nextPage);
        // Backend doesn't return hasMore — short page means we're done.
        setHasMore(Array.isArray(res?.data) && res.data.length >= 30);
      } else {
        setHasMore(false);
      }
    } finally {
      setIsFetchingMore(false);
    }
  }, [dispatch, hasMore, isFetchingMore, page, resolvedParams?.id, searchKeyword]);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value) => {
      setSearchKeyword(value);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      setIsSearching(true);
      debounceTimer.current = setTimeout(() => {
        setIsSearching(true);
        setPage(1);
        setHasMore(true);
        setSelectedTestCaseIndex(0);
        dispatch(
          getAllTestCasesOfBridgeAction({
            bridgeId: resolvedParams?.id,
            page: 1,
            keyword: value || undefined,
          })
        )
          .then((res) => {
            setHasMore(Array.isArray(res?.data) && res.data.length >= 30);
          })
          .finally(() => {
            setIsSearching(false);
          });
      }, 500);
    },
    [dispatch, resolvedParams?.id]
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (selectedVersion) {
      // Preserve the type parameter when updating URL
      const typeParam = searchParams.get("type");
      const typeQueryPart = typeParam ? `&type=${typeParam}` : "";
      router.push(`?version=${bridgeVersion}&versionId=${selectedVersion}${typeQueryPart}`);
    }
  }, [selectedVersion, router, searchParams]);

  const executeRunAllTestCases = async () => {
    if (!selectedVersions.length) return;
    // If the user has bulk-selected testcases, run only those; otherwise run all.
    const selectedIds = Array.from(bulkSelectedIds);
    const testcase_ids = selectedIds.length > 0 ? selectedIds : null;
    // Loading + completion is now driven by RTLayer events via redux `testRun`.
    try {
      await dispatch(
        runTestCaseAction({
          versionIds: selectedVersions,
          bridgeId: resolvedParams?.id,
          testcase_ids,
          matching_type: globalMatchingType.toLowerCase(),
          ai_matching_custom_prompt: globalCustomPromptSaved || undefined,
          ...buildModelsPayload(),
          testCaseData: null,
        })
      );
    } catch (error) {
      toast.error("Error running test cases");
      console.error("Error running all test cases:", error);
    }
  };

  const handleRunAllTestCases = async () => {
    if (!selectedVersions.length) return;
    // Count how many testcases will run (bulk selected or all)
    const selectedIds = Array.from(bulkSelectedIds);
    const totalTestcases =
      selectedIds.length > 0 ? selectedIds.length : Array.isArray(testCases) ? testCases.length : 0;
    // If more than 10, warn the user about potential cost before running
    if (totalTestcases > 10) {
      openModal(MODAL_TYPE.RUN_ALL_TESTCASE_CONFIRM_MODAL);
      return;
    }
    await executeRunAllTestCases();
  };

  const confirmRunAllTestCases = async () => {
    closeModal(MODAL_TYPE.RUN_ALL_TESTCASE_CONFIRM_MODAL);
    await executeRunAllTestCases();
  };

  const handleRunSingleTestCase = async (testCaseId, variables = null) => {
    if (!selectedVersions.length) return;
    try {
      await dispatch(
        runTestCaseAction({
          testcase_id: testCaseId,
          versionIds: selectedVersions,
          bridgeId: resolvedParams?.id,
          matching_type: globalMatchingType.toLowerCase(),
          ai_matching_custom_prompt: globalCustomPromptSaved || undefined,
          ...buildModelsPayload(),
          variables,
          testCaseData: null,
        })
      );
    } catch (error) {
      console.error("Error running test case:", error);
    }
  };

  const handleDeleteTestCase = async (testCaseId) => {
    try {
      await dispatch(deleteTestCaseAction({ testCaseId, bridgeId: resolvedParams?.id }));
      setSelectedTestCaseIndex(0);
      // Drop the deleted id from the bulk-selection so the run/delete count stays accurate.
      setBulkSelectedIds((prev) => {
        if (!prev.has(testCaseId)) return prev;
        const next = new Set(prev);
        next.delete(testCaseId);
        return next;
      });
    } catch (error) {
      console.error("Error deleting test case:", error);
    }
  };

  const handleRenameTestCase = async (testCaseId) => {
    const trimmedName = renameValue.trim();
    // Close editor if name is empty
    if (!trimmedName) {
      setRenamingTestCaseId(null);
      setRenameValue("");
      return;
    }
    const testCaseToRename = testCases.find((tc) => tc._id === testCaseId);
    if (!testCaseToRename) {
      setRenamingTestCaseId(null);
      setRenameValue("");
      return;
    }
    // Skip API call if the trimmed name hasn't changed
    if ((testCaseToRename.name || "").trim() === trimmedName) {
      setRenamingTestCaseId(null);
      setRenameValue("");
      return;
    }
    try {
      await dispatch(
        updateTestCaseAction({
          testCaseId,
          dataToUpdate: {
            ...testCaseToRename,
            name: trimmedName,
          },
        })
      );
      setRenamingTestCaseId(null);
      setRenameValue("");
    } catch (error) {
      console.error("Error renaming test case:", error);
    }
  };

  // Bulk-selection state for the testcase list
  const [bulkSelectedIds, setBulkSelectedIds] = useState(() => new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const toggleRowSelected = useCallback((testCaseId) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(testCaseId)) next.delete(testCaseId);
      else next.add(testCaseId);
      return next;
    });
  }, []);

  const clearBulkSelection = useCallback(() => setBulkSelectedIds(new Set()), []);

  const openBulkDeleteModal = () => {
    if (bulkSelectedIds.size === 0) return;
    openModal(MODAL_TYPE.DELETE_TESTCASE_BULK_MODAL);
  };

  const confirmBulkDeleteTestCases = async () => {
    const ids = Array.from(bulkSelectedIds);
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    setIsReloadingAfterDelete(true);
    try {
      await dispatch(deleteMultipleTestCasesAction({ testCaseIds: ids, bridgeId: resolvedParams?.id }));
      setBulkSelectedIds(new Set());
      setSelectedTestCaseIndex(0);
      closeModal(MODAL_TYPE.DELETE_TESTCASE_BULK_MODAL);

      // Reload test cases from page 1 after bulk delete
      setPage(1);
      setHasMore(true);
      const res = await dispatch(getAllTestCasesOfBridgeAction({ bridgeId: resolvedParams?.id, page: 1 }));
      if (res?.success) {
        setHasMore(Array.isArray(res?.data) && res.data.length >= 30);
      }
    } catch (error) {
      console.error("Error bulk deleting test cases:", error);
    } finally {
      setIsBulkDeleting(false);
      setIsReloadingAfterDelete(false);
    }
  };

  const openDeleteAllTestCasesModal = () => {
    if (!Array.isArray(testCases) || testCases.length === 0) return;
    openModal(MODAL_TYPE.DELETE_ALL_TESTCASES_MODAL);
  };

  const confirmDeleteAllTestCases = async () => {
    setIsBulkDeleting(true);
    setIsReloadingAfterDelete(true);
    try {
      await dispatch(deleteAllTestCasesByAgentAction({ bridgeId: resolvedParams?.id }));
      setBulkSelectedIds(new Set());
      setSelectedTestCaseIndex(0);
      setPage(1);
      setHasMore(false);
    } catch (error) {
      console.error("Error deleting all test cases:", error);
      toast.error("Failed to delete all test cases");
    } finally {
      setIsBulkDeleting(false);
      setIsReloadingAfterDelete(false);
      closeModal(MODAL_TYPE.DELETE_ALL_TESTCASES_MODAL);
    }
  };

  const [selectedVersionsLocal, setSelectedVersionsLocal] = useState(
    Array.isArray(persistedConfig?.selectedVersions) ? persistedConfig.selectedVersions : []
  );
  const selectedVersions = selectedVersionsLocal;
  const setSelectedVersions = useCallback(
    (next) => {
      setSelectedVersionsLocal((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        const sameLength = Array.isArray(prev) && Array.isArray(value) && prev.length === value.length;
        const sameContent = sameLength && prev.every((v, i) => v === value[i]);
        if (sameContent) return prev;
        // Persist asynchronously after computing the next value.
        updatePersistedConfig({ selectedVersions: value });
        return value;
      });
    },
    [updatePersistedConfig]
  );
  const [runningTestCaseId, setRunningTestCaseId] = useState(null);

  // Sync local UI state with the RTLayer-driven testRun in redux.
  // `isloading` only represents a Run-All operation (testcaseId is null) so
  // that the Run All button shows a spinner / is disabled.
  // `runningTestCaseId` tracks a single test-case run independently.
  useEffect(() => {
    const isRunning = testRun?.status === "running";
    const isSingleRun = !!testRun?.testcaseId;
    setIsLoading(isRunning && !isSingleRun);
    setRunningTestCaseId(isRunning ? testRun?.testcaseId || null : null);
  }, [testRun?.status, testRun?.testcaseId]);

  useEffect(() => {
    if (versions.length === 0) return;
    // Filter out any persisted selections that no longer exist in this bridge.
    const validSelected = selectedVersions.filter((v) => versions.includes(v));
    if (validSelected.length === 0) {
      setSelectedVersions([...versions]);
    } else if (validSelected.length !== selectedVersions.length) {
      setSelectedVersions(validSelected);
    }
  }, [versions]);

  const selectedTestCase = Array.isArray(testCases) && testCases[selectedTestCaseIndex];

  // Check which selected versions don't have an API key configured for their service
  const versionsWithoutApiKeys = useMemo(() => {
    return selectedVersions.filter((versionId) => {
      const versionData = bridgeVersionMapping?.[versionId];
      const service = versionData?.service;
      const apikeyObjectId = versionData?.apikey_object_id || {};
      // Check if this version's service has an API key assigned (same as FallbackModel pattern)
      if (!service) return false;
      const hasKey = Object.keys(apikeyObjectId).some((key) => key === service);
      return !hasKey;
    });
  }, [selectedVersions, bridgeVersionMapping]);

  const getScoreColor = (score, matchingType) => {
    if (score >= 0.9) return "text-success";
    if (score >= 0.75) return "text-warning";
    if (score >= 0.5) return "text-error";
    return "text-error";
  };

  const getScoreMessage = (score, matchingType) => {
    if (score >= 0.95) return "Perfect match with expected output";
    if (score >= 0.85) return "Excellent match, minor variations";
    if (score >= 0.75) return "Good match, acceptable quality";
    if (score >= 0.5) return "Moderate match, some deviations";
    if (score >= 0.25) return "Below average, significant differences";
    return "Poor match, major deviations from expected output";
  };

  const getScoreDisplay = (score) => {
    const num = Number(score);
    if (!Number.isFinite(num)) return "N/A";
    if (Number.isInteger(num) && (num === 0 || num === 1)) {
      return num === 1 ? "Pass" : "Fail";
    }
    return `${(num * 100).toFixed(0)}%`;
  };

  // Shared "Scores by model" modal state. The breakdown is supplied by any
  // MultiScoreCell click; closing the modal clears it.
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const openScoreBreakdown = useCallback((breakdown) => {
    setScoreBreakdown(breakdown);
    openModal(MODAL_TYPE.TESTCASE_SCORES_MODAL);
  }, []);
  const closeScoreBreakdown = useCallback(() => {
    closeModal(MODAL_TYPE.TESTCASE_SCORES_MODAL);
    setScoreBreakdown(null);
  }, []);

  return (
    <div data-testid="testcase-page" className="bg-base-50 h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-4" data-testid="testcase-page-header">
        <PageHeader
          title="Test Cases"
          description="Test cases are used to compare outputs from different versions with varying prompts and models. You can add test cases from chat history and choose a comparison type - Exact, AI, or Cosine to measure accuracy."
          docLink="https://gtwy.ai/blogs/features/testcases"
        />
      </div>

      {tutorialState?.showSuggestion && (
        <TutorialSuggestionToast
          setTutorialState={setTutorialState}
          flagKey={"TestCasesSetup"}
          TutorialDetails={"TestCases Creation"}
        />
      )}

      {/* Show skeleton while loading */}
      {isLoadingTestCases || isReloadingAfterDelete ? (
        <TestCaseLoadingSkeleton />
      ) : (Array.isArray(testCases) && testCases.length > 0) || searchKeyword || isSearching ? (
        <>
          {/* Action Bar - Matching Type, Versions, and Run Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 22,
              flexWrap: "wrap",
              paddingLeft: 24,
              paddingRight: 24,
              paddingTop: 12,
            }}
          >
            {Array.isArray(testCases) && testCases.length > 0 && (
              <>
                {/* Global Matching Type Dropdown */}
                <MatchingTypeDropdown
                  matchingType={globalMatchingType}
                  customPrompt={globalCustomPrompt}
                  customPromptSaved={globalCustomPromptSaved}
                  conversation={selectedTestCase?.conversation || []}
                  onMatchingTypeChange={setGlobalMatchingType}
                  onCustomPromptChange={setGlobalCustomPrompt}
                  onCustomPromptSave={(prompt) => {
                    setGlobalCustomPromptSaved(prompt);
                    // Save custom prompt to bridge
                    dispatch(
                      updateBridgeAction({
                        bridgeId: resolvedParams?.id,
                        dataToSend: { agent_info: { ai_matching_custom_prompt: prompt } },
                      })
                    );
                  }}
                  onCustomPromptClear={() => {
                    setGlobalCustomPrompt("");
                    setGlobalCustomPromptSaved("");
                    // Clear custom prompt from bridge
                    dispatch(
                      updateBridgeAction({
                        bridgeId: resolvedParams?.id,
                        dataToSend: { agent_info: { ai_matching_custom_prompt: "" } },
                      })
                    );
                  }}
                  label="Matching"
                />

                {/* Versions Dropdown - DaisyUI */}
                <div className="dropdown">
                  <button
                    tabIndex={0}
                    className="flex items-center gap-2 px-2 py-1.5 bg-transparent border border-base-content/20 rounded-lg text-xs font-semibold text-base-content/70 cursor-pointer hover:bg-base-200 transition-colors"
                  >
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-[7px] bg-primary text-primary-content text-xs font-extrabold">
                      {selectedVersions.length}
                    </span>
                    versions
                    <ChevronDownIcon size={15} className="text-base-content/50" />
                  </button>
                  <div
                    tabIndex={0}
                    className="dropdown-content w-[230px] bg-base-100 border border-base-300 rounded-xl shadow-lg z-50 p-2"
                  >
                    <div className="flex justify-between items-center px-2 pt-1.5 pb-2.5 border-b border-base-200 mb-1.5">
                      <span className="text-[11px] font-bold tracking-[0.05em] text-base-content/50 uppercase">
                        Select versions
                      </span>
                      <button
                        onClick={() =>
                          setSelectedVersions(
                            selectedVersions.length === versions.length ? [versions[0]] : [...versions]
                          )
                        }
                        className="bg-transparent border-0 text-primary text-[12.5px] font-bold cursor-pointer p-0 hover:underline"
                      >
                        {selectedVersions.length === versions.length ? "Clear" : "Select all"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-0.5">
                      {versions.map((version, idx) => {
                        const isSelected = selectedVersions.includes(version);
                        const isLast = isSelected && selectedVersions.length === 1;
                        const versionData = bridgeVersionMapping?.[version];
                        const versionService = versionData?.service;
                        const versionApiKeys = versionData?.apikey_object_id || {};
                        const hasNoApiKey =
                          versionService && !Object.keys(versionApiKeys).some((k) => k === versionService);
                        return (
                          <button
                            key={idx}
                            onClick={() =>
                              !isLast &&
                              setSelectedVersions((prev) => {
                                if (prev.includes(version)) {
                                  if (prev.length <= 1) return prev;
                                  return prev.filter((v) => v !== version);
                                }
                                return [...prev, version];
                              })
                            }
                            title={hasNoApiKey ? `No API key for ${versionService}` : ""}
                            className={`flex items-center gap-2.5 bg-transparent rounded-[9px] px-2.5 py-2 text-sm transition-colors ${
                              isLast ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-base-200"
                            }`}
                          >
                            <span
                              className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-md flex-shrink-0 ${
                                isSelected ? "bg-primary border-0" : "bg-base-100 border-[1.5px] border-base-300"
                              }`}
                            >
                              {isSelected && <Check size={11} strokeWidth={3.5} className="text-primary-content" />}
                            </span>
                            <span
                              className={
                                isSelected ? "font-bold text-base-content" : "font-medium text-base-content/60"
                              }
                            >
                              V{idx + 1}
                            </span>
                            {hasNoApiKey && (
                              <span className="text-[9px] font-bold text-error bg-error/10 px-1 py-0.5 rounded ml-auto">
                                No Key
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Run All Button */}
                <button
                  onClick={handleRunAllTestCases}
                  disabled={
                    !Array.isArray(testCases) ||
                    testCases.length === 0 ||
                    isloading ||
                    runningTestCaseId !== null ||
                    selectedVersions.length === 0 ||
                    versionsWithoutApiKeys.length > 0
                  }
                  title={
                    versionsWithoutApiKeys.length > 0
                      ? "Some selected versions don't have an API key configured for their service"
                      : selectedVersions.length === 0
                        ? "Select at least one version to run"
                        : ""
                  }
                  className={`flex items-center gap-2 text-primary-content border border-primary rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                    isloading ||
                    runningTestCaseId !== null ||
                    selectedVersions.length === 0 ||
                    versionsWithoutApiKeys.length > 0
                      ? "bg-primary text-base-content/50 cursor-not-allowed shadow-none"
                      : "bg-primary cursor-pointer shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:bg-primary/90"
                  }`}
                >
                  {isloading ? (
                    <>
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-primary-content border-t-transparent animate-spin" />
                      {testRun?.total ? `Running ${testRun?.completed || 0}/${testRun.total}` : "Running"}
                    </>
                  ) : (
                    <>
                      <PlayIcon size={12} style={{ fill: "currentColor", strokeWidth: 0 }} />
                      {bulkSelectedIds.size > 0
                        ? `Run ${bulkSelectedIds.size} Testcase${bulkSelectedIds.size > 1 ? "s" : ""}`
                        : "Run All Testcases"}
                    </>
                  )}
                </button>

                {/* Separator */}
                <div className="w-px h-8 bg-base-300 mx-1" />

                {/* Model Dropdown with Label */}
                <div
                  className={`flex items-center gap-2 py-1 pl-2 pr-2.5 rounded-lg ${
                    selectedModels.length === 0
                      ? "bg-transparent border border-base-content/20"
                      : "bg-primary/10 border border-primary/30"
                  }`}
                >
                  <span className="text-[10px] font-bold text-base-content/50 tracking-wide uppercase whitespace-nowrap">
                    Run with
                  </span>
                  <TestCaseModelDropdown
                    selectedModels={selectedModels}
                    onChange={setSelectedModels}
                    selectedVersions={selectedVersions}
                    versions={versions}
                    bridgeId={resolvedParams?.id}
                  />
                </div>
                <button
                  onClick={openDeleteAllTestCasesModal}
                  className={`flex items-center gap-2 border border-error rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                    isBulkDeleting || !Array.isArray(testCases) || testCases.length === 0
                      ? "bg-error text-white/50 cursor-not-allowed shadow-none"
                      : "bg-error text-white cursor-pointer shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:bg-error/90"
                  }`}
                  disabled={isBulkDeleting || !Array.isArray(testCases) || testCases.length === 0}
                >
                  {isBulkDeleting ? (
                    <>
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-error-content border-t-transparent animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete All TestCases"
                  )}
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        /* Empty State - only show when fully loaded and no testcases */
        <div className="flex-1 flex items-center justify-center px-6 pb-6 pt-6" data-testid="testcase-empty-state">
          <div
            className="flex flex-col items-center justify-center text-center max-w-md py-16 px-8 bg-base-100 border border-dashed border-base-300 rounded-xl w-full"
            data-testid="testcase-empty-state-card"
          >
            <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mb-4">
              <FileText size={28} className="text-base-content/50" />
            </div>
            <h3 className="text-lg font-semibold text-base-content mb-2">No test cases present</h3>
            <p className="text-sm text-base-content/60 mb-4">
              Add test cases from chat history to compare outputs across different versions and prompts.
            </p>
            <button
              data-testid="testcase-empty-state-generate-button"
              onClick={() => {
                const versionParam = searchParams.get("version");
                const typeParam = searchParams.get("type");
                const query = [versionParam ? `version=${versionParam}` : "", typeParam ? `type=${typeParam}` : ""]
                  .filter(Boolean)
                  .join("&");
                router.push(
                  `/org/${resolvedParams?.org_id}/agents/history/${resolvedParams?.id}${query ? `?${query}` : ""}`
                );
              }}
              className="flex items-center gap-2 bg-primary text-primary-content rounded-lg px-4 py-2 text-sm font-bold cursor-pointer hover:bg-primary/90 transition-colors"
            >
              Generate Test Cases
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      {((Array.isArray(testCases) && testCases.length > 0) || searchKeyword || isSearching) && (
        <div className="flex-1 min-h-0 overflow-hidden px-6 pb-4 pt-3" data-testid="testcase-main-grid-wrapper">
          <PanelGroup direction="horizontal" autoSaveId={TESTCASE_SPLIT_STORAGE_KEY} className="h-full relative">
            {/* Left Panel - Test Cases List */}
            <Panel
              defaultSize={33}
              minSize={20}
              maxSize={70}
              className="bg-base-100 border border-base-200 rounded-xl overflow-hidden flex flex-col h-full relative z-10 shadow-lg"
              data-testid="testcase-list-panel"
            >
              {/* Search Bar */}
              <div className="px-4 py-3 border-b border-base-200 bg-base-100">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50"
                  />
                  <input
                    data-testid="testcase-search-input"
                    type="text"
                    placeholder="Search test cases..."
                    value={searchKeyword}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="input input-sm input-bordered w-full pl-9 pr-9 bg-base-50 text-base-content placeholder-base-content/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                    {searchKeyword && (
                      <button
                        data-testid="testcase-search-clear-btn"
                        type="button"
                        onClick={() => handleSearchChange("")}
                        className="text-base-content/50 hover:text-base-content transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {bulkSelectedIds.size > 0 && (
                <div
                  data-testid="testcase-bulk-action-bar"
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20"
                >
                  <span className="text-xs font-semibold text-primary">{bulkSelectedIds.size} selected</span>
                  <div className="flex items-center gap-2">
                    <button
                      data-testid="testcase-bulk-clear-button"
                      onClick={clearBulkSelection}
                      className="btn btn-xs btn-ghost"
                      disabled={isBulkDeleting}
                    >
                      Clear
                    </button>
                    <button
                      data-testid="testcase-bulk-delete-button"
                      onClick={openBulkDeleteModal}
                      disabled={isBulkDeleting}
                      className="btn btn-xs btn-error text-error-content gap-1"
                    >
                      {isBulkDeleting ? <span className="loading loading-spinner loading-xs" /> : <Trash2 size={12} />}
                      Delete{bulkSelectedIds.size > 1 ? ` ${bulkSelectedIds.size}` : ""}
                    </button>
                  </div>
                </div>
              )}
              {isSearching ? (
                <div className="flex-1 p-4 space-y-2 animate-pulse" data-testid="testcase-list-search-skeleton">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 bg-base-200 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div
                  id="testcase-list-scrollable"
                  data-testid="testcase-list-scrollable"
                  className="overflow-x-auto overflow-y-auto flex-1 bg-base-100"
                >
                  <InfiniteScroll
                    dataLength={Array.isArray(testCases) ? testCases.length : 0}
                    next={fetchMoreTestCases}
                    hasMore={hasMore}
                    loader={
                      <div className="flex justify-center items-center py-3">
                        <span className="loading loading-spinner loading-sm text-base-content/50" />
                      </div>
                    }
                    scrollableTarget="testcase-list-scrollable"
                    style={{ overflow: "visible" }}
                  >
                    <table
                      className="w-full border-separate border-spacing-0 bg-base-100"
                      data-testid="testcase-list-table"
                    >
                      <thead className="bg-base-50" data-testid="testcase-list-table-head">
                        <tr className="border-b border-base-200">
                          <th
                            style={{ top: 0, left: 0, width: 36, minWidth: 36 }}
                            className="px-2 py-3 text-left text-xs font-semibold text-base-content uppercase tracking-wider sticky bg-base-50 z-30"
                          >
                            <input
                              type="checkbox"
                              data-testid="testcase-list-select-all"
                              className="checkbox checkbox-xs"
                              aria-label="Select all test cases"
                              checked={
                                Array.isArray(testCases) &&
                                testCases.length > 0 &&
                                testCases.every((tc) => bulkSelectedIds.has(tc?._id))
                              }
                              ref={(el) => {
                                if (!el) return;
                                const total = Array.isArray(testCases) ? testCases.length : 0;
                                const selected = Array.isArray(testCases)
                                  ? testCases.filter((tc) => bulkSelectedIds.has(tc?._id)).length
                                  : 0;
                                el.indeterminate = selected > 0 && selected < total;
                              }}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setBulkSelectedIds(() => {
                                  if (!checked) return new Set();
                                  const next = new Set();
                                  (Array.isArray(testCases) ? testCases : []).forEach((tc) => {
                                    if (tc?._id) next.add(tc._id);
                                  });
                                  return next;
                                });
                              }}
                            />
                          </th>
                          <th
                            style={{ top: 0, left: 36, width: 40, minWidth: 40 }}
                            className="px-2 py-3 text-left text-xs font-semibold text-base-content uppercase tracking-wider sticky bg-base-50 z-30"
                          >
                            #
                          </th>
                          <th
                            style={{ top: 0, left: 76, width: 140, minWidth: 140 }}
                            className="px-2 py-3 text-left text-xs font-semibold text-base-content uppercase tracking-wider sticky bg-base-50 z-30"
                          >
                            Name
                          </th>
                          {selectedVersions.map((version, idx) => (
                            <th
                              key={idx}
                              data-testid={`testcase-list-version-header-${idx}`}
                              className="px-2 py-3 text-center text-xs font-semibold text-base-content uppercase tracking-wider min-w-[60px] bg-base-50 sticky top-0"
                            >
                              v{versions.indexOf(version) + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base-200" data-testid="testcase-list-table-body">
                        {Array.isArray(testCases) && testCases.length === 0 ? (
                          <tr data-testid="testcase-list-no-results">
                            <td colSpan={3 + (selectedVersions?.length || 0)} className="px-4 py-12 text-center">
                              <div className="flex flex-col items-center justify-center gap-2 text-base-content/60">
                                <Search size={24} className="text-base-content/30" />
                                <span className="text-sm font-medium">No testcase found</span>
                                {searchKeyword && (
                                  <span className="text-xs text-base-content/40">
                                    No results for &quot;{searchKeyword}&quot;
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                        {Array.isArray(testCases) &&
                          testCases.map((testCase, index) => {
                            const testCaseName = testCase?.name;
                            const lastUserMessageRaw = testCase?.conversation
                              ?.filter((message) => message?.role === "user")
                              ?.pop()?.content;
                            const lastUserMessage =
                              typeof lastUserMessageRaw === "object" && lastUserMessageRaw !== null
                                ? JSON.stringify(lastUserMessageRaw)
                                : lastUserMessageRaw || "N/A";
                            const displayText = testCaseName || lastUserMessage;

                            const isSelected = selectedTestCaseIndex === index;

                            const isRowChecked = bulkSelectedIds.has(testCase?._id);
                            return (
                              <tr
                                key={index}
                                data-testid={`testcase-row-${testCase?._id || index}`}
                                onClick={() => setSelectedTestCaseIndex(index)}
                                className={`cursor-pointer transition-all ${isSelected ? "bg-base-200 border-l-4 border-l-primary" : "bg-base-100 hover:bg-base-50 border-l-4 border-l-transparent"}`}
                              >
                                <td
                                  style={{ left: 0, width: 36, minWidth: 36 }}
                                  className={`px-2 py-3.5 text-sm sticky z-20 ${isSelected ? "bg-base-200" : "bg-base-100"}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    data-testid={`testcase-row-select-${testCase?._id || index}`}
                                    className="checkbox checkbox-xs"
                                    aria-label="Select test case"
                                    checked={isRowChecked}
                                    onChange={() => testCase?._id && toggleRowSelected(testCase._id)}
                                  />
                                </td>
                                <td
                                  style={{ left: 36, width: 40, minWidth: 40 }}
                                  className={`px-2 py-3.5 text-sm sticky z-20 ${isSelected ? "bg-base-200 font-semibold text-primary" : "bg-base-100 font-medium text-base-content"}`}
                                >
                                  {index + 1}
                                </td>
                                <td
                                  style={{ left: 76, width: 140, minWidth: 140 }}
                                  className={`px-2 py-3.5 text-sm sticky z-20 ${isSelected ? "bg-base-200 font-semibold text-primary" : "bg-base-100 font-medium text-base-content"}`}
                                  title={displayText}
                                  onClick={(e) => {
                                    if (renamingTestCaseId === testCase?._id) e.stopPropagation();
                                  }}
                                >
                                  {renamingTestCaseId === testCase?._id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        autoFocus
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.currentTarget.blur();
                                          }
                                          if (e.key === "Escape") setRenamingTestCaseId(null);
                                        }}
                                        onBlur={() => handleRenameTestCase(testCase?._id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 px-2 py-1 text-xs border border-primary rounded bg-base-50 text-base-content outline-none"
                                        placeholder="Test case name"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 group">
                                      <span className="truncate">
                                        {displayText?.substring(0, 20)}
                                        {displayText?.length > 20 ? "..." : ""}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRenameValue(testCaseName || "");
                                          setRenamingTestCaseId(testCase?._id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-base-200 rounded"
                                        title="Rename test case"
                                      >
                                        <Edit2 size={12} className="text-base-content/60" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                                {selectedVersions.map((version, vIdx) => {
                                  const versionArray = testCase?.version_history?.[version];
                                  const matchingTypeFromResult = testCase?.matching_type || "cosine";
                                  return (
                                    <td
                                      key={vIdx}
                                      data-testid={`testcase-row-${testCase?._id || index}-version-${versions.indexOf(version) + 1}`}
                                      className={`px-2 py-3.5 text-center min-w-[60px] bg-base-100`}
                                    >
                                      {versionArray && (
                                        <MultiScoreCell
                                          versionArray={versionArray}
                                          matchingType={matchingTypeFromResult}
                                          getScoreColor={getScoreColor}
                                          getScoreMessage={getScoreMessage}
                                          getScoreDisplay={getScoreDisplay}
                                          onOpenBreakdown={openScoreBreakdown}
                                        />
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </InfiniteScroll>
                </div>
              )}
              <div
                className="px-4 py-3 border-t border-base-200 text-xs text-base-content/60 bg-base-50"
                data-testid="testcase-list-footer"
              >
                {testCasesTotal > 0 ? `${testCasesTotal} testcases` : "0 testcases"}
              </div>
            </Panel>

            {/* Drag handle to resize the two panels. A 4px hit-target wraps a
                visible 1px line that thickens + tints on hover for clear UX. */}
            <PanelResizeHandle
              className="group relative w-1 mx-1 flex items-center justify-center cursor-col-resize"
              data-testid="testcase-panels-resize-handle"
            >
              <div className="w-px h-full bg-base-300 group-hover:bg-primary group-data-[resize-handle-state=drag]:bg-primary transition-colors" />
            </PanelResizeHandle>

            {/* Right Panel - Details */}
            <Panel
              defaultSize={67}
              minSize={30}
              className="h-full min-h-0 overflow-hidden"
              data-testid="testcase-details-panel-host"
            >
              {isSearching ? (
                <div
                  className="bg-base-100 border border-base-200 rounded-xl p-4 h-full animate-pulse space-y-4"
                  data-testid="testcase-details-search-skeleton"
                >
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-8 bg-base-200 rounded-lg" />
                  ))}
                </div>
              ) : Array.isArray(testCases) && testCases.length === 0 && searchKeyword ? (
                <div className="bg-base-100 border border-base-200 rounded-xl p-6 h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mb-4 mx-auto">
                      <FileText size={28} className="text-base-content/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-base-content mb-2">No test cases found</h3>
                    <p className="text-sm text-base-content/60">
                      Try adjusting your search or clear it to see all test cases.
                    </p>
                    <button
                      data-testid="testcase-empty-clear-search-btn"
                      onClick={() => handleSearchChange("")}
                      className="btn btn-sm btn-primary mt-4"
                    >
                      Clear Search
                    </button>
                  </div>
                </div>
              ) : (
                <TestCaseDetailsPanel
                  selectedTestCase={selectedTestCase}
                  selectedVersions={selectedVersions}
                  versions={versions}
                  runningTestCaseId={runningTestCaseId}
                  isloading={isloading}
                  testRun={testRun}
                  handleRunSingleTestCase={handleRunSingleTestCase}
                  handleDeleteTestCase={handleDeleteTestCase}
                  getScoreColor={getScoreColor}
                  getScoreMessage={getScoreMessage}
                  getScoreDisplay={getScoreDisplay}
                  bridgeId={resolvedParams?.id}
                  onTestCaseUpdate={() => dispatch(getAllTestCasesOfBridgeAction({ bridgeId: resolvedParams?.id }))}
                />
              )}
            </Panel>
          </PanelGroup>
        </div>
      )}

      <Modal
        MODAL_ID={MODAL_TYPE.RUN_ALL_TESTCASE_CONFIRM_MODAL}
        title="Run all test cases?"
        description="Running many test cases at once may incur significant cost."
        icon={<AlertTriangle size={18} className="text-warning" />}
        widthClass="w-[min(520px,92vw)]"
        onClose={() => closeModal(MODAL_TYPE.RUN_ALL_TESTCASE_CONFIRM_MODAL)}
        footer={
          <>
            <button className="btn btn-sm" onClick={() => closeModal(MODAL_TYPE.RUN_ALL_TESTCASE_CONFIRM_MODAL)}>
              Cancel
            </button>
            <button className="btn btn-sm btn-primary" onClick={confirmRunAllTestCases}>
              Yes, run all
            </button>
          </>
        }
      >
        {(() => {
          const selectedIds = Array.from(bulkSelectedIds);
          const total = selectedIds.length > 0 ? selectedIds.length : Array.isArray(testCases) ? testCases.length : 0;
          const versionsCount = selectedVersions.length;
          return (
            <div className="space-y-3">
              <p className="text-sm text-base-content">
                You are about to run <span className="font-semibold">{total}</span> test case{total !== 1 ? "s" : ""}
                {versionsCount > 1 ? (
                  <>
                    {" "}
                    across <span className="font-semibold">{versionsCount}</span> versions
                  </>
                ) : null}
                . This may take a while and could result in <span className="font-semibold">high API cost</span>.
              </p>
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
                Are you sure you want to continue?
              </div>
            </div>
          );
        })()}
      </Modal>

      <DeleteModal
        modalType={MODAL_TYPE.DELETE_TESTCASE_BULK_MODAL}
        title="Delete Test Cases"
        description={`Are you sure you want to delete ${bulkSelectedIds.size} selected test case${bulkSelectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.`}
        onConfirm={confirmBulkDeleteTestCases}
        loading={isBulkDeleting}
        buttonTitle="Delete"
        isAsync
      />

      <DeleteModal
        modalType={MODAL_TYPE.DELETE_ALL_TESTCASES_MODAL}
        title="Delete All Test Cases"
        description="Are you sure you want to delete ALL test cases for this agent? This action cannot be undone."
        onConfirm={confirmDeleteAllTestCases}
        loading={isBulkDeleting}
        buttonTitle="Delete All"
        isAsync
      />

      <Modal
        MODAL_ID={MODAL_TYPE.TESTCASE_SCORES_MODAL}
        title="Scores by model"
        description={scoreBreakdown ? `${scoreBreakdown.groups.length} results for this version` : ""}
        icon={<SlidersHorizontal size={16} className="text-primary" />}
        widthClass="w-[min(480px,92vw)]"
        onClose={closeScoreBreakdown}
        footer={
          <button onClick={closeScoreBreakdown} className="btn btn-sm">
            Close
          </button>
        }
      >
        <ScoreBreakdownModalBody
          breakdown={scoreBreakdown}
          getScoreColor={getScoreColor}
          getScoreMessage={getScoreMessage}
          getScoreDisplay={getScoreDisplay}
        />
      </Modal>
    </div>
  );
}

export default TestCases;
