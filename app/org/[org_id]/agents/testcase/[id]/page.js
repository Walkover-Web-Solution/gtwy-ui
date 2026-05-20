"use client";
import React, { useState, useEffect, useMemo, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import InfiniteScroll from "react-infinite-scroll-component";
import { deleteTestCaseAction, getAllTestCasesOfBridgeAction, runTestCaseAction } from "@/store/action/testCasesAction";
import { PlayIcon } from "@/components/Icons";
import { FileText } from "lucide-react";
import TutorialSuggestionToast from "@/components/TutorialSuggestoinToast";
import PageHeader from "@/components/Pageheader";
import TestCaseDetailsPanel from "@/components/testcaseComponents/TestCaseDetailsPanel";

const TestCaseLoadingSkeleton = () => (
  <div className="w-full h-full flex flex-col gap-4 px-6 py-4 animate-pulse">
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
  const { testCases, isFirstTestcase, testRun } = useCustomSelector((state) => ({
    testCases: state?.testCasesReducer?.testCases?.[resolvedParams?.id] || {},
    isFirstTestcase: state?.userDetailsReducer?.userDetails?.meta?.onboarding?.TestCasesSetup || "",
    testRun: state?.testCasesReducer?.testRuns?.[resolvedParams?.id] || null,
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
      const testCase = Array.isArray(testCases) && testCases.find((tc) => tc._id === testCaseId);
      const testCaseMatchingType = testCase?.matching_type || "AI";

      await dispatch(
        runTestCaseAction({
          testcase_id: testCaseId,
          versionIds: selectedVersions,
          bridgeId: resolvedParams?.id,
          matching_type: testCaseMatchingType.toLowerCase(),
          variables,
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
  const [versionSliderStart, setVersionSliderStart] = useState(0);

  // Sync local UI state with the RTLayer-driven testRun in redux.
  // `isloading` represents *any* active run (Run-All or single) so that every
  // run button stays disabled until the run completes.
  useEffect(() => {
    const isRunning = testRun?.status === "running";
    setIsLoading(isRunning);
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

  const getScoreDisplay = (score, matchingType) => {
    const type = (matchingType || "cosine").toLowerCase();
    if (type === "exact" || type === "ai") {
      return score === 1 ? "Pass" : "Fail";
    }
    // Cosine shows percentage
    return `${(score * 100).toFixed(0)}%`;
  };

  return (
    <div className="bg-base-50 h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-4">
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
          <div className="px-6 pt-3 pb-3">
            {/* Versions and Run Button Row */}
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <span className="text-sm font-medium text-base-content">Versions:</span>
              {versions.length > 1 && (
                <button
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    selectedVersions.length === versions.length
                      ? "bg-primary text-primary-content shadow-sm"
                      : "bg-base-200 text-base-content hover:bg-base-300"
                  }`}
                  onClick={() => {
                    // Toggling ALL off would leave zero selected — keep the
                    // first version selected so a run is always possible.
                    if (selectedVersions.length === versions.length) {
                      setSelectedVersions([versions[0]]);
                    } else {
                      setSelectedVersions([...versions]);
                    }
                  }}
                >
                  ALL
                </button>
              )}
              <div className="flex items-center gap-1.5 flex-wrap">
                {versions.slice(versionSliderStart, versionSliderStart + 10).map((version, idx) => (
                  <button
                    key={versionSliderStart + idx}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      selectedVersions.includes(version)
                        ? "bg-primary text-primary-content shadow-sm"
                        : "bg-base-200 text-base-content hover:bg-base-300"
                    }`}
                    onClick={() => {
                      setSelectedVersions((prev) => {
                        // Never allow zero selected versions.
                        if (prev.includes(version)) {
                          if (prev.length <= 1) return prev;
                          return prev.filter((v) => v !== version);
                        }
                        return [...prev, version];
                      });
                    }}
                  >
                    V{versionSliderStart + idx + 1}
                  </button>
                ))}
              </div>
              {versions.length > 10 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setVersionSliderStart(Math.max(0, versionSliderStart - 10))}
                    disabled={versionSliderStart === 0}
                    className="px-2 py-1.5 rounded-md text-xs font-semibold bg-base-200 text-base-content hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Previous versions"
                  >
                    ←
                  </button>
                  <span className="text-xs text-base-content/60 px-1">
                    {versionSliderStart + 1}-{Math.min(versionSliderStart + 10, versions.length)} of {versions.length}
                  </span>
                  <button
                    onClick={() => setVersionSliderStart(Math.min(versions.length - 10, versionSliderStart + 10))}
                    disabled={versionSliderStart + 10 >= versions.length}
                    className="px-2 py-1.5 rounded-md text-xs font-semibold bg-base-200 text-base-content hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Next versions"
                  >
                    →
                  </button>
                </div>
              )}
              <button
                onClick={handleRunAllTestCases}
                disabled={
                  !Array.isArray(testCases) || testCases.length === 0 || isloading || selectedVersions.length === 0
                }
                title={selectedVersions.length === 0 ? "Select at least one version to run" : ""}
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-content rounded-lg flex items-center gap-2 font-medium transition-all text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ml-auto"
              >
                {isloading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {testRun?.total ? `Running ${testRun?.completed || 0}/${testRun.total}` : "Running"}
                  </>
                ) : (
                  <>
                    <PlayIcon size={16} />
                    Run All Testcases
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Empty State - only show when fully loaded and no testcases */
        <div className="flex-1 flex items-center justify-center px-6 pb-6 pt-6">
          <div className="flex flex-col items-center justify-center text-center max-w-md py-16 px-8 bg-base-100 border border-dashed border-base-300 rounded-xl w-full">
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
        <div className="flex-1 min-h-0 overflow-hidden px-6 pb-4 pt-3">
          <div className="grid grid-cols-12 gap-4 h-full relative">
            {/* Left Panel - Test Cases List */}
            <div className="col-span-4 bg-base-100 border border-base-200 rounded-xl overflow-hidden flex flex-col h-full relative z-10 shadow-lg">
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
                  <table className="w-full border-collapse bg-base-100">
                    <thead className="bg-base-50 sticky top-0 z-20">
                      <tr className="border-b border-base-200">
                        <th className="px-2 py-3 text-left text-xs font-semibold text-base-content uppercase tracking-wider sticky left-0 bg-base-50 w-[40px] z-30">
                          #
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-semibold text-base-content uppercase tracking-wider sticky left-[40px] bg-base-50 w-[140px] z-30">
                          Input
                        </th>
                        {selectedVersions.map((version, idx) => (
                          <th
                            key={idx}
                            className="px-2 py-3 text-center text-xs font-semibold text-base-content uppercase tracking-wider min-w-[60px] bg-base-50 z-20"
                          >
                            v{versions.indexOf(version) + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200">
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
                              onClick={() => setSelectedTestCaseIndex(index)}
                              className={`cursor-pointer transition-all ${isSelected ? "bg-base-200" : "bg-base-100 hover:bg-base-50"}`}
                            >
                              <td
                                className={`px-2 py-3.5 text-sm sticky left-0 z-10 w-[40px] ${isSelected ? "bg-base-200 font-semibold" : "bg-base-100 font-medium"} text-base-content`}
                              >
                                {index + 1}
                              </td>
                              <td
                                className={`px-2 py-3.5 text-sm sticky left-[40px] z-10 w-[140px] ${isSelected ? "bg-base-200 font-semibold" : "bg-base-100 font-medium"} text-base-content whitespace-nowrap overflow-hidden text-ellipsis`}
                              >
                                {lastUserMessage?.substring(0, 20)}
                                {lastUserMessage?.length > 20 ? "..." : ""}
                              </td>
                              {selectedVersions.map((version, vIdx) => {
                                const versionArray = testCase?.version_history?.[version];
                                const latestResult = versionArray?.[versionArray?.length - 1];
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
                                    className={`px-2 py-3.5 text-center min-w-[60px] ${isSelected ? "bg-base-200" : "bg-base-100"}`}
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
                                          className={`text-xs font-semibold ${getScoreColor(score, matchingTypeFromResult)}`}
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
              <div className="px-4 py-3 border-t border-base-200 text-xs text-base-content/60 bg-base-50">
                {Array.isArray(testCases) ? `${testCases.length} testcases` : "0 testcases"}
              </div>
            </div>

            {/* Right Panel - Details */}
            <div className="col-span-8 h-full min-h-0 overflow-hidden">
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
