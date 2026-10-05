// TypeSafe (Jev) is a "System One" model, not a chat model: the user message is sent
// as the `state` and the questions to evaluate go in `configuration.questions`.
// Docs: https://docs.typesafe.ai/primitives

export const JEV_SERVICE = "typesafe";

export const JEV_QUESTION_TYPES = ["choice", "score", "noul"];

export const isJevService = (service) => service?.toLowerCase?.() === JEV_SERVICE;

export const JEV_EXAMPLE_QUESTIONS = {
  department: {
    type: "choice",
    instructions: "Which team should handle this",
    criteria: {
      billing: "Payment or subscription issues",
      technical: "Bugs or integration problems",
      sales: "Pricing or account questions",
    },
  },
  frustration: {
    type: "score",
    instructions: "How frustrated the customer appears",
    criteria: ["Calm, just stating facts", "Frustrated but civil", "Very angry, strong language"],
  },
  is_urgent: {
    type: "noul",
    instructions: "The message conveys urgency or time-sensitivity",
  },
};

// No apostrophes: the cURL snippet wraps the body in single quotes.
export const JEV_EXAMPLE_STATE =
  "Hi, I have been trying to connect my Stripe account for 3 days and the integration keeps failing. I am losing sales. Please help ASAP.";

export const JEV_EXAMPLE_ANSWERS = {
  department: {
    type: "choice",
    choice: "technical",
    confidence: 0.78,
    probabilities: { technical: 0.85, sales: 0.0, billing: 0.15 },
  },
  frustration: {
    type: "score",
    score: 1.0,
    confidence: 1.0,
    legend: { 0: "Calm, just stating facts", 1: "Frustrated but civil", 2: "Very angry, strong language" },
    probabilities: { 0: 0.0, 1: 1.0, 2: 0.0 },
  },
  is_urgent: { type: "noul", noul: 1.0 },
};

// Mirrors the checks in the Python TypeSafe handler so errors show before the request is sent.
export const parseJevQuestions = (text) => {
  if (!text || !text.trim()) {
    return { questions: null, error: "Add at least one question for Jev to answer." };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { questions: null, error: `Questions must be valid JSON: ${error.message}` };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).length === 0) {
    return { questions: null, error: 'Questions must be an object, e.g. { "is_urgent": { "type": "noul", ... } }.' };
  }
  for (const [key, question] of Object.entries(parsed)) {
    if (!question || typeof question !== "object" || !JEV_QUESTION_TYPES.includes(question.type)) {
      return { questions: null, error: `"${key}" needs a "type" of choice, score or noul.` };
    }
    if (!question.instructions || typeof question.instructions !== "string") {
      return { questions: null, error: `"${key}" needs "instructions".` };
    }
    if (
      question.type === "choice" &&
      (!question.criteria || typeof question.criteria !== "object" || Array.isArray(question.criteria))
    ) {
      return {
        questions: null,
        error: `"${key}" is a choice question: "criteria" must map each option to a description.`,
      };
    }
    if (question.type === "score" && (!Array.isArray(question.criteria) || question.criteria.length < 2)) {
      return { questions: null, error: `"${key}" is a score question: "criteria" must be an ordered list of levels.` };
    }
  }
  return { questions: parsed, error: null };
};

// Returns the answers map when `content` is a Jev response (the formatter sends it as a JSON string).
export const getJevAnswers = (content) => {
  let parsed = content;
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed.startsWith("{")) return null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const values = Object.values(parsed);
  if (values.length === 0) return null;
  const isAnswers = values.every(
    (answer) => answer && typeof answer === "object" && JEV_QUESTION_TYPES.includes(answer.type)
  );
  return isAnswers ? parsed : null;
};

// --- Form builder helpers -------------------------------------------------
// The playground edits questions as a list of items (so half-filled rows survive
// re-renders) and converts them to the `questions` map only when sending.

let itemCounter = 0;
const nextUid = () => `q_${Date.now().toString(36)}_${itemCounter++}`;

export const createJevItem = (type = "noul") => ({
  uid: nextUid(),
  id: "",
  // The answer key follows the question text until the user edits it by hand.
  keyEdited: false,
  type,
  instructions: "",
  options: [
    { key: "", description: "" },
    { key: "", description: "" },
  ],
  levels: ["", "", ""],
});

// "Is the customer angry?" -> "is_the_customer_angry"
export const toAnswerKey = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/, "");

export const questionsToItems = (questions) =>
  Object.entries(questions || {}).map(([id, question]) => {
    const item = createJevItem(question?.type);
    item.id = id;
    item.keyEdited = true;
    item.instructions = question?.instructions || "";
    if (question?.type === "choice" && question.criteria && typeof question.criteria === "object") {
      item.options = Object.entries(question.criteria).map(([key, description]) => ({
        key,
        description: String(description ?? ""),
      }));
    }
    if (question?.type === "score" && Array.isArray(question.criteria)) {
      item.levels = question.criteria.map((level) => String(level ?? ""));
    }
    return item;
  });

export const itemsToQuestions = (items) =>
  Object.fromEntries(
    items.map((item) => {
      const question = { type: item.type, instructions: item.instructions.trim() };
      if (item.type === "choice") {
        question.criteria = Object.fromEntries(
          item.options.filter((o) => o.key.trim()).map((o) => [o.key.trim(), o.description.trim()])
        );
      }
      if (item.type === "score") {
        question.criteria = item.levels.map((level) => level.trim()).filter(Boolean);
      }
      return [item.id.trim(), question];
    })
  );

// Returns { [uid]: message } for every invalid question, plus a summary `error`.
export const validateJevItems = (items) => {
  const errors = {};
  const seen = new Set();
  if (items.length === 0) return { errors, error: "Add at least one question for Jev to answer." };
  items.forEach((item) => {
    const id = item.id.trim();
    if (!item.instructions.trim()) errors[item.uid] = "Write the question for Jev.";
    else if (!id) errors[item.uid] = "Add an answer key.";
    else if (seen.has(id)) errors[item.uid] = `The answer key "${id}" is used by another question.`;
    else if (item.type === "choice") {
      const keys = item.options.map((o) => o.key.trim()).filter(Boolean);
      if (keys.length < 2) errors[item.uid] = "A choice needs at least two options.";
      else if (new Set(keys).size !== keys.length) errors[item.uid] = "Option names must be unique.";
    } else if (item.type === "score" && item.levels.filter((l) => l.trim()).length < 2) {
      errors[item.uid] = "A score needs at least two levels.";
    }
    seen.add(id);
  });
  const count = Object.keys(errors).length;
  return { errors, error: count ? `${count} question${count === 1 ? " needs" : "s need"} attention.` : null };
};
