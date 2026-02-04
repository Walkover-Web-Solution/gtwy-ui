import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;

// Metrics and Analytics APIs
// export const getMetricsData = async (org_id, startDate, endDate) => {
//   try {
//     const response = await axios.get(`${URL}/api/v1/metrics/${org_id}`, {
//       params: {
//         startTime: startDate,
//         endTime: endDate
//       }
//     });
//     return response.data;
//   } catch (error) {
//     console.error(error);
//     return error;
//   }
// }

export const getMetricsDataApi = async ({
  apikey_id,
  service,
  model,
  thread_id,
  bridge_id,
  version_id,
  range,
  factor,
  start_date,
  end_date,
}) => {
  try {
    const response = await axios.post(`${URL}/api/metrics`, {
      apikey_id,
      service,
      model,
      thread_id,
      bridge_id,
      version_id,
      range,
      factor,
      start_date,
      end_date,
    });
    return response.data?.data || [];
  } catch (error) {
    console.error(error);
    return error;
  }
};

// User Feedback and Analytics APIs
export const userFeedbackCount = async ({ bridge_id, user_feedback }) => {
  try {
    const response = await axios.get(`${URL}/api/v1/agentConfig/userfeedbackcount/${bridge_id}`, {
      params: {
        user_feedback
      }
    });
    return response
  } catch (error) {
    console.error(error);
    return error
  }
}

// Fine-tuning Data APIs
export const downloadFineTuneData = async (bridge_id, threadIds, status = [0]) => {
  const response = await axios.post(`${URL}/api/v1/config/getFineTuneData/${bridge_id}`, {
    thread_ids: threadIds,
    user_feedback: status,
  });
  return response?.data;
};
