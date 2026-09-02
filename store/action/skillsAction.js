import { toast } from "react-toastify";
import {
  createSkill as createSkillApi,
  getSkillsForOrg as getSkillsForOrgApi,
  getSkillById as getSkillByIdApi,
  updateSkill as updateSkillApi,
  deleteSkill as deleteSkillApi,
} from "@/config/skillsApi";
import {
  isPending,
  isError,
  fetchAllSkillsReducer,
  createSkillReducer,
  updateSkillReducer,
  deleteSkillReducer,
} from "@/store/reducer/bridgeReducer";

/**
 * Fetch all skills for an organization
 */
export const getAllSkills = (orgId) => async (dispatch) => {
  try {
    dispatch(isPending());
    const response = await getSkillsForOrgApi(orgId);
    const skillsArray = response?.data || [];

    // Convert array to object keyed by _id for easier lookup (same as functions)
    const skillsObject = skillsArray.reduce((obj, item) => {
      obj[item._id] = item;
      return obj;
    }, {});

    dispatch(fetchAllSkillsReducer({ orgId, skillsData: skillsObject }));
  } catch (error) {
    dispatch(isError());
    console.error("Error fetching skills:", error);
  }
};

/**
 * Create a new skill
 */
export const createSkillAction = (dataToSend) => async (dispatch) => {
  try {
    const response = await createSkillApi(dataToSend);
    const newSkill = response?.data || response;

    dispatch(
      createSkillReducer({
        orgId: dataToSend.org_id,
        skill: newSkill,
      })
    );

    toast.success("Skill created successfully");
    return { success: true, data: newSkill };
  } catch (error) {
    dispatch(isError());
    console.error("Error creating skill:", error);
    // Toast already shown in API
    return { success: false, error };
  }
};

/**
 * Update an existing skill
 */
export const updateSkillAction =
  ({ skillId, orgId, dataToSend }) =>
  async (dispatch) => {
    try {
      const response = await updateSkillApi(skillId, dataToSend);
      const updatedSkill = response?.data || response;

      dispatch(
        updateSkillReducer({
          orgId,
          skill: updatedSkill,
        })
      );

      toast.success("Skill updated successfully");
      return { success: true, data: updatedSkill };
    } catch (error) {
      dispatch(isError());
      console.error("Error updating skill:", error);
      // Toast already shown in API
      return { success: false, error };
    }
  };

/**
 * Delete a skill
 */
export const deleteSkillAction =
  ({ skillId, orgId }) =>
  async (dispatch) => {
    try {
      await deleteSkillApi(skillId);

      dispatch(
        deleteSkillReducer({
          orgId,
          skillId,
        })
      );

      toast.success("Skill deleted successfully");
      return { success: true };
    } catch (error) {
      dispatch(isError());
      console.error("Error deleting skill:", error);
      // Toast already shown in API
      return { success: false, error };
    }
  };

/**
 * Get a single skill by ID (for viewing full content)
 */
export const getSkillByIdAction = (skillId) => async (dispatch) => {
  try {
    const response = await getSkillByIdApi(skillId);
    return { success: true, data: response?.data || response };
  } catch (error) {
    console.error("Error fetching skill:", error);
    return { success: false, error };
  }
};
