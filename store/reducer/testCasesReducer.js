import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  testCases: {},
  testRuns: {},
};

const applyResultToTestCase = (state, bridgeId, versionId, result) => {
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
  tc.version_history[versionId].push({
    score: result.score,
    model_output: result.actual_result,
    expected: result.expected,
    matching_type: result.matching_type,
    success: result.success,
    error: result.error || null,
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
      const { data, bridgeId } = action.payload;
      state.testCases[bridgeId] = data;
    },
    appendTestCasesReducer: (state, action) => {
      const { data, bridgeId } = action.payload;
      if (!Array.isArray(data) || data.length === 0) return;
      if (Array.isArray(state.testCases[bridgeId])) {
        const existingIds = new Set(state.testCases[bridgeId].map((tc) => tc?._id));
        const deduped = data.filter((tc) => tc && !existingIds.has(tc._id));
        state.testCases[bridgeId] = state.testCases[bridgeId].concat(deduped);
      } else {
        state.testCases[bridgeId] = data;
      }
    },
    deleteTestCaseReducer: (state, action) => {
      const { testCaseId, bridgeId } = action.payload;
      if (state.testCases[bridgeId]) {
        state.testCases[bridgeId] = state.testCases[bridgeId].filter((testCase) => testCase._id !== testCaseId);
      }
      return state;
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
            testCase.version_history[versionId].push(testcases_result[testCaseId]?.result);
          }
        });
      }
      return state;
    },

    // ---------- RTLayer-driven test run lifecycle ----------
    testRunStartedReducer: (state, action) => {
      const { bridgeId, total = 0, versionIds = [], testcaseId = null } = action.payload || {};
      if (!bridgeId) return;
      state.testRuns[bridgeId] = {
        status: "running",
        total: Number(total) || 0,
        completed: 0,
        versionIds: Array.isArray(versionIds) ? versionIds : [versionIds].filter(Boolean),
        testcaseId,
        error: null,
        seen: {},
      };
    },
    testRunResultReducer: (state, action) => {
      const { bridgeId, versionId, result } = action.payload || {};
      if (!bridgeId || !versionId || !result?.testcase_id) return;
      const run = state.testRuns[bridgeId];
      const seenKey = `${versionId}:${result.testcase_id}`;
      if (run?.seen?.[seenKey]) return; // dedup
      applyResultToTestCase(state, bridgeId, versionId, result);
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
      // Apply any straggler results from final payload (skipped/cached testcases live here).
      const run = state.testRuns[bridgeId];
      const resultsByVersion = payload?.results_by_version || payload?.results || payload?.version_results || null;
      if (resultsByVersion && typeof resultsByVersion === "object" && !Array.isArray(resultsByVersion)) {
        Object.entries(resultsByVersion).forEach(([versionId, results]) => {
          if (!Array.isArray(results)) return;
          results.forEach((result) => {
            if (!result?.testcase_id) return;
            const seenKey = `${versionId}:${result.testcase_id}`;
            if (run?.seen?.[seenKey]) return;
            const applied = applyResultToTestCase(state, bridgeId, versionId, result);
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
