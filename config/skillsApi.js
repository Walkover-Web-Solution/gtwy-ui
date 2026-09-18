import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;

// Skills Management APIs

// gtwy-node wraps payloads in success/message/data; normalise so actions can always read response.data.
const unwrap = (response) => ({ data: response?.data?.data ?? response?.data?.result ?? response?.data });

// Create a new skill
export const createSkill = async (dataToSend) => {
  try {
    const response = await axios.post(`${URL}/api/skills`, dataToSend);
    return unwrap(response);
  } catch (error) {
    console.error("Error creating skill:", error);
    throw error;
  }
};

// Get all skills for an organization
export const getSkillsForOrg = async (orgId) => {
  try {
    const response = await axios.get(`${URL}/api/skills?org_id=${orgId}`);
    return unwrap(response);
  } catch (error) {
    console.error("Error fetching skills:", error);
    throw error;
  }
};

// Get a specific skill with full content
export const getSkillById = async (skillId) => {
  try {
    const response = await axios.get(`${URL}/api/skills/${skillId}`);
    return unwrap(response);
  } catch (error) {
    console.error("Error fetching skill:", error);
    throw error;
  }
};

// Update a skill
export const updateSkill = async (skillId, dataToSend) => {
  try {
    const response = await axios.put(`${URL}/api/skills/${skillId}`, dataToSend);
    return unwrap(response);
  } catch (error) {
    console.error("Error updating skill:", error);
    throw error;
  }
};

// Delete a skill
export const deleteSkill = async (skillId) => {
  try {
    const response = await axios.delete(`${URL}/api/skills/${skillId}`);
    return unwrap(response);
  } catch (error) {
    console.error("Error deleting skill:", error);
    throw error;
  }
};
