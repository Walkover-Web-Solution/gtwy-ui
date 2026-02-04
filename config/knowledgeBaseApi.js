import axios from "@/utils/interceptor";
import { toast } from "react-toastify";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;

// Knowledge Base Management APIs
export const createKnowledgeBaseEntry = async (data) => {
  try {
    const response = await axios.post(`${URL}/api/rag/`, data);
    return response?.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || "Failed to create knowledge base entry");
    console.error(error);
    return error;
  }
};

export const getAllKnowBaseData = async () => {
  try {
    const response = await axios.get(`${URL}/api/rag/resource`);
    return response?.data?.data?.resources;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const getKnowledgeBaseToken = async () => {
  try {
    const response = await axios.post(`${URL}/api/utils/token`, {
      type: "knowledge_base",
    });
    return response?.data?.result;
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const deleteKnowBaseData = async (data) => {
  try {
    const { id } = data;
    const response = await axios.delete(`${URL}/api/rag/docs/${id}`, {
      data: { id },
    });
    return response?.data;
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.message || "Failed to delete knowledge base entry");
    throw error;
  }
};

export const updateKnowledgeBaseEntry = async (data) => {
  try {
    const { data: dataToUpdate, id } = data?.data;
    const response = await axios.patch(`${URL}/api/rag/docs/${id}`, dataToUpdate);
    return response;
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.message || "Failed to update knowledge base entry");
    throw error;
  }
};

export const createResource = async (data) => {
  try {
    const response = await axios.post(`${URL}/api/rag/resource`, data);
    return response?.data;
  } catch (error) {
    console.error(error);
    toast.error(error?.response?.data?.message || "Failed to create resource");
    throw error;
  }
};

export const updateResource = async (id, data) => {
  try {
    const response = await axios.put(`${URL}/api/rag/resource/${id}`, data);
    return response?.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || "Failed to update resource");
    console.error(error);
    return error;
  }
};

export const deleteResource = async (id) => {
  try {
    const response = await axios.delete(`${URL}/api/rag/resource/${id}`);
    return response?.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || "Failed to delete resource");
    console.error(error);
    return error;
  }
};

export const getResourceChunks = async (resourceId) => {
  try {
    const response = await axios.get(`${URL}/api/rag/resource/${resourceId}/chunks`);
    return response?.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || "Failed to fetch resource chunks");
    console.error(error);
    throw error;
  }
};
