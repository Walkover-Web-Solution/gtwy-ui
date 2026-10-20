import { getMetricsDataApi, downloadFineTuneData } from "@/config/metricsApi";

// Pass-through thunks: call the API and return its response unchanged (errors propagate to the caller).
export const getMetricsDataAction = (params) => async () => getMetricsDataApi(params);
export const downloadFineTuneDataAction = (bridge_id, threadIds, status) => async () =>
  downloadFineTuneData(bridge_id, threadIds, status);
