import { BuildingIcon, CheckCircleIcon, LinkIcon } from "@/components/Icons";
import AIMLIcon from "@/icons/AIMLIcon";
import AnthropicIcon from "@/icons/AnthropicIcon";
import CsvIcon from "@/icons/CsvIcon";
import FavIcon from "@/icons/FavIcon";
import GeminiIcon from "@/icons/GeminiIcon";
import GoogleDocIcon from "@/icons/GoogleDocIcon";
import Grok from "@/icons/Grok";
import GroqIcon from "@/icons/GroqIcon";
import MistralIcon from "@/icons/MistralIcon";
import OpenAiIcon from "@/icons/OpenAiIcon";
import OpenRouter from "@/icons/OpenRouter";
import { PdfIcon } from "@/icons/pdfIcon";
import { WebSearchIcon } from "@/icons/webSearchIcon";
import FavIconSVG from "@/public/favicon";
import { cloneDeep } from "lodash";
import { Image } from "lucide-react";

export const updatedData = (obj1, obj2 = {}, type) => {
  // Deep clone obj1 to avoid mutating the original object

  const updatedObj1 = JSON.parse(JSON.stringify(obj1));

  // Iterate over the keys of obj2.configuration
  for (const key in obj2?.configuration) {
    if (obj2.configuration.hasOwnProperty(key)) {
      // Delete the key from updatedObj1.configuration
      delete updatedObj1.configuration[key];
    }
  }
  if (type === "chat") {
    const inputconfig = updateContent(obj2.inputConfig, updatedObj1.configuration);
    obj1.inputConfig = inputconfig;
  }
  if (type === "completion") {
    obj1.inputConfig = {
      prompt: {
        prompt: updatedObj1.configuration.prompt || "",
        contentKey: "prompt",
        type: "text",
      },
    };
  }
  if (type === "embedding") {
    obj1.inputConfig = {
      input: {
        input: updatedObj1.configuration.input || "",
        contentKey: "input",
        type: "text",
      },
    };
  }

  const newObj1 = removeDuplicateFields(obj1.configuration, updatedObj1.configuration);
  obj1.configuration = newObj1;

  return obj1;
};

const updateContent = (obj2, updatedObj1) => {
  try {
    // Deep clone obj2
    const obj3 = cloneDeep(obj2);

    // If prompt is not defined in updatedObj1, return obj2
    if (updatedObj1.prompt === undefined) return obj2;

    // Iterate through each item in updatedObj1.prompt
    updatedObj1.prompt.forEach((item) => {
      const { role, content } = item;

      // Check if obj3[role].default exists and update its content
      if (obj3[role]?.default) {
        obj3[role].default.content += `${content}`;
      }
    });

    return obj3;
  } catch (error) {
    console.error(error);
    return obj2; // Return original object in case of error
  }
};

export const focusDialogWhenOpen = (dialogId, onOpen, delay = 50) => {
  if (typeof window === "undefined") return () => {};

  const modal = document.getElementById(dialogId);

  const handleOpen = () => {
    if (modal?.hasAttribute?.("open")) {
      onOpen?.();
    }
  };

  const timer = setTimeout(handleOpen, delay);
  const observer = modal ? new MutationObserver(() => handleOpen()) : null;

  if (observer) {
    observer.observe(modal, { attributes: true, attributeFilter: ["open"] });
  }

  return () => {
    clearTimeout(timer);
    observer?.disconnect();
  };
};

function removeDuplicateFields(obj1, updatedObj1) {
  const updatedObj1Keys = Object.keys(updatedObj1);

  updatedObj1Keys.forEach((key) => {
    if (obj1.hasOwnProperty(key)) {
      delete obj1[key];
    }
  });

  return obj1;
}

export const handleResponseFormat = (obj1) => {
  let responseObj = {};
  if (obj1.configuration.RTLayer === true) {
    responseObj = {
      RTLayer: obj1.configuration.RTLayer,
    };
    return responseObj;
  }
  if (obj1.configuration.webhook || obj1.configuration.headers) {
    responseObj = {
      webhook: obj1.configuration.webhook,
      headers: obj1.configuration.headers,
    };
    return responseObj;
  }
  return responseObj;
};

export const isValidJson = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return true; // Return true if JSON parses without error
  } catch {
    return false; // Return false if an error is thrown
  }
};

export const toggleSidebar = (sidebarId, direction = "left") => {
  const sidebar = document.getElementById(sidebarId);
  if (!sidebar) return;

  const translateClass = direction === "left" ? "-translate-x-full" : "translate-x-full";

  // Helper to check if slider is visible
  const isSliderVisible = (el) => !el.classList.contains(translateClass);

  // Helper to clean up event listeners
  const cleanupListeners = () => {
    document.removeEventListener("click", handleOutsideClick, true);
    document.removeEventListener("keyup", handleEscKey, true);
  };

  // Function to close the sidebar
  const closeSidebar = () => {
    const sidebarEl = document.getElementById(sidebarId);
    if (!sidebarEl) return;

    sidebarEl.classList.add(translateClass);
    cleanupListeners();
    sidebarEl._clickHandler = null;
    sidebarEl._keyHandler = null;
  };

  // Helper to check for unsaved changes and handle closing
  const handleClosing = (sidebarEl) => {
    const hasUnsavedChanges = sidebarEl.getAttribute("data-unsaved-changes") === "true";

    if (hasUnsavedChanges) {
      const modalId = sidebarEl.getAttribute("data-confirmation-modal") || MODAL_TYPE.UNSAVED_CHANGES_MODAL;
      openModal(modalId);
    } else {
      closeSidebar();
    }
  };

  // Click outside handler
  const handleOutsideClick = (event) => {
    const sidebarEl = document.getElementById(sidebarId);
    if (!sidebarEl || !isSliderVisible(sidebarEl)) return;

    // Check if click is inside the sidebar
    let isInsideSidebar = false;
    if (typeof event.composedPath === "function") {
      isInsideSidebar = event.composedPath().includes(sidebarEl);
    } else {
      isInsideSidebar = sidebarEl.contains(event.target);
    }

    // Skip clicks on buttons
    const isButton = event.target.tagName?.toLowerCase() === "button" || event.target.closest("button") !== null;

    // Process only outside clicks that aren't on buttons
    if (!isInsideSidebar && !isButton) {
      handleClosing(sidebarEl);
    }
  };

  // Escape key handler
  const handleEscKey = (event) => {
    if (event.key !== "Escape") return;

    const sidebarEl = document.getElementById(sidebarId);
    if (!sidebarEl || !isSliderVisible(sidebarEl)) return;

    handleClosing(sidebarEl);
  };

  // Clean up any existing listeners
  if (sidebar._clickHandler) document.removeEventListener("click", sidebar._clickHandler, true);
  if (sidebar._keyHandler) document.removeEventListener("keyup", sidebar._keyHandler, true);

  // Store handler references
  sidebar._clickHandler = handleOutsideClick;
  sidebar._keyHandler = handleEscKey;

  // Toggle sidebar visibility
  sidebar.classList.toggle(translateClass);

  // Add or remove listeners based on visibility
  if (isSliderVisible(sidebar)) {
    document.addEventListener("click", handleOutsideClick, true);
    document.addEventListener("keyup", handleEscKey, true);
  } else {
    cleanupListeners();
  }
};

export const getIconOfService = (service, height, width) => {
  switch (service) {
    case "openai":
      return <OpenAiIcon height={height} width={width} />;
    case "anthropic":
      return <AnthropicIcon height={height} width={width} />;
    case "groq":
      return <GroqIcon height={height} width={width} />;
    case "google":
      return <GeminiIcon height={height} width={width} />;
    case "open_router":
      return <OpenRouter height={height} width={width} />;
    case "gemini":
      return <GeminiIcon height={height} width={width} />;
    case "ai_ml":
      return <AIMLIcon height={height} width={width} />;
    case "mistral":
      return <MistralIcon height={height} width={width} />;
    case "grok":
      return <Grok height={height} width={width} />;
    default:
      return <OpenAiIcon height={height} width={width} />;
  }
};

export function getStatusClass(status) {
  switch (status?.toString().trim().toLowerCase()) {
    case "drafted":
      return "bg-yellow-100";
    case "paused":
      return "bg-red-100";
    case "1":
      return "bg-green-100";
    case "active":
      return "bg-green-100";
    case "published":
      return "bg-green-100";
    case "rejected":
      return "bg-gray-100";
    // Add more cases as needed
    default:
      return "bg-gray-100";
  }
}

export const validateUrl = (url) => {
  const pattern = new RegExp(
    "^https?:\\/\\/" + // Protocol is mandatory
      "(localhost|" + // Allows "localhost" as a valid domain
      "((\\d{1,3}\\.){3}\\d{1,3})|" + // Allows IPv4 addresses
      "(([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.?)+" + // Subdomains
      "[a-zA-Z]{2,})" + // TLD is mandatory except for localhost or IP
      "(\\:\\d{1,5})?" + // Optional port (restricting port number between 1 and 65535)
      "(\\/[\\w\\d%_.~+\\-]*)*" + // Optional path corrected to allow a more accurate set of characters
      "(\\?[;&a-zA-Z\\d%_.~+=\\-]*)?" + // Optional query (more accurate character set)
      "(\\#[\\w\\d\\-]*)?$",
    "i"
  ); // Optional fragment
  return pattern.test(url);
};

export function flattenParameters(parameters, prefix = "") {
  let flat = [];
  Object.entries(parameters || {}).forEach(([key, value]) => {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    flat.push({
      key: currentKey,
      type: value?.type,
      description: value?.description,
      enum: value.enum,
      required_params: value?.required_params,
      parameter: value?.parameter,
      items: value?.items,
    });
    if (Object?.keys(value?.parameter || value?.items || {})?.length > 0) {
      flat = flat?.concat(flattenParameters(value?.parameter || value?.items?.properties || {}, currentKey));
    }
  });
  return flat;
}

export function filterBridges(bridgesList, bridgeSearchQuery) {
  return bridgesList.filter(
    (item) =>
      item?.name?.toLowerCase()?.includes(bridgeSearchQuery.toLowerCase()) ||
      item?.slugName?.toLowerCase()?.includes(bridgeSearchQuery.toLowerCase()) ||
      item?.service?.toLowerCase()?.includes(bridgeSearchQuery.toLowerCase()) ||
      item?._id?.toLowerCase()?.includes(bridgeSearchQuery.toLowerCase())
  );
}

export function filterOrganizations(orgList, orgSearchQuery) {
  return Object.values(orgList).filter(
    (item) =>
      item?.name?.toLowerCase()?.includes(orgSearchQuery?.toLowerCase().trim()) ||
      item?.id?.toString()?.toLowerCase()?.includes(orgSearchQuery?.toLowerCase().trim())
  );
}

export function openModal(modalName) {
  const modalElement = document.getElementById(modalName);
  if (modalElement) {
    modalElement.showModal();
  } else {
    console.error(`Modal with name ${modalName} not found`);
  }
}

export function closeModal(modalName) {
  const modalElement = document.getElementById(modalName);
  if (modalElement) {
    modalElement.close();
  } else {
    console.error(`Modal with name ${modalName} not found`);
  }
}

export const allowedAttributes = {
  important: [
    ["variables", "Variables"],
    ["system Prompt", "System Prompt"],
    ["AiConfig", "AI Configuration"],
    ["latency", "Latency"],
  ],
  optional: [
    ["message_id", "Message ID"],
    ["tokens", "Tokens"],
    ["createdAt", "Created At"],
    ["service", "Service"],
    ["model", "Model"],
    ["version_id", "Version ID"],
  ],
};

export const GetFileTypeIcon = (fileType, height, width) => {
  switch (fileType) {
    case "pdf":
      return <PdfIcon height={height} width={width} />;
    case "csv":
      return <CsvIcon height={height} width={width} />;
    case "url":
      return <LinkIcon height={height} width={width} />;
    default:
      return <GoogleDocIcon height={height} width={width} />;
  }
};
export const GetPreBuiltToolTypeIcon = (preBuiltTools, height, width) => {
  switch (preBuiltTools) {
    case "web_search":
      return <WebSearchIcon height={height} width={width} />;
    case "image_generation":
      return <Image height={height} width={width} alt="image generation icon" />;
    case "Gtwy_Web_Search":
      return <FavIconSVG height={24} width={24} />;
    default:
      return null;
  }
};

export const updateTitle = (newTitle) => {
  if (typeof document !== "undefined" && newTitle) {
    document.title = newTitle;
    document.title = newTitle;
  }
};

export const simulateStreaming = (text, setStreamed, setIsStreaming, callback) => {
  setIsStreaming(true);
  setStreamed("");

  let currentIndex = 0;
  const streamInterval = setInterval(() => {
    if (currentIndex < text?.length) {
      // Process multiple characters at once
      const chunk = text?.slice(currentIndex, currentIndex + 5); // Process 5 chars at a time
      setStreamed((prev) => prev + chunk);
      currentIndex += 5;
    } else {
      clearInterval(streamInterval);
      setIsStreaming(false);
      // Set final text to ensure we didn't miss any characters
      setStreamed(text);
      callback();
    }
  }, 5); // Reduced interval to 5ms
};

export const createDiff = (oldText, newText) => {
  const oldLines = oldText?.split("\n");
  const newLines = newText?.split("\n");
  const maxLines = Math.max(oldLines?.length, newLines?.length);

  const diffLines = [];

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || "";
    const newLine = newLines[i] || "";

    if (oldLine === newLine) {
      diffLines?.push({
        type: "equal",
        oldLine,
        newLine,
        lineNumber: i + 1,
      });
    } else if (!oldLine) {
      diffLines?.push({
        type: "added",
        oldLine: "",
        newLine,
        lineNumber: i + 1,
      });
    } else if (!newLine) {
      diffLines?.push({
        type: "deleted",
        oldLine,
        newLine: "",
        lineNumber: i + 1,
      });
    } else {
      diffLines?.push({
        type: "modified",
        oldLine,
        newLine,
        lineNumber: i + 1,
      });
    }
  }

  return diffLines;
};

export const transformAgentVariableToToolCallFormat = (inputData) => {
  const fields = {};
  const required_params = [];

  function setNestedValue(obj, path, value, isRequired) {
    const parts = path.split(".");
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];

      if (!current[part]) {
        current[part] = {
          type: "object",
          description: "",
          enum: [],
          required_params: [],
          parameter: {},
        };
      } else if (!current[part].parameter) {
        current[part].parameter = {};
      }

      current = current[part].parameter;
    }

    const finalKey = parts[parts.length - 1];

    let paramType = "string";
    if (finalKey.toLowerCase().includes("number") || finalKey.toLowerCase().includes("num")) {
      paramType = "number";
    } else if (finalKey.toLowerCase().includes("bool") || finalKey.toLowerCase().includes("flag")) {
      paramType = "boolean";
    }

    current[finalKey] = {
      type: paramType,
      description: "",
      enum: [],
      required_params: [],
    };

    if (isRequired) {
      for (let i = 0; i < parts.length - 1; i++) {
        let currentLevel = obj;
        for (let j = 0; j < i; j++) {
          currentLevel = currentLevel[parts[j]].parameter;
        }

        const parentKey = parts[i];
        const childKey = parts[i + 1];

        if (!currentLevel[parentKey].required_params.includes(childKey)) {
          currentLevel[parentKey].required_params.push(childKey);
        }
      }

      // Add top-level key to required_params
      if (!required_params.includes(parts[0])) {
        required_params.push(parts[0]);
      }
    }
  }

  for (const [key, value] of Object.entries(inputData)) {
    const isRequired = value === "required";

    if (key.includes(".")) {
      setNestedValue(fields, key, value, isRequired);
    } else {
      let paramType = "string";
      if (key.toLowerCase().includes("number") || key.toLowerCase().includes("num")) {
        paramType = "number";
      } else if (key.toLowerCase().includes("bool") || key.toLowerCase().includes("flag")) {
        paramType = "boolean";
      }

      fields[key] = {
        type: paramType,
        description: "",
        enum: [],
        required_params: [],
      };

      if (isRequired && !required_params.includes(key)) {
        required_params.push(key);
      }
    }
  }

  return { fields, required_params };
};

export function toBoolean(str) {
  return str === "true" || str === true;
}

export const renderedOrganizations = (organizations, formState, handleSelectOrg) => {
  const filteredOrgs = filterOrganizations(organizations, formState.searchQuery);

  return filteredOrgs?.map((org, index) => (
    <div
      key={org.id || index}
      onClick={() => handleSelectOrg(org.id, org.name)}
      className={`card bg-base-100 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${
        formState.selectedOrg?.id === org.id
          ? "border-primary bg-primary/5"
          : "border-transparent hover:border-base-300"
      }`}
    >
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              formState.selectedOrg?.id === org.id ? "bg-primary text-primary-content" : "bg-base-200"
            }`}
          >
            <BuildingIcon size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base-content">{org.name}</h3>
            <p className="text-sm text-base-content/70">ID: {org.id}</p>
          </div>
          {formState.selectedOrg?.id === org.id && <CheckCircleIcon className="text-primary" size={20} />}
        </div>
      </div>
    </div>
  ));
};

export function generateRandomID(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const RequiredItem = () => <span className="text-error text-lg">*</span>;

export const sendDataToParent = (status, data, message) => {
  if (window.parent) {
    window.parent.postMessage(
      {
        type: "gtwy",
        status: status,
        data: data,
        message: message,
      },
      "*"
    );
  }
};

function splitFromFirstEqual(str) {
  // Handle empty string or string without an equal sign gracefully
  if (!str || str.indexOf("=") === -1) {
    return [str, ""]; // Return the original string as both parts
  }

  // Find the index of the first equal sign
  const index = str.indexOf("=");

  // Handle cases where the equal sign is at the beginning or end of the string
  if (index === 0) {
    return ["", str.slice(1)]; // Empty key, value is the rest of the string
  }
  if (index === str.length - 1) {
    return [str.slice(0, -1), ""]; // Key is the entire string except the last character (equal sign)
  }

  // Split the string into key and value parts
  const key = str.slice(0, index);
  const value = str.slice(index + 1);

  return [key, value];
}

function getDomain() {
  const hostname = window.location.hostname;
  const parts = hostname?.split(".");
  if (parts.length >= 2) {
    parts.shift(); // Remove the subdomain part
    return `.${parts.join(".")}`;
  }
  return hostname;
}

export const getSubdomain = () => {
  return window.location.hostname;
};

const getEnvPrefix = () => {
  return process.env.NEXT_PUBLIC_ENV ? `${process.env.NEXT_PUBLIC_ENV}_env_` : "";
};

const getCookieKey = (key) => {
  const envPrefix = getEnvPrefix();
  return `${envPrefix}${key}`;
};

export const setInCookies = (key, value) => {
  const domain = getDomain();
  const date = new Date();
  date.setTime(date.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days
  const expires = `; expires=${date.toUTCString()}`;
  const fullKey = getCookieKey(key);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${fullKey}=${value || ""}${expires}; domain=${domain}; path=/;${secure}`;
};

export const getFromCookies = (key) => {
  const fullKey = getCookieKey(key);
  const cookies = document.cookie?.split(";").map((cookie) => cookie.trim());

  for (let i = 0; i < cookies.length; i++) {
    const [cookieKey, value] = splitFromFirstEqual(cookies[i]);
    if (fullKey === cookieKey) {
      return value;
    }
  }

  return null;
};

export const removeCookie = (key) => {
  const domain = getDomain();
  const fullKey = getCookieKey(key);

  document.cookie = `${fullKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
};

export const clearCookie = () => {
  const domain = getDomain();
  const envPrefix = getEnvPrefix();
  const cookies = document.cookie?.split(";").map((cookie) => cookie.trim());

  for (let i = 0; i < cookies.length; i++) {
    const [key] = splitFromFirstEqual(cookies[i]);
    if (key.startsWith(envPrefix)) {
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
    }
  }
};

/**
 * Mark that the current tab is initiating an agent update
 * Call this BEFORE making your API call
 */
export function markUpdateInitiatedByCurrentTab(agentId) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem("initiated_update_" + agentId, "true");
    const timestamp = new Date().getTime();
    let agentIds = JSON.parse(sessionStorage.getItem("last_initiated_update") || "[]");
    if (agentIds === null) {
      agentIds = [];
    }
    agentIds.push({ id: String(agentId), timestamp });
    sessionStorage.setItem("last_initiated_update", JSON.stringify(agentIds));
  } catch (error) {
    console.error("Error marking update initiation:", error);
  }
}
const normalizeToUTC = (dateString) => {
  if (!dateString) return null;

  // Case 1: Already valid ISO with Z (UTC)
  if (dateString.includes("T") && dateString.endsWith("Z")) {
    return dateString;
  }

  // Case 2: ISO without Z → treat as UTC, add Z
  if (dateString.includes("T") && !dateString.endsWith("Z")) {
    return dateString + "Z";
  }

  // Case 3: Space format "YYYY-MM-DD HH:MM:SS"
  if (dateString.includes(" ")) {
    return dateString.replace(" ", "T") + "Z";
  }

  // Fallback
  return null;
};

/**
 * Check if the current tab initiated a specific agent update
 */
export function didCurrentTabInitiateUpdate(agentId) {
  if (typeof window === "undefined") return false;

  try {
    const lastInitiated = sessionStorage.getItem("last_initiated_update");
    if (!lastInitiated) return false;

    const agentIds = JSON.parse(lastInitiated);
    const now = Date.now();
    const timeWindow = 5000; // 5 seconds window for multiple events

    // Check if this agent was recently updated by current tab and within time window
    if (agentIds.some((agent) => agent.id === String(agentId) && now - agent.timestamp < timeWindow)) {
      return true;
    }

    // Clean up expired entries
    if (now - agentIds[agentIds.length - 1].timestamp >= timeWindow) {
      sessionStorage.removeItem("last_initiated_update");
      agentIds.forEach((agent) => {
        sessionStorage.removeItem("initiated_update_" + agent.id);
      });
    }

    return false;
  } catch (error) {
    console.error("Error checking update initiation:", error);
    return false;
  }
}
export const createConversationForTestCase = (conversationData) => {
  let conversation = [];
  let expected_response = null;

  const conversationMessages = conversationData.slice(0, conversationData.length - 1);

  conversation = conversationMessages.map((message) => ({
    role: message.sender === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  const lastMessage = conversationData[conversationData.length - 1];
  expected_response = {
    response: lastMessage.content,
  };

  return { conversation, expected: expected_response };
};

export const generateKeyValuePairs = (obj) => {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = value; // Keep exact string value
    } else if (typeof value === "number") {
      result[key] = value; // Keep exact number value
    } else if (typeof value === "boolean") {
      result[key] = value; // Keep exact boolean value
    } else if (Array.isArray(value)) {
      result[key] = value; // Keep exact array with all elements
    } else if (typeof value === "object" && value !== null) {
      result[key] = value; // Keep exact object with all properties
    } else {
      result[key] = value; // Keep any other value as-is
    }
  }

  return result;
};

export const formatRelativeTime = (dateString) => {
  const normalized = normalizeToUTC(dateString);
  if (!normalized) return "No records found";

  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "No records found";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;

  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

export const formatDate = (dateString) => {
  const normalized = normalizeToUTC(dateString);
  if (!normalized) return "No records found";

  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "No records found";

  return new Intl.DateTimeFormat("en-IN", {
    year: "2-digit",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(date);
};

/**
 * Reusable outside click handler utility
 * @param {React.RefObject} elementRef - Ref to the element that should not trigger close
 * @param {React.RefObject} triggerRef - Ref to the trigger element that should not trigger close
 * @param {Function} onOutsideClick - Callback function to execute on outside click
 * @param {boolean} isActive - Whether the outside click handler should be active
 */
export const useOutsideClick = (elementRef, triggerRef, onOutsideClick, isActive = true) => {
  const handleClickOutside = (event) => {
    if (!isActive) return;

    const isClickInsideElement = elementRef.current && elementRef.current.contains(event.target);
    const isClickInsideTrigger = triggerRef && triggerRef.current && triggerRef.current.contains(event.target);

    if (!isClickInsideElement && !isClickInsideTrigger) {
      onOutsideClick();
    }
  };

  const handleKeyDown = (event) => {
    if (isActive && event.key === "Escape") {
      onOutsideClick();
    }
  };

  const handleScroll = () => {
    if (isActive) {
      onOutsideClick();
    }
  };

  return { handleClickOutside, handleKeyDown, handleScroll };
};

export const extractPromptVariables = (prompt) => {
  if (!prompt) return [];
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = [];
  let match;
  while ((match = variableRegex.exec(prompt)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
};
