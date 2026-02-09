import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  testCases: {},
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
          // Update the test case with new data while preserving the _id
          state.testCases[bridgeId][index] = dataToUpdate;
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
  },
});

export const {
  createTestCaseReducer,
  getAllTestCasesReducer,
  deleteTestCaseReducer,
  runTestCaseReducer,
  updateTestCaseReducer,
} = testCasesReducer.actions;

export default testCasesReducer.reducer;
