import axios from "@/utils/interceptor";
import { setInCookies } from "@/utils/utility";
import { toast } from "react-toastify";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;
const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL;
const NEXT_PUBLIC_REFERENCEID = process.env.NEXT_PUBLIC_REFERENCEID;

// Organization Management APIs
export const createOrg = async (dataToSend) => {
  try {
    const data = await axios.post(`${PROXY_URL}/api/c/createCompany`, dataToSend);
    return data;
  } catch (error) {
    toast.error(error.response.data.message || "Failed to create new organization");
    return error;
  }
};

export const getAllOrg = async () => {
  try {
    const data = await axios.get(`${PROXY_URL}/api/c/getCompanies`);
    return data;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export const switchOrg = async (company_ref_id) => {
  try {
    const data = await axios.post(`${PROXY_URL}/api/c/switchCompany`, { company_ref_id });
    setInCookies("current_org_id", company_ref_id);
    return data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const updateOrganizationData = async (orgId, orgDetails) => {
  const updateObject = {
    company_id: orgId,
    company: orgDetails,
  };
  try {
    const response = await axios.put(`${URL}/api/user/updateDetails`, updateObject, {
      headers: {
        "reference-id": NEXT_PUBLIC_REFERENCEID,
      },
    });
    return response?.data;
  } catch (error) {
    toast.error("Error updating organization:", error);
  }
};

// User Invitation and Management APIs
export const inviteUser = async (email) => {
  try {
    const response = await axios.post(`${PROXY_URL}/api/c/addUser`, email);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const getInvitedUsers = async ({ page, limit, search }) => {
  try {
    const data = await axios.get(`${PROXY_URL}/api/c/getUsers?search=${search}`, {
      params: {
        pageNo: page,
        itemsPerPage: limit,
      },
    });
    return data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// Organization Token Management
export const generateAccessKey = async () => {
  try {
    const response = await axios.post(`${URL}/api/utils/token`, {
      type: "rag",
    });
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getUsers = async () => {
  try {
    const response = await axios.get(`${URL}/api/utils/users-details`);
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
