"use client";
import React, { useState, useEffect, useMemo, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { useDispatch } from "react-redux";
import {
  deleteTestCaseAction,
  getAllTestCasesOfBridgeAction,
  runTestCaseAction,
  updateTestCaseAction,
} from "@/store/action/testCasesAction";
import { PencilIcon, PlayIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from "@/components/Icons";
import OnBoarding from "@/components/OnBoarding";
import TutorialSuggestionToast from "@/components/TutorialSuggestoinToast";
import useTutorialVideos from "@/hooks/useTutorialVideos";
import PageHeader from "@/components/Pageheader";

export const runtime = "edge";

function TestCases({ params }) {
  // Use the tutorial videos hook
  const { getTestCasesVideo } = useTutorialVideos();

  const resolvedParams = use(params);
  const router = useRouter();
  const dispatch = useDispatch();
  const [isloading, setIsLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [editUserInput, setEditUserInput] = useState("");
  const [editExpectedOutput, setEditExpectedOutput] = useState("");
  const searchParams = useSearchParams();
  const bridgeVersion = searchParams.get("version");
  const [selectedVersion, setSelectedVersion] = useState(searchParams.get("versionId") || "");

  const allBridges = useCustomSelector((state) => state?.bridgeReducer?.org?.[resolvedParams?.org_id]?.orgs || [])
    .slice()
    .reverse();
  const { testCases, isFirstTestcase } = useCustomSelector((state) => ({
    testCases: state?.testCasesReducer?.testCases?.[resolvedParams?.id] || {},
    isFirstTestcase: state?.userDetailsReducer?.userDetails?.meta?.onboarding?.TestCasesSetup || "",
  }));
  const [tutorialState, setTutorialState] = useState({
    showTutorial: false,
    showSuggestion: isFirstTestcase,
  });
  const versions = useMemo(() => {
    return allBridges.find((bridge) => bridge?._id === resolvedParams?.id)?.versions || [];
  }, [allBridges, resolvedParams?.id]);

  useEffect(() => {
    dispatch(getAllTestCasesOfBridgeAction({ bridgeId: resolvedParams?.id }));
  }, []);

  useEffect(() => {
    if (selectedVersion) {
      // Preserve the type parameter when updating URL
      const typeParam = searchParams.get("type");
      const typeQueryPart = typeParam ? `&type=${typeParam}` : "";
      router.push(`?version=${bridgeVersion}&versionId=${selectedVersion}${typeQueryPart}`);
    }
  }, [selectedVersion, router, searchParams]);

  const handleRunTestCase = (versionId) => {
    setIsLoading(true);
    dispatch(runTestCaseAction({ versionId, bridgeId: resolvedParams?.id })).then(() => {
      dispatch(getAllTestCasesOfBridgeAction({ bridgeId: resolvedParams?.id }));
      setIsLoading(false);
      setSelectedVersion(versionId);
    });

    // Preserve the type parameter when updating URL
    const typeParam = searchParams.get("type");
    const typeQueryPart = typeParam ? `&type=${typeParam}` : "";
    router.push(`?version=${bridgeVersion}&versionId=${versionId}${typeQueryPart}`);
  };

  const toggleRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleEditClick = (e, index, testCase) => {
    e?.stopPropagation();
    setEditingIndex(index);
    setEditUserInput(testCase?.conversation?.[testCase?.conversation?.length - 1]?.content || "");
    setEditExpectedOutput(
      testCase?.expected?.tool_calls
        ? JSON.stringify(testCase?.expected?.tool_calls)
        : testCase?.expected?.response || ""
    );
  };

  const handleSaveEdit = (e, testCase) => {
    e?.stopPropagation();
    const updatedTestCase = {
      ...testCase,
      conversation: testCase?.conversation?.map((message, i) =>
        i === testCase?.conversation?.length - 1 && message?.role === "user"
          ? { ...message, content: editUserInput }
          : message
      ),
      expected:
        testCase?.type === "function"
          ? { tool_calls: JSON.parse(editExpectedOutput) }
          : { response: editExpectedOutput },
    };
    dispatch?.(updateTestCaseAction({ testCaseId: testCase?._id, dataToUpdate: updatedTestCase }));
    setEditingIndex(null);
  };

  return (
    <div className="p-6 bg-base-100 rounded-lg shadow-sm relative">
      {/* Loading Overlay */}
      {isloading && (
        <div className="absolute inset-0 bg-base-100/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-50">
          <div className="flex items-center gap-3 bg-base-100 p-6 rounded-lg shadow-lg border border-base-content/20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <div className="flex flex-col">
              <span className="text-lg font-medium text-base-content">Running Test Cases</span>
              <span className="text-sm text-base-content/60">Please wait while we process your test cases...</span>
            </div>
          </div>
        </div>
      )}

      <div className="">
        <PageHeader
          title="Test Cases"
          description="Test cases are used to compare outputs from different versions with varying prompts and models. You can add test cases from chat history and choose a comparison type - Exact, AI, or Cosine to measure accuracy."
          docLink="https://gtwy.ai/blogs/features/testcases"
        />
        {tutorialState?.showSuggestion && (
          <TutorialSuggestionToast
            setTutorialState={setTutorialState}
            flagKey={"TestCasesSetup"}
            TutorialDetails={"TestCases Creation"}
          />
        )}
        {tutorialState?.showTutorial && (
          <OnBoarding
            setShowTutorial={() => setTutorialState((prev) => ({ ...prev, showTutorial: false }))}
            video={getTestCasesVideo()}
            flagKey={"TestCasesSetup"}
          />
        )}
        <div className="overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-base-100">
                <tr>
                  <th className="w-8 p-3 text-left text-sm font-medium text-base-content border-b border-base-300">
                    #
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-base-content border-b border-base-300">
                    User Input
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-base-content border-b border-base-300">
                    Expected Output
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-base-content border-b border-base-300">
                    Model Answer
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-base-content border-b border-base-300">
                    Matching Type
                  </th>
                  {versions.map((version, index) => (
                    <th
                      key={index}
                      className={`p-3 text-left text-sm font-medium text-gray-700 border-b ${version === selectedVersion ? "relative after:absolute after:left-0 after:bottom-[-2px] after:w-full after:h-[2px] after:bg-green-500 after:rounded-full" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="tooltip tooltip-left" data-tip="Run Test Case">
                          {Array.isArray(testCases) && testCases?.length > 0 && (
                            <button
                              className="btn btn-sm btn-circle bg-base-100 border border-base-300 hover:bg-primary hover:border-primary hover:text-base-content disabled:bg-base-100 disabled:border-base-300 disabled:text-base-content"
                              onClick={() => handleRunTestCase(version)}
                              disabled={!resolvedParams?.id || isloading}
                            >
                              <PlayIcon size={12} />
                            </button>
                          )}
                        </div>
                        <span className={`font-medium text-base-content `}>{`V${index + 1}`}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300 w-full">
                {Array.isArray(testCases)
                  ? testCases.map((testCase, index) => {
                      const lastUserMessage =
                        testCase?.conversation?.filter((message) => message?.role === "user")?.pop()?.content || "N/A";

                      const expectedOutput = testCase?.expected?.tool_calls
                        ? JSON.stringify(testCase?.expected?.tool_calls)
                        : testCase?.expected?.response || "N/A";

                      // Find the best version to display
                      // 1. Try the version from URL if it has data
                      // 2. Otherwise, find the last version that has data in version_history
                      const versionFromUrl = selectedVersion;
                      let displayVersion = versionFromUrl;

                      // Check if the URL version has data
                      if (!testCase?.version_history?.[displayVersion]) {
                        // Find the last version that has data, starting from the end
                        displayVersion =
                          [...versions].reverse().find((v) => testCase?.version_history?.[v]) ||
                          versions?.[versions?.length - 1];
                      }

                      const testCaseVersionArray = testCase?.version_history?.[displayVersion];
                      const modelOutputRaw = testCaseVersionArray?.[testCaseVersionArray?.length - 1]?.model_output;
                      const model_output =
                        typeof modelOutputRaw === "string" ? modelOutputRaw : JSON.stringify(modelOutputRaw);

                      const isExpanded = expandedRows[index] || false;

                      return (
                        <React.Fragment key={index}>
                          <tr
                            className="hover:bg-base-100 cursor-pointer transition-colors"
                            onClick={() => toggleRow(index)}
                          >
                            <td className="p-2 font-medium text-base-content">
                              <div className="flex items-center">
                                <span className="mr-2 text-base-content">
                                  {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                </span>
                                <span>{index + 1}</span>
                              </div>
                            </td>
                            <td className="p-3 max-w-xs truncate" title={lastUserMessage}>
                              {lastUserMessage?.substring(0, 30)}
                              {lastUserMessage?.length > 30 ? "..." : ""}
                            </td>
                            <td className="p-3 max-w-xs truncate" title={expectedOutput}>
                              {expectedOutput?.substring(0, 30)}
                              {expectedOutput?.length > 30 ? "..." : ""}
                            </td>
                            <td className="p-3 max-w-xs truncate" title={model_output}>
                              {model_output
                                ? model_output?.substring(0, 30) + (model_output?.length > 30 ? "..." : "")
                                : "N/A"}
                            </td>
                            <td className="p-3 max-w-xs truncate" title={testCase?.matching_type}>
                              {" "}
                              {testCase?.matching_type}
                            </td>
                            {versions?.map((version, versionIndex) => {
                              const versionArray = testCase?.version_history?.[version];
                              const versionScore = versionArray?.[versionArray?.length - 1]?.score;
                              return (
                                <td key={versionIndex} className="p-3 truncate max-w-20">
                                  {versionScore ? `${(versionScore * 100).toFixed(2)}%` : "0"}
                                </td>
                              );
                            })}
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={versions.length + 5} className="p-4 bg-base-100">
                                <div className="space-y-4">
                                  <div>
                                    <h3 className="text-sm font-medium text-base-content mb-1">User Input</h3>
                                    {editingIndex === index ? (
                                      <textarea
                                        value={editUserInput}
                                        onChange={(e) => setEditUserInput(e.target.value)}
                                        className="textarea bg-base-200 dark:bg-black/15/10 textarea-bordered w-full min-h-20"
                                      />
                                    ) : (
                                      <div className="p-3 bg-base-100 rounded-md shadow-sm text-sm text-base-content overflow-auto max-h-40">
                                        {lastUserMessage}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-medium text-base-content mb-1">Expected Output</h3>
                                    {editingIndex === index ? (
                                      <textarea
                                        value={editExpectedOutput}
                                        onChange={(e) => setEditExpectedOutput(e.target.value)}
                                        className="textarea bg-white dark:bg-black/15 textarea-bordered w-full min-h-20"
                                      />
                                    ) : (
                                      <div className="p-3 bg-base-100 rounded-md shadow-sm text-sm text-base-content whitespace-pre-wrap overflow-auto max-h-40">
                                        {expectedOutput}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-medium text-base-content mb-1">Model Answer</h3>
                                    <div className="p-3 bg-base-100 rounded-md shadow-sm text-sm text-base-content whitespace-pre-wrap overflow-auto max-h-40">
                                      {model_output || "N/A"}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {editingIndex === index ? (
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveEdit(e, testCase);
                                          }}
                                          className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm flex items-center gap-1.5 transition-colors"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingIndex(null);
                                          }}
                                          className="px-3 py-1.5 bg-base-100 text-base-content rounded-lg hover:bg-base-100 text-sm flex items-center gap-1.5 transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditClick(e, index, testCase);
                                        }}
                                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm flex items-center gap-1.5 transition-colors"
                                      >
                                        <PencilIcon className="w-4 h-4" /> Edit
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e?.stopPropagation();
                                        dispatch?.(
                                          deleteTestCaseAction({
                                            testCaseId: testCase?._id,
                                            bridgeId: resolvedParams?.id,
                                          })
                                        );
                                      }}
                                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm flex items-center gap-1.5 transition-colors"
                                    >
                                      <TrashIcon className="w-4 h-4" /> Delete
                                    </button>
                                  </div>

                                  <div>
                                    <h3 className="text-sm font-medium text-base-content mb-1">Version Scores</h3>
                                    <div className="flex flex-wrap gap-2">
                                      {versions?.map((version, versionIndex) => {
                                        const versionArray = testCase?.version_history?.[version];
                                        const versionScore = versionArray?.[versionArray?.length - 1]?.score;
                                        const progressValue = versionScore ? Math.round(versionScore * 100) : 0;
                                        const lastRun = versionArray?.[versionArray?.length - 1]?.created_at;
                                        return (
                                          <div
                                            key={versionIndex}
                                            className="flex flex-col gap-2 px-3 py-2 bg-base-100 rounded-lg text-sm text-base-content border border-base-300"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span>V{versionIndex + 1}:</span>
                                              <div
                                                className="radial-progress text-primary"
                                                style={{
                                                  "--value": progressValue,
                                                  "--size": "3rem",
                                                  "--thickness": "3px",
                                                }}
                                                role="progressbar"
                                              >
                                                {progressValue}%
                                              </div>
                                            </div>
                                            <div className="text-xs text-base-content">
                                              Last run: {lastRun ? new Date(lastRun).toLocaleString() : "-"}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestCases;
