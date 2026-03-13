import axios from "axios";

// Get all templates
export const getTemplates = async () => {
  return await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/Template`);
};
