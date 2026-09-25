import {
  BookOpen,
  MessageSquare,
  Building2,
  Shield,
  BarChart3,
  AlertTriangle,
  UserPlus,
  Bot,
  Blocks,
  FileSliders,
  MessageSquareMore,
  Settings2,
  MonitorPlayIcon,
  MessageCircleMoreIcon,
  MessageSquareMoreIcon,
  Cog,
  Code2,
  LayoutTemplate,
  Sparkles,
  Wrench,
  Key,
} from "lucide-react";
import { AddIcon, KeyIcon } from "@/components/Icons";
import GiftIcon from "@/icons/GiftIcon";
import React from "react";

export const ITEM_ICONS = {
  org: <Building2 size={15} />,
  agents: <Bot size={15} />,
  api: <Code2 size={15} />,
  chatbotConfig: <FileSliders size={15} />,
  chatbot: <MessageSquare size={15} />,
  pauthkey: <Shield size={15} />,
  apikeys: <Key size={15} />,
  alerts: <AlertTriangle size={15} />,
  invite: <UserPlus size={15} />,
  metrics: <BarChart3 size={15} />,
  knowledge_base: <BookOpen size={15} />,
  feedback: <MessageSquareMore size={15} />,
  RAG_embed: <Blocks size={15} />,
  integration: <Blocks size={15} />,
  // Admin section icons
  adminSettings: <Settings2 size={15} />,
  tutorial: <MonitorPlayIcon size={15} />,
  lifetimeAccess: <GiftIcon size={15} />,
  speakToUs: <MessageCircleMoreIcon size={15} />,
  feedbackAdmin: <MessageSquareMoreIcon size={15} />,
  // Settings menu icons
  workspace: <Settings2 size={15} />,
  userDetails: <Cog size={15} />,
  auth: <KeyIcon size={15} />,
  addModel: <AddIcon size={15} />,
  prebuiltPrompts: <Bot size={15} />,
  widgets: <LayoutTemplate size={15} />,
  "model-garden": <Sparkles size={15} />,
  tools: <Wrench size={15} />,
};

export const DISPLAY_NAMES = (key) => {
  switch (key) {
    case "api":
      return "API";
    case "chatbot":
      return "Chatbot";
    case "agents":
      return "Agents";
    case "knowledge_base":
      return "Knowledge base";
    case "chatbotConfig":
      return "Configure Chatbot";
    case "feedback":
      return "Feedback";
    case "tutorial":
      return "Tutorial";
    case "lifetimeAccess":
      return "Free Lifetime Access";
    case "speak-to-us":
      return "Speak to Us";
    case "integration":
      return "GTWY as Embed";
    case "settings":
      return "Settings";
    case "RAG_embed":
      return "RAG as Service";
    case "invite":
      return "Members";
    case "pauthkey":
      return "Auth Key";
    case "apikeys":
      return "API Keys";
    case "widgets":
      return "Widgets";
    case "keyboard-shortcuts":
      return "Keyboard Shortcuts";
    case "model-garden":
      return "Model Garden";
    case "tools":
      return "Tools";
    default:
      return key;
  }
};

export const NAV_SECTIONS = [
  { title: "AGENT TYPES", items: ["api", "chatbot"] },
  { title: "CONFIGURATION", items: ["chatbotConfig", "knowledge_base", "widgets", "model-garden", "tools"] },
  { title: "SECURITY & ACCESS", items: ["pauthkey", "apikeys"] },
  { title: "MONITORING & SUPPORT", items: ["alerts", "metrics"] },
  { title: "Developer", items: ["integration", "RAG_embed"] },
];

export const NAV_ITEM_CONFIG = {
  api: { path: "agents", query: { type: "api" } },
  chatbot: { path: "agents", query: { type: "chatbot" } },
};

/**
 * Builds a navigation URL for a given nav key and orgId.
 * Uses NAV_ITEM_CONFIG if a config entry exists, otherwise falls back to `/org/{orgId}/{key}`.
 */
export const buildNavUrl = (key, orgId) => {
  const config = NAV_ITEM_CONFIG[key];
  if (config) {
    const query = config.query ? `?${new URLSearchParams(config.query).toString()}` : "";
    return `/org/${orgId}/${config.path}${query}`;
  }
  return `/org/${orgId}/${key}`;
};

/**
 * Navigates to `url` via `router.push`, but intercepts when there are unsaved
 * prompt changes — storing the pending URL and opening the unsaved-changes modal.
 */
export const createGuardedNavigate = (router, pendingNavRef, openModalFn, MODAL_TYPE, unsavedPromptGuard) => (url) => {
  if (unsavedPromptGuard.hasUnsavedChanges) {
    pendingNavRef.current = url;
    openModalFn(MODAL_TYPE.UNSAVED_CHANGES_MODAL);
    return;
  }
  router.push(url);
};

export const HRCollapsed = React.memo(() => <hr className="my-2 w-6 border-base-content/30 mx-auto" />);

export const BetaBadge = React.memo(() => (
  <span className="badge badge-success rounded-md mb-1 text-base-100 text-xs">Beta</span>
));

// Add CSS animation for the gradient border
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes gradientMove {
      0% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0% 50%;
      }
    }
  `;
  if (!document.head.querySelector("style[data-gradient-animation]")) {
    style.setAttribute("data-gradient-animation", "true");
    document.head.appendChild(style);
  }
}
