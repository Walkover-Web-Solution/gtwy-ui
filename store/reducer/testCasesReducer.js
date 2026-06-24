import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  testCases: {},
  testRuns: {},
};

// Stable identifier for "which (service, model) produced this run". Empty string
// segments are normalized so that a "default" run (no model override) collapses
// to a single key — keeping single-model runs deduped exactly like before.
const DEFAULT_MODEL_KEY = "__default__";
const buildModelKey = (model, service, isOverridden) => {
  // Non-overridden runs (i.e. the version's configured default model) always
  // collapse into a single "Default" bucket so tabs don't split on per-version
  // model names.
  if (isOverridden === false) return DEFAULT_MODEL_KEY;
  return `${service || ""}:${model || ""}`;
};

const applyResultToTestCase = (
  state,
  bridgeId,
  versionId,
  result,
  payloadModel = null,
  payloadService = null,
  payloadIsOverridden = undefined
) => {
  if (!result || !result.testcase_id) return false;
  // Skipped results (no_changes_since_last_execution) carry null score / null
  // actual_result — they are NOT a fresh evaluation and would clobber the
  // previously cached run for this version. Leave version_history untouched.
  if (result.skipped) return false;
  const list = state.testCases[bridgeId];
  if (!Array.isArray(list)) return false;
  const tc = list.find((t) => t._id === result.testcase_id);
  if (!tc) return false;
  if (!tc.version_history) tc.version_history = {};
  if (!Array.isArray(tc.version_history[versionId])) tc.version_history[versionId] = [];
  const nowIso = new Date().toISOString();

  const finalModel = result.model || payloadModel;
  const finalService = result.service || payloadService;

  // Use unshift to add at index 0 (newest) to match API structure
  const inputTokens = result?.tokens?.input_tokens || 0;
  const outputTokens = result?.tokens?.output_tokens || 0;
  // RTLayer sends flat total_tokens/cost, history API sends nested tokens object
  const totalTokens = result?.total_tokens || inputTokens + outputTokens;
  const cost = result?.cost || result?.tokens?.expected_cost || 0;

  const finalIsOverridden =
    typeof result?.is_overridden === "boolean"
      ? result.is_overridden
      : typeof payloadIsOverridden === "boolean"
        ? payloadIsOverridden
        : undefined;

  tc.version_history[versionId].unshift({
    score: result.score,
    model_output: result.actual_result,
    expected: result.expected,
    matching_type: result.matching_type,
    reason: result.reason || null,
    success: result.success,
    error: result.error || null,
    tools_call_data: result.tools_call_data || null,
    service: finalService,
    model: finalModel,
    is_overridden: finalIsOverridden,
    tokens: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
    },
    cost: cost,
    latency: result?.latency || null,
    metadata: { bridge_id: result.bridge_id || bridgeId },
    created_at: nowIso,
  });
  // Mirror the backend's `execution.lastExecutedAt` so the in-memory testcase
  // matches what a refresh would fetch. Without this, the single-run button's
  // "no changes since last execution" guard would only trigger after a reload.
  tc.execution = { ...(tc.execution || {}), lastExecutedAt: nowIso };
  return true;
};

const testCasesReducer = createSlice({
  name: "testCases",
  initialState,
  reducers: {
    createTestCaseReducer: (state, action) => {
      const { data, bridgeId } = action.payload;
      if (state.testCases[bridgeId]) {
        state.testCases[bridgeId].push(data);
      } else {
        state.testCases[bridgeId] = [data];
      }
      return state;
    },
    getAllTestCasesReducer: (state, action) => {
      const { data, bridgeId, total } = action.payload;
      state.testCases[bridgeId] = data;
      // Store total count
      if (!state.testCasesTotal) state.testCasesTotal = {};
      state.testCasesTotal[bridgeId] = total;
      // Transform embedded history to version_history structure
      if (Array.isArray(data)) {
        data.forEach((testCase) => {
          if (testCase?.history && Array.isArray(testCase.history)) {
            if (!testCase.version_history) testCase.version_history = {};
            testCase.history.forEach((historyItem) => {
              const versionId = historyItem?.version_id;
              if (versionId) {
                if (!testCase.version_history[versionId]) {
                  testCase.version_history[versionId] = [];
                }
                // Transform history item to match expected version_history structure
                const inputTokens = historyItem?.tokens?.input_tokens || 0;
                const outputTokens = historyItem?.tokens?.output_tokens || 0;
                const totalTokens = inputTokens + outputTokens;
                const cost = historyItem?.tokens?.expected_cost || 0;

                testCase.version_history[versionId].push({
                  score: historyItem?.testcase_data?.score || 0,
                  model_output: historyItem?.llm_message,
                  error: historyItem?.error,
                  matching_type: historyItem?.testcase_data?.matching_type || testCase?.matching_type || "cosine",
                  reason: historyItem?.testcase_data?.reason || historyItem?.reason || null,
                  actual: historyItem?.testcase_data?.actual,
                  expected: historyItem?.testcase_data?.expected,
                  success: historyItem?.testcase_data?.success,
                  tools_call_data: historyItem?.tools_call_data || null,
                  service: historyItem?.service,
                  model: historyItem?.model || historyItem?.testcase_data?.model,
                  is_overridden: historyItem?.testcase_data?.is_overridden,
                  tokens: {
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    total_tokens: totalTokens,
                  },
                  cost: cost,
                  latency: historyItem?.latency || null,
                  created_at: historyItem?.created_at,
                  updated_at: historyItem?.updated_at,
                  // Keep original data for reference
                  _original: historyItem,
                });
              }
            });
          }
        });
      }
    },
    appendTestCasesReducer: (state, action) => {
      const { data, bridgeId, total } = action.payload;
      if (!Array.isArray(data) || data.length === 0) return;
      if (Array.isArray(state.testCases[bridgeId])) {
        const existingIds = new Set(state.testCases[bridgeId].map((tc) => tc?._id));
        const deduped = data.filter((tc) => tc && !existingIds.has(tc._id));
        state.testCases[bridgeId] = state.testCases[bridgeId].concat(deduped);
      } else {
        state.testCases[bridgeId] = data;
      }
      // Update total count
      if (!state.testCasesTotal) state.testCasesTotal = {};
      state.testCasesTotal[bridgeId] = total;
      // Transform embedded history to version_history structure
      data.forEach((testCase) => {
        if (testCase?.history && Array.isArray(testCase.history)) {
          if (!testCase.version_history) testCase.version_history = {};
          testCase.history.forEach((historyItem) => {
            const versionId = historyItem?.version_id;
            if (versionId) {
              if (!testCase.version_history[versionId]) {
                testCase.version_history[versionId] = [];
              }
              // Transform history item to match expected version_history structure
              testCase.version_history[versionId].push({
                score: historyItem?.testcase_data?.score || 0,
                model_output: historyItem?.llm_message,
                error: historyItem?.error,
                matching_type: historyItem?.testcase_data?.matching_type || testCase?.matching_type || "cosine",
                reason: historyItem?.testcase_data?.reason || historyItem?.reason || null,
                actual: historyItem?.testcase_data?.actual,
                expected: historyItem?.testcase_data?.expected,
                success: historyItem?.testcase_data?.success,
                tools_call_data: historyItem?.tools_call_data || null,
                service: historyItem?.service,
                model: historyItem?.model || historyItem?.testcase_data?.model,
                is_overridden: historyItem?.testcase_data?.is_overridden,
                latency: historyItem?.latency || null,
                created_at: historyItem?.created_at,
                updated_at: historyItem?.updated_at,
                // Keep original data for reference
                _original: historyItem,
              });
            }
          });
        }
      });
    },
    deleteTestCaseReducer: (state, action) => {
      const { testCaseId, bridgeId } = action.payload;
      if (state.testCases[bridgeId]) {
        state.testCases[bridgeId] = state.testCases[bridgeId].filter((testCase) => testCase._id !== testCaseId);
        // Update total count
        if (state.testCasesTotal[bridgeId]) {
          state.testCasesTotal[bridgeId] = Math.max(0, state.testCasesTotal[bridgeId] - 1);
        }
      }
      return state;
    },
    deleteMultipleTestCasesReducer: (state, action) => {
      const { testCaseIds, bridgeId } = action.payload || {};
      if (!bridgeId || !Array.isArray(testCaseIds) || testCaseIds.length === 0) return;
      if (state.testCases[bridgeId]) {
        const idSet = new Set(testCaseIds);
        const before = state.testCases[bridgeId].length;
        state.testCases[bridgeId] = state.testCases[bridgeId].filter((tc) => !idSet.has(tc._id));
        const removed = before - state.testCases[bridgeId].length;
        if (state.testCasesTotal[bridgeId]) {
          state.testCasesTotal[bridgeId] = Math.max(0, state.testCasesTotal[bridgeId] - removed);
        }
      }
    },
    updateTestCaseReducer: (state, action) => {
      const { testCaseId, dataToUpdate } = action.payload;
      const bridgeId = dataToUpdate?.bridge_id;
      if (bridgeId && state.testCases[bridgeId]) {
        const index = state.testCases[bridgeId].findIndex((testCase) => testCase._id === testCaseId);
        if (index !== -1) {
          // Update the test case with new data while preserving fields the
          // backend response doesn't echo back (version_history, execution).
          // Otherwise the previously cached per-version run results would be
          // wiped from the UI on every edit until a page refresh re-fetches.
          const existing = state.testCases[bridgeId][index] || {};
          state.testCases[bridgeId][index] = {
            ...existing,
            ...dataToUpdate,
            version_history: dataToUpdate?.version_history ?? existing.version_history,
            execution: dataToUpdate?.execution ?? existing.execution,
          };
        }
      }
      return state;
    },
    runTestCaseReducer: (state, action) => {
      const { data, bridgeId, versionId } = action.payload;
      const testcases_result = data?.testcases_result;

      if (testcases_result && state.testCases[bridgeId]) {
        Object.keys(testcases_result).forEach((testCaseId) => {
          const testCase = state.testCases[bridgeId].find((testCase) => testCase._id === testCaseId);

          if (testCase) {
            if (!testCase.version_history) {
              testCase.version_history = {};
            }
            if (!testCase.version_history[versionId]) {
              testCase.version_history[versionId] = [];
            }
            // Use unshift to add at index 0 (newest) to match API structure
            testCase.version_history[versionId].unshift(testcases_result[testCaseId]?.result);
          }
        });
      }
      return state;
    },

    // ---------- RTLayer-driven test run lifecycle ----------
    testRunStartedReducer: (state, action) => {
      const {
        bridgeId,
        total = 0,
        versionIds = [],
        testcaseId = null,
        testcaseIds = null,
        preserveTestcaseId = false,
        expectedRunsPerVersion = null,
      } = action.payload || {};
      if (!bridgeId) return;
      const existing = state.testRuns[bridgeId];
      // If preserveTestcaseId is true and existing testcaseId exists (not null), preserve it
      // This prevents RT layer from overwriting the testcaseId for single test case runs
      // For run all (testcaseId is null), we allow RT layer to set it or keep it null
      const finalTestcaseId =
        preserveTestcaseId && existing?.testcaseId !== null && existing?.testcaseId !== undefined
          ? existing.testcaseId
          : testcaseId;
      // Preserve existing testcaseIds when the new payload doesn't include them
      // (e.g. RTLayer "run_started" re-dispatches without bulk scope info).
      const finalTestcaseIds =
        Array.isArray(testcaseIds) && testcaseIds.length > 0
          ? testcaseIds
          : Array.isArray(existing?.testcaseIds) && existing.testcaseIds.length > 0
            ? existing.testcaseIds
            : null;
      state.testRuns[bridgeId] = {
        status: "running",
        total: Number(total) || existing?.total || 0,
        completed: 0,
        versionIds: Array.isArray(versionIds) && versionIds.length > 0 ? versionIds : existing?.versionIds || [],
        testcaseId: finalTestcaseId,
        // List of testcase IDs included in this run; null/empty means "run all"
        testcaseIds: finalTestcaseIds,
        error: null,
        // Number of model results to expect per version (default model + each
        // entry in models[]). Null means "unknown" (e.g. preserved RTLayer event).
        expectedRunsPerVersion:
          typeof expectedRunsPerVersion === "number"
            ? expectedRunsPerVersion
            : (existing?.expectedRunsPerVersion ?? null),
        seen: {}, // Clear seen object on new run to allow reprocessing results
      };
    },
    testRunResultReducer: (state, action) => {
      const { bridgeId, versionId, result, model, service, isOverridden } = action.payload || {};
      if (!bridgeId || !versionId || !result?.testcase_id) return;
      const run = state.testRuns[bridgeId];
      const effectiveIsOverridden =
        typeof result?.is_overridden === "boolean"
          ? result.is_overridden
          : typeof isOverridden === "boolean"
            ? isOverridden
            : undefined;
      const modelKey = buildModelKey(result?.model || model, result?.service || service, effectiveIsOverridden);
      const seenKey = `${versionId}:${modelKey}:${result.testcase_id}`;
      if (run?.seen?.[seenKey]) return; // dedup
      applyResultToTestCase(state, bridgeId, versionId, result, model, service, effectiveIsOverridden);
      if (!run) return;
      run.seen[seenKey] = true;
      // Track which versions have reported for each testcase. A testcase only
      // counts as "completed" once we've received results for every version
      // it was scheduled against.
      if (!run.perTestcase) run.perTestcase = {};
      const tcId = result.testcase_id;
      if (!run.perTestcase[tcId]) run.perTestcase[tcId] = {};
      run.perTestcase[tcId][versionId] = true;
      const expectedVersions = Array.isArray(run.versionIds) && run.versionIds.length > 0 ? run.versionIds.length : 1;
      const reportedVersions = Object.keys(run.perTestcase[tcId]).length;
      if (reportedVersions >= expectedVersions && !run.perTestcase[tcId].__counted) {
        run.perTestcase[tcId].__counted = true;
        run.completed = (run.completed || 0) + 1;
      }
    },
    testRunCompletedReducer: (state, action) => {
      const { bridgeId, payload } = action.payload || {};
      if (!bridgeId) return;
      // Extract model and service from payload level (applies to all results)
      const payloadModel = payload?.model;
      const payloadService = payload?.service_name;

      // Apply any straggler results from final payload (skipped/cached testcases live here).
      const run = state.testRuns[bridgeId];
      const resultsByVersion = payload?.results_by_version || payload?.results || payload?.version_results || null;

      if (resultsByVersion) {
        if (typeof resultsByVersion === "object" && !Array.isArray(resultsByVersion)) {
          Object.entries(resultsByVersion).forEach(([versionId, results]) => {
            if (!Array.isArray(results)) return;
            results.forEach((result) => {
              if (!result?.testcase_id) return;
              const modelKey = buildModelKey(result?.model || payloadModel, result?.service || payloadService);
              const seenKey = `${versionId}:${modelKey}:${result.testcase_id}`;
              if (run?.seen?.[seenKey]) return;
              const applied = applyResultToTestCase(state, bridgeId, versionId, result, payloadModel, payloadService);
              if (run) {
                run.seen[seenKey] = true;
                if (applied) run.completed = (run.completed || 0) + 1;
              }
              // Also store in directTestResults for testcases that don't exist in database
              if (!state.directTestResults) state.directTestResults = {};
              if (!state.directTestResults[bridgeId]) state.directTestResults[bridgeId] = {};
              if (!state.directTestResults[bridgeId][versionId]) state.directTestResults[bridgeId][versionId] = {};
              state.directTestResults[bridgeId][versionId][result.testcase_id] = result;
            });
          });
        } else if (Array.isArray(resultsByVersion)) {
          resultsByVersion.forEach((versionGroup) => {
            const versionId = versionGroup?.version_id;
            const results = versionGroup?.results;
            // Model and service can be at versionGroup level or payload level
            const groupModel = versionGroup?.model || payloadModel;
            const groupService = versionGroup?.service_name || payloadService;
            if (!versionId || !Array.isArray(results)) return;
            results.forEach((result) => {
              if (!result?.testcase_id) return;
              const modelKey = buildModelKey(result?.model || groupModel, result?.service || groupService);
              const seenKey = `${versionId}:${modelKey}:${result.testcase_id}`;

              // If already seen, update with model/service/tokens/cost from versionGroup
              if (run?.seen?.[seenKey]) {
                const list = state.testCases[bridgeId];
                if (Array.isArray(list)) {
                  const tc = list.find((t) => t._id === result.testcase_id);
                  if (
                    tc &&
                    Array.isArray(tc.version_history?.[versionId]) &&
                    tc.version_history[versionId].length > 0
                  ) {
                    // Update the first (newest) entry with model, service, tokens, cost
                    const latestRun = tc.version_history[versionId][0];
                    if (latestRun) {
                      latestRun.model = latestRun.model || groupModel;
                      latestRun.service = latestRun.service || groupService;
                      const resultTotalTokens = result?.total_tokens || 0;
                      const resultCost = result?.cost || 0;
                      if (resultTotalTokens > 0 && (!latestRun.tokens || !latestRun.tokens.total_tokens)) {
                        latestRun.tokens = {
                          input_tokens: latestRun?.tokens?.input_tokens || 0,
                          output_tokens: latestRun?.tokens?.output_tokens || 0,
                          total_tokens: resultTotalTokens,
                        };
                      }
                      if (resultCost > 0 && !latestRun.cost) {
                        latestRun.cost = resultCost;
                      }
                    }
                  }
                }
                return;
              }

              const applied = applyResultToTestCase(state, bridgeId, versionId, result, groupModel, groupService);
              if (run) {
                run.seen[seenKey] = true;
                if (applied) run.completed = (run.completed || 0) + 1;
              }
              // Also store in directTestResults for testcases that don't exist in database
              if (!state.directTestResults) state.directTestResults = {};
              if (!state.directTestResults[bridgeId]) state.directTestResults[bridgeId] = {};
              if (!state.directTestResults[bridgeId][versionId]) state.directTestResults[bridgeId][versionId] = {};
              state.directTestResults[bridgeId][versionId][result.testcase_id] = result;
            });
          });
        }
      }
      if (run) {
        run.status = "completed";
      } else {
        state.testRuns[bridgeId] = { status: "completed", total: 0, completed: 0, seen: {} };
      }
    },
    testRunFailedReducer: (state, action) => {
      const { bridgeId, error } = action.payload || {};
      if (!bridgeId) return;
      if (state.testRuns[bridgeId]) {
        state.testRuns[bridgeId].status = "error";
        state.testRuns[bridgeId].error = error || "Test run failed";
      } else {
        state.testRuns[bridgeId] = { status: "error", error: error || "Test run failed", seen: {} };
      }
    },
    testRunResetReducer: (state, action) => {
      const { bridgeId } = action.payload || {};
      if (bridgeId) delete state.testRuns[bridgeId];
    },
    // Store direct testcase results (testcases that don't exist in database)
    directTestResultReducer: (state, action) => {
      const { bridgeId, versionId, result } = action.payload || {};
      if (!bridgeId || !versionId || !result?.testcase_id) return;
      if (!state.directTestResults) state.directTestResults = {};
      if (!state.directTestResults[bridgeId]) state.directTestResults[bridgeId] = {};
      if (!state.directTestResults[bridgeId][versionId]) state.directTestResults[bridgeId][versionId] = {};
      state.directTestResults[bridgeId][versionId][result.testcase_id] = result;
    },
  },
});

export const {
  createTestCaseReducer,
  getAllTestCasesReducer,
  appendTestCasesReducer,
  deleteTestCaseReducer,
  deleteMultipleTestCasesReducer,
  runTestCaseReducer,
  updateTestCaseReducer,
  testRunStartedReducer,
  testRunResultReducer,
  testRunCompletedReducer,
  testRunFailedReducer,
  testRunResetReducer,
  directTestResultReducer,
} = testCasesReducer.actions;

export default testCasesReducer.reducer;
