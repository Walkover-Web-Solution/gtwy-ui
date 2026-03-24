import { PROMPT_SECTIONS } from "./enums";

// Check if a prompt is a structured object with role/goal/instruction keys
// Accepts both plain objects and JSON strings
export const isValidJsonPrompt = (prompt) => {
  if (!prompt) return false;

  // Direct object check
  if (typeof prompt === "object" && !Array.isArray(prompt)) {
    return PROMPT_SECTIONS.ROLE in prompt || PROMPT_SECTIONS.GOAL in prompt || PROMPT_SECTIONS.INSTRUCTION in prompt;
  }

  // JSON string fallback (legacy data)
  if (typeof prompt === "string") {
    try {
      const parsed = JSON.parse(prompt);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return false;
      return PROMPT_SECTIONS.ROLE in parsed || PROMPT_SECTIONS.GOAL in parsed || PROMPT_SECTIONS.INSTRUCTION in parsed;
    } catch {
      return false;
    }
  }

  return false;
};

// Parse a JSON prompt string into a structured object { role, goal, instruction }
export const parsePromptObject = (prompt) => {
  if (!prompt) return { role: "", goal: "", instruction: "" };

  if (typeof prompt === "object" && prompt !== null) {
    return {
      role: prompt[PROMPT_SECTIONS.ROLE] || "",
      goal: prompt[PROMPT_SECTIONS.GOAL] || "",
      instruction: prompt[PROMPT_SECTIONS.INSTRUCTION] || "",
    };
  }

  if (typeof prompt === "string") {
    try {
      const parsed = JSON.parse(prompt);
      return {
        role: parsed[PROMPT_SECTIONS.ROLE] || "",
        goal: parsed[PROMPT_SECTIONS.GOAL] || "",
        instruction: parsed[PROMPT_SECTIONS.INSTRUCTION] || "",
      };
    } catch {
      return { role: "", goal: "", instruction: "" };
    }
  }

  return { role: "", goal: "", instruction: "" };
};

// Convert a structured prompt object to a plain string for DB storage
// Format: "Role: ...\n\nGoal: ...\n\nInstruction: ..."
// If already a string, return as-is
export const promptObjectToString = (prompt) => {
  if (!prompt) return "";

  if (typeof prompt === "string") return prompt;

  if (typeof prompt === "object" && prompt !== null) {
    const parts = [];
    if (prompt[PROMPT_SECTIONS.ROLE]) parts.push(`Role: ${prompt[PROMPT_SECTIONS.ROLE]}`);
    if (prompt[PROMPT_SECTIONS.GOAL]) parts.push(`Goal: ${prompt[PROMPT_SECTIONS.GOAL]}`);
    if (prompt[PROMPT_SECTIONS.INSTRUCTION]) parts.push(prompt[PROMPT_SECTIONS.INSTRUCTION]);
    return parts.join("\n\n");
  }

  return String(prompt);
};

// Preprocess content into granular fields so it can be compared consistently.
export const preprocessPrompt = (content) => {
  if (!content) return {};
  let obj = content;
  if (typeof content === "string") {
    try {
      obj = JSON.parse(content);
    } catch {
      return { instruction: content };
    }
  }
  return obj;
};

// Extract {{variable}} names from a prompt (string or object)
export const extractVariablesFromPrompt = (prompt) => {
  if (!prompt) return [];

  let text = "";
  if (typeof prompt === "string") {
    text = prompt;
  } else if (typeof prompt === "object" && prompt !== null) {
    text = [
      prompt[PROMPT_SECTIONS.ROLE] || "",
      prompt[PROMPT_SECTIONS.GOAL] || "",
      prompt[PROMPT_SECTIONS.INSTRUCTION] || "",
    ].join(" ");
  }

  const matches = text.matchAll(/\{\{([^}]+)\}\}/g);
  const variables = [];
  for (const match of matches) {
    if (match[1]) variables.push(match[1].trim());
  }
  return [...new Set(variables)];
};
