"use client";
import React, { useState, useEffect, useMemo, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import InfiniteScroll from "react-infinite-scroll-component";
import { deleteTestCaseAction, getAllTestCasesOfBridgeAction, runTestCaseAction } from "@/store/action/testCasesAction";
import { updateBridgeAction } from "@/store/action/bridgeAction";
import { PlayIcon } from "@/components/Icons";
import { FileText, Check, ChevronDownIcon } from "lucide-react";
import TutorialSuggestionToast from "@/components/TutorialSuggestoinToast";
import PageHeader from "@/components/Pageheader";
import TestCaseDetailsPanel from "@/components/testcaseComponents/TestCaseDetailsPanel";
import MatchingTypeDropdown from "@/components/testcaseComponents/MatchingTypeDropdown";
import TestCaseModelDropdown from "@/components/testcaseComponents/ModelDropdown";

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
  const { testCases, isFirstTestcase, testRun, testCasesTotal, currentBridge } = useCustomSelector((state) => ({
    testCases: state?.testCasesReducer?.testCases?.[resolvedParams?.id] || {},
    isFirstTestcase: state?.userDetailsReducer?.userDetails?.meta?.onboarding?.TestCasesSetup || "",
    testRun: state?.testCasesReducer?.testRuns?.[resolvedParams?.id] || null,
    testCasesTotal: state?.testCasesReducer?.testCasesTotal?.[resolvedParams?.id] || 0,
    currentBridge: state?.bridgeReducer?.allBridgesMap?.[resolvedParams?.id],
  }));
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
  const [globalMatchingType, setGlobalMatchingType] = useState("AI");
  const [globalCustomPrompt, setGlobalCustomPrompt] = useState(
    currentBridge?.agent_info?.ai_matching_custom_prompt || currentBridge?.ai_matching_custom_prompt || ""
  );
  const [globalCustomPromptSaved, setGlobalCustomPromptSaved] = useState(
    currentBridge?.agent_info?.ai_matching_custom_prompt || currentBridge?.ai_matching_custom_prompt || ""
  );
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    setIsLoadingTestCases(true);
    setPage(1);
    setHasMore(true);
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
  }, [dispatch, hasMore, isFetchingMore, page, resolvedParams?.id]);

  useEffect(() => {
    if (selectedVersion) {
      // Preserve the type parameter when updating URL
      const typeParam = searchParams.get("type");
      const typeQueryPart = typeParam ? `&type=${typeParam}` : "";
      router.push(`?version=${bridgeVersion}&versionId=${selectedVersion}${typeQueryPart}`);
    }
  }, [selectedVersion, router, searchParams]);

  const handleRunAllTestCases = async () => {
    if (!selectedVersions.length) return;
    // Loading + completion is now driven by RTLayer events via redux `testRun`.
    try {
      await dispatch(
        runTestCaseAction({
          versionIds: selectedVersions,
          bridgeId: resolvedParams?.id,
          matching_type: globalMatchingType.toLowerCase(),
          ai_matching_custom_prompt: globalCustomPromptSaved || undefined,
          model: selectedModel || undefined,
          service: selectedService || undefined,
        })
      );
    } catch (error) {
      toast.error("Error running test cases");
      console.error("Error running all test cases:", error);
    }
  };

  const handleRunSingleTestCase = async (testCaseId, variables = null) => {
    if (!selectedVersions.length) return;
    try {
      const testCase = testCases.find((tc) => tc._id === testCaseId);
      const testCaseMatchingType = testCase?.matching_type || globalMatchingType;

      await dispatch(
        runTestCaseAction({
          testcase_id: testCaseId,
          versionIds: selectedVersions,
          bridgeId: resolvedParams?.id,
          matching_type: globalMatchingType.toLowerCase(),
          ai_matching_custom_prompt: globalCustomPromptSaved || undefined,
          model: selectedModel || undefined,
          service: selectedService || undefined,
          variables,
          testCaseData: {
            conversation: testCase?.conversation,
            expected: testCase?.expected,
            matching_type: testCaseMatchingType.toLowerCase(),
          },
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
    } catch (error) {
      console.error("Error deleting test case:", error);
    }
  };

  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [selectedVersions, setSelectedVersions] = useState([]);
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
    if (selectedVersions.length === 0 && versions.length > 0) {
      setSelectedVersions([...versions]);
    }
  }, [versions]);

  const selectedTestCase = Array.isArray(testCases) && testCases[selectedTestCaseIndex];

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
      {isLoadingTestCases ? (
        <TestCaseLoadingSkeleton />
      ) : Array.isArray(testCases) && testCases.length > 0 ? (
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
                      setSelectedVersions(selectedVersions.length === versions.length ? [versions[0]] : [...versions])
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
                          className={isSelected ? "font-bold text-base-content" : "font-medium text-base-content/60"}
                        >
                          V{idx + 1}
                        </span>
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
                !!runningTestCaseId ||
                selectedVersions.length === 0
              }
              title={selectedVersions.length === 0 ? "Select at least one version to run" : ""}
              className={`flex items-center gap-2 text-primary-content border border-primary rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                isloading || selectedVersions.length === 0
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
                  Run All Testcases
                </>
              )}
            </button>

            {/* Separator */}
            <div className="w-px h-8 bg-base-300 mx-1" />

            {/* Model Dropdown with Label */}
            <div
              className={`flex items-center gap-2 py-1 pl-2 pr-2.5 rounded-lg ${
                !selectedModel
                  ? "bg-transparent border border-base-content/20"
                  : "bg-primary/10 border border-primary/30"
              }`}
            >
              <span className="text-[10px] font-bold text-base-content/50 tracking-wide uppercase whitespace-nowrap">
                Run with
              </span>
              <TestCaseModelDropdown
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                onServiceChange={setSelectedService}
              />
            </div>
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
            <p className="text-sm text-base-content/60">
              Add test cases from chat history to compare outputs across different versions and prompts.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      {Array.isArray(testCases) && testCases.length > 0 && (
        <div className="flex-1 min-h-0 overflow-hidden px-6 pb-4 pt-3" data-testid="testcase-main-grid-wrapper">
          <div className="grid grid-cols-12 gap-4 h-full relative">
            {/* Left Panel - Test Cases List */}
            <div
              className="col-span-4 bg-base-100 border border-base-200 rounded-xl overflow-hidden flex flex-col h-full relative z-10 shadow-lg"
              data-testid="testcase-list-panel"
            >
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
                          style={{ left: 0, width: 48, minWidth: 48 }}
                          className="px-2 py-3 text-left text-xs font-semibold text-base-content uppercase tracking-wider sticky bg-base-50 z-30"
                        >
                          #
                        </th>
                        <th
                          style={{ left: 48, width: 140, minWidth: 140 }}
                          className="px-2 py-3 text-left text-xs font-semibold text-base-content uppercase tracking-wider sticky bg-base-50 z-30"
                        >
                          Input
                        </th>
                        {selectedVersions.map((version, idx) => (
                          <th
                            key={idx}
                            data-testid={`testcase-list-version-header-${idx}`}
                            className="px-2 py-3 text-center text-xs font-semibold text-base-content uppercase tracking-wider min-w-[60px] bg-base-50 "
                          >
                            v{versions.indexOf(version) + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200" data-testid="testcase-list-table-body">
                      {Array.isArray(testCases) &&
                        testCases.map((testCase, index) => {
                          const lastUserMessageRaw = testCase?.conversation
                            ?.filter((message) => message?.role === "user")
                            ?.pop()?.content;
                          const lastUserMessage =
                            typeof lastUserMessageRaw === "object" && lastUserMessageRaw !== null
                              ? JSON.stringify(lastUserMessageRaw)
                              : lastUserMessageRaw || "N/A";

                          const isSelected = selectedTestCaseIndex === index;

                          return (
                            <tr
                              key={index}
                              data-testid={`testcase-row-${testCase?._id || index}`}
                              onClick={() => setSelectedTestCaseIndex(index)}
                              className={`cursor-pointer transition-all ${isSelected ? "bg-base-200 border-l-4 border-l-primary" : "bg-base-100 hover:bg-base-50 border-l-4 border-l-transparent"}`}
                            >
                              <td
                                style={{ left: 0, width: 48, minWidth: 48 }}
                                className={`px-2 py-3.5 text-sm sticky z-20 ${isSelected ? "bg-base-200 font-semibold text-primary" : "bg-base-100 font-medium text-base-content"}`}
                              >
                                {index + 1}
                              </td>
                              <td
                                style={{ left: 48, width: 140, minWidth: 140 }}
                                className={`px-2 py-3.5 text-sm sticky z-20 ${isSelected ? "bg-base-200 font-semibold text-primary" : "bg-base-100 font-medium text-base-content"} whitespace-nowrap overflow-hidden text-ellipsis`}
                              >
                                {lastUserMessage?.substring(0, 20)}
                                {lastUserMessage?.length > 20 ? "..." : ""}
                              </td>
                              {selectedVersions.map((version, vIdx) => {
                                const versionArray = testCase?.version_history?.[version];
                                const latestResult = versionArray?.[0];
                                const score = latestResult?.score || 0;
                                const matchingTypeFromResult = testCase?.matching_type || "cosine";
                                const runError = latestResult?.error;
                                const runErrorMessage =
                                  typeof runError === "string"
                                    ? runError
                                    : runError?.error || runError?.message || (runError ? "Run failed" : null);
                                return (
                                  <td
                                    key={vIdx}
                                    data-testid={`testcase-row-${testCase?._id || index}-version-${versions.indexOf(version) + 1}`}
                                    className={`px-2 py-3.5 text-center min-w-[60px] bg-base-100"}`}
                                  >
                                    {versionArray &&
                                      (runErrorMessage ? (
                                        <span
                                          title={runErrorMessage}
                                          className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-error/10 text-error"
                                        >
                                          Error
                                        </span>
                                      ) : (
                                        <span
                                          className={`text-xs font-semibold cursor-help ${getScoreColor(score, matchingTypeFromResult)}`}
                                          title={getScoreMessage(score, matchingTypeFromResult)}
                                        >
                                          {getScoreDisplay(score, matchingTypeFromResult)}
                                        </span>
                                      ))}
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
              <div
                className="px-4 py-3 border-t border-base-200 text-xs text-base-content/60 bg-base-50"
                data-testid="testcase-list-footer"
              >
                {testCasesTotal > 0 ? `${testCasesTotal} testcases` : "0 testcases"}
              </div>
            </div>

            {/* Right Panel - Details */}
            <div className="col-span-8 h-full min-h-0 overflow-hidden" data-testid="testcase-details-panel-host">
              <TestCaseDetailsPanel
                selectedTestCase={selectedTestCase}
                selectedVersions={selectedVersions}
                versions={versions}
                runningTestCaseId={runningTestCaseId}
                isloading={isloading}
                handleRunSingleTestCase={handleRunSingleTestCase}
                handleDeleteTestCase={handleDeleteTestCase}
                getScoreColor={getScoreColor}
                getScoreMessage={getScoreMessage}
                getScoreDisplay={getScoreDisplay}
                bridgeId={resolvedParams?.id}
                onTestCaseUpdate={() => dispatch(getAllTestCasesOfBridgeAction({ bridgeId: resolvedParams?.id }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestCases;
