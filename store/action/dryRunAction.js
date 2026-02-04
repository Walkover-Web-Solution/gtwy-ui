import axios from "axios";

export const dryRunAction = () => async (dispatch, getState) => {
  try {
    const dataToSend = {
      configuration: {
        model: "gpt-3.5-turbo",
        temperature: 1,
        prompt: [{ system: "hey" }],
        type: "chat",
        user: [{ role: "user", content: "hello" }],
      },

      org_id: "124dfgh67ghj",
    };
    const data = await axios.post(`http://localhost:7072/api/v1/model/playground/chat/completion`, dataToSend);
    dispatch(dryRun(data.data));
  } catch (error) {
    console.error(error);
  }
};
