import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;

// Get all rich UI templates
export const getRichUiTemplates = async () => {
  return await axios.get(`${URL}/api/rich_ui_templates/`);
};

export const deleteRichUiTemplate = async (templateId) => {
  const response = await axios.delete(`${URL}/api/rich_ui_templates/${templateId}`);
  return response?.data;
};
