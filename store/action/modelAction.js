import { addNewModelReducer, deleteModelReducer, fetchModelReducer } from "../reducer/modelReducer";
import { addNewModel, deleteModel, getAllModels } from "@/config/index";

export const getModelAction =
  ({ service }) =>
  async (dispatch) => {
    try {
      const data = await getAllModels(service);
      dispatch(fetchModelReducer({ data: data, service }));
    } catch (error) {
      console.error(error);
    }
  };

export const addNewModelAction =
  ({ service, type, newModelObject }) =>
  async (dispatch) => {
    try {
      const data = await addNewModel(newModelObject);
      dispatch(addNewModelReducer({ service, type, modelData: data?.data?.result }));
      return data;
    } catch (error) {
      console.error(error, "error");
      throw error;
    }
  };
export const deleteModelAction = (dataToSend) => async (dispatch) => {
  try {
    const repsonse = await deleteModel(dataToSend);
    if (repsonse?.data?.success) dispatch(deleteModelReducer(dataToSend));
    return repsonse;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
