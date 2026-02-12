import axios from "axios";

// Get all rich UI templates
export const getRichUiTemplates = async () => {
  return await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/rich_ui_templates/`);
};
